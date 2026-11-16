# 第50章 レンダリングとキャッシュの戦略

ここまで、ページは開くたびにサーバで作り、API を読んでいました。でも、ヘルプのページのように中身がほとんど変わらないページや、「タスクの数」のように少し古くても困らないものまで、毎回作り直す必要はありません。この章では、Next.js が**ページのどこを、いつ作るか**（ビルドのとき・覚えておいた結果を使う・リクエストが来てから）を決める仕組みを学びます。`next build` の結果の読み方、`'use cache'` で結果を覚えておく方法、書き換えたときに覚えたものを捨てる方法を、本番と同じサーバ（`next start`）で確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第47〜49章、第2部 第7章（HTTP のキャッシュ）、第6部 第34章（Redis のキャッシュ）、第43章（TanStack Query の `staleTime`） |
| この章のゴール | `next build` の表の ○・◐・ƒ を読み、ページのどこがいつ作られるかを説明できる / `connection()` で「リクエストが来てから作る」部分を決められる / `'use cache'` と `cacheLife` で結果を覚えておける / `cacheTag` と `updateTag`・`revalidateTag` で、覚えたものを捨てられる / `generateStaticParams` で、URL の値ごとのページを前もって作れる / 開発サーバと本番のサーバで、キャッシュの動きが違うことを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で作るアプリの完成形（`web/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part09/ch50-rendering-cache/` で実行します。手を動かして作るアプリ（`web/`）は、このフォルダの直下に作ります。
> - この章では、開発サーバ（`next dev`）ではなく、**ビルドしてから本番のサーバ**（`next build` → `next start`）で確かめることが多くなります。ポートは 9540 です。
> - `next build` は、API を読むページを前もって作るので、**API を動かしてから**実行します（1つ目のターミナルで `npm run api`）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ページのどこを、いつ作るか（2節） | 第9部の成果物、第12部（本番に出す） |
| `'use cache'` と、捨てる仕組み（3・4節） | 第9部の成果物、第10部（ログインした人ごとのページは覚えない） |
| `generateStaticParams`（6節） | 第12部（静的なページの配信） |
| 本番のサーバで動かす（7節） | 第11部（CI でビルドする）、第12部（デプロイ） |

---

## 1. 準備

第49章の `web/` をコピーして始めます。

```sh
$ cd ~/dev/part09/ch50-rendering-cache
$ cp -R ../ch49-actions-routes/samples/web web
$ cd web
$ rm -rf .next
```

- 自分で作った `../ch49-actions-routes/web` をコピーしても構いません。

1つ目のターミナルで API を動かしたまま、ビルドします。

```sh
$ npx next build
```

最後に、次のような表が出ます。

```text
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ƒ /api/events
├ ○ /api/health
├ ƒ /api/tasks
├ ƒ /api/tasks/[id]
├ ◐ /dashboard
├ ◐ /tasks
├   /tasks/[id]
│ └ ◐ /tasks/[id]
└ ○ /tasks/new

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

| 記号 | 意味 | 例 |
| --- | --- | --- |
| ○ Static | ビルドのときに、ページ全体を前もって作った（prerender）。開かれたら、それを返すだけ | `/about`、`/tasks/new` |
| ◐ Partial Prerender | 外側（静的な殻。シェル）を前もって作り、`<Suspense>` の中は、リクエストが来てから作って流す | `/tasks`、`/dashboard` |
| ƒ Dynamic | 前もって作らない。呼ばれるたびに動く（Route Handler） | `/api/tasks` |

第47章 9節で見た表と同じものです。この章では、この表を**自分で決められる**ようになります。

---

## 2. いつ作るか: ビルドのとき・リクエストのとき

### 2.1 手を動かす: 3つの時刻

`app/clock/page.tsx` を作ります（`mkdir app/clock`）。

```tsx
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';

export const metadata: Metadata = { title: '時計' };

const time = () => new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' });

/** ビルドのときに1回だけ作り、ずっと使う */
async function BuildTime() {
  'use cache';
  cacheLife('max');
  return <p>A. ビルドのときの時刻: {time()}</p>;
}

/** 作ってから1分たつと、次に開いたときに、裏で作り直す */
async function MinuteTime() {
  'use cache';
  cacheLife('minutes');
  return <p>B. 1分ごとに新しくなる時刻: {time()}</p>;
}

/** 覚えておく長さがとても短い（5分より短い）と、前もって作る HTML には入らず、リクエストが来てから作る */
async function SecondsTime() {
  'use cache';
  cacheLife('seconds');
  return <p>D. 数秒ごとに新しくなる時刻: {time()}</p>;
}

/** 開くたびに作る。connection() で「ここから先は、リクエストが来てから」と知らせる */
async function RequestTime() {
  await connection();
  return <p>C. 開いた時刻: {time()}</p>;
}

export default function ClockPage() {
  return (
    <>
      <h1>時計</h1>
      <BuildTime />
      <MinuteTime />
      <Suspense fallback={<p>C. 開いた時刻: …</p>}>
        <RequestTime />
      </Suspense>
      <Suspense fallback={<p>D. 数秒ごとに新しくなる時刻: …</p>}>
        <SecondsTime />
      </Suspense>
    </>
  );
}
```

ビルドして、本番のサーバで動かします。

```sh
$ npx next build
$ npx next start -p 9540
```

- **`next start`** は、`next build` で作ったものを動かす、本番用のサーバです。ファイルを変えても、ビルドし直すまで変わりません。止めるのは Ctrl+C です。

`http://localhost:9540/clock` を開き、何度か読み込み直します（Command+R）。

| 時刻 | 読み込み直すと | 理由 |
| --- | --- | --- |
| A | 変わらない（ビルドした時刻） | `'use cache'` と `cacheLife('max')`。ビルドのときに作って、ずっと覚えておく |
| B | 1分たつまで変わらない | `cacheLife('minutes')`。1分より古くなったら、次に開いたときに、裏で作り直す |
| C | 毎回変わる | `connection()` の後。リクエストが来てから作る |
| D | 数秒ごとに変わる | `cacheLife('seconds')`。とても短いので、前もって作らず、リクエストが来てから作る |

- **`connection()`**（`next/server`）は、「ここから先は、リクエストが来てから作る」という印です。中で何も読みませんが、`await` すると、前もって作るのを、ここで止めます。
- C と D は、リクエストが来るまで中身が分からないので、`<Suspense>` の中に置きます。静的な殻には、`fallback`（「…」）が入っています。
- このページは ◐ になります。表の右に、`Revalidate 1m`・`Expire 1h` のように、B の覚えておく長さも出ます。

### 2.2 前もって作れない値

`app/clock/page.tsx` の `RequestTime` から `await connection();` の行を消して、`npx next build` を動かすと、次のように失敗します。

```text
Error: Route "/clock": Next.js encountered the unstable value `new Date()` while prerendering.
This value can change between renders, so it must be either prerendered or computed later.
```

`new Date()`・`Date.now()`・`Math.random()` のように、呼ぶたびに変わる値は、「前もって作る（ビルドの時刻で決める）」のか「リクエストが来てから作る」のかを、Next.js が決められません。エラーは、どちらかを選ぶように言っています。

- 前もって作る → `'use cache'`（A・B）
- リクエストが来てから作る → `await connection()` を先に呼ぶ（C）

確かめたら、`await connection();` を戻します。

第47章で見た「`<Suspense>` の外で `fetch` した」エラーも、同じ考え方です。API の答えは呼ぶたびに変わるかもしれないので、Next.js は、`<Suspense>` の中に入れる（リクエストが来てから作る）か、`'use cache'` で覚えておく（前もって作る）かを、決めるように求めます。

---

## 3. 結果を覚えておく: 'use cache'

### 3.1 手を動かす: タスクの数を覚えておく

`lib/api.ts` に、`getStats` を足します（ファイルの上の `import` にも、`cacheLife`・`cacheTag` を足します）。

```ts
import { cacheLife, cacheTag } from 'next/cache';

// 第50章 3節: 状態ごとの数。'use cache' で結果を覚えておき、1分より古くなったら、裏で読み直す
export type Stats = Record<Status, number> & { total: number };

export async function getStats(): Promise<Stats> {
  'use cache';
  cacheLife('minutes'); // 覚えておく長さ（5節の表）
  cacheTag('tasks'); // 名札。書き換えたら、この名札の付いたものを捨てる（4節）
  console.log('getStats: API から数を読みます'); // 覚えたものを使うときは、出ない
  const pages = await Promise.all(STATUSES.map((status) => listTasks({ status })));
  const [todo, doing, done] = pages.map((p) => p.items.length) as [number, number, number];
  return { todo, doing, done, total: todo + doing + done };
}
```

`app/stats/page.tsx` を作ります（`mkdir app/stats`）。

```tsx
import type { Metadata } from 'next';
import { STATUS_LABELS, STATUSES, getStats } from '../../lib/api.ts';

export const metadata: Metadata = { title: '数' };

export default async function StatsPage() {
  // 覚えておいた結果を使うので、<Suspense> が無くても、待たせない
  const stats = await getStats();
  return (
    <>
      <h1>タスクの数</h1>
      <p>全部で {stats.total} 件</p>
      <ul>
        {STATUSES.map((s) => (
          <li key={s}>
            {STATUS_LABELS[s]}: {stats[s]} 件
          </li>
        ))}
      </ul>
    </>
  );
}
```

- 関数の最初の行に **`'use cache'`** と書くと、その関数の結果を、Next.js が覚えておきます。次に呼ばれたときは、関数を動かさずに、覚えた結果を返します。
- 覚えておく長さは **`cacheLife`** で決めます（5節）。
- 引数があれば、引数ごとに別々に覚えます（`getTask(1)` と `getTask(2)` は別）。
- `'use cache'` の関数の中では、`cookies()`・`headers()`・`searchParams` のような、リクエストごとに違う値は使えません。覚えた結果を、ほかの人にも返すからです。

ビルドして、`next start` で動かします。

```sh
$ npx next build
$ npx next start -p 9540
```

- ビルドの途中で、`getStats: API から数を読みます` が出ます。`/stats` は ○ になり、数は、**ビルドのときに読んだ数**で、HTML に入っています。
- `http://localhost:9540/stats` を何度開いても、ターミナルに `getStats: …` は出ません。覚えた結果を使っているからです。
- 1つ目のターミナルの API を止めても（Ctrl+C）、`/stats` は開けます。確かめたら、API を動かし直します。

> `next build` のときに API が動いていないと、`TypeError: fetch failed`（`ECONNREFUSED`）でビルドが失敗します。前もって作るページは、ビルドのときにデータを読むからです。本番に出すときは、ビルドする場所から API やデータベースに届くかを、考えておく必要があります（第12部）。

### 3.2 古いまま

今度は、3つ目のターミナルから `curl` でタスクを足します（第49章 2.3節の BFF を使っても、API に直接送っても同じです）。

```sh
$ curl -X POST http://localhost:9500/api/tasks -H 'Content-Type: application/json' -d '{"title":"ねこにごはん"}'
```

`/stats` を開き直しても、数は増えていません。Next.js は、タスクが変わったことを知らないからです。1分より古くなると、次に開いたときに裏で読み直し（ターミナルに `getStats: …` が出る）、その次に開いたときに新しい数になります。

このように、**覚えておくと速いが、古いものを見せることがある**のが、キャッシュの性質です。第6部 第34章の Redis のキャッシュ、第8部 第43章の TanStack Query の `staleTime` と同じ話です。

---

## 4. 書き換えたら捨てる

### 4.1 手を動かす: 自分の書き換えは、すぐに見せる（updateTag）

第49章の `app/tasks/actions.ts` で、タスクを作る・変える・消すとき、`refresh()` や `redirect()` の前に **`updateTag('tasks')`** を呼びます（`import { refresh, updateTag } from 'next/cache';`）。

```ts
  // createTaskAction の redirect の前
  updateTag('tasks'); // 覚えておいた数（getStats）を捨てる。次に読むときは、新しい数になる
  redirect(`/tasks/${id}`);
```

`setStatusAction` の最後の `refresh()` の前、`deleteTaskAction` の最後の `redirect('/tasks')` の前にも、同じ1行を足します（完成形は [samples/web/app/tasks/actions.ts](samples/web/app/tasks/actions.ts)）。

- **`updateTag(名札)`** は、その名札（`cacheTag`）の付いた、覚えておいた結果を、すぐに捨てます。次に `getStats()` を呼んだときは、API を読み直します。
- Server Action の中でだけ使えます。「自分で書き換えたものは、すぐ自分に見せたい」ときのためのものです。

ビルドし直して `next start` で動かし、`/tasks/new` からタスクを作ってから `/stats` を開くと、数が増えています。

### 4.2 手を動かす: ほかから知らせてもらう（revalidateTag）

`curl` や、ほかのアプリが API を書き換えたときは、Next.js の Server Action を通りません。そこで、「変わった」と知らせてもらう入り口（Webhook）を、Route Handler で作ります。`app/api/revalidate/route.ts` を作ります（`mkdir -p app/api/revalidate`）。

```ts
import { revalidateTag } from 'next/cache';

// 知らせてよい相手だけが知っている合言葉。dev-only- は開発用の仮の値の印。本番では環境変数で渡す
const SECRET = process.env.REVALIDATE_SECRET ?? 'dev-only-revalidate-secret';

export function POST(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${SECRET}`) {
    return Response.json({ title: '合言葉が違います' }, { status: 401, headers: { 'Content-Type': 'application/problem+json' } });
  }
  // 'max': 古いものを、新しいものができるまで出し続けてよい（stale-while-revalidate）
  revalidateTag('tasks', 'max');
  return Response.json({ revalidated: true });
}
```

ビルドし直して `next start` で動かし、3.2節のように `curl` でタスクを足してから、知らせます。

```sh
$ curl -X POST http://localhost:9540/api/revalidate -H 'Authorization: Bearer dev-only-revalidate-secret'
{"revalidated":true}
```

`/stats` を開くと、1回目はまだ古い数で、裏で読み直します。もう一度開くと、新しい数になります。

- **`revalidateTag(名札, 'max')`** は、名札の付いたものを「古い」ことにします。すぐには捨てず、次に開かれたときは古いものを返しながら、裏で作り直します（stale-while-revalidate。第2部 第7章の `Cache-Control` にも、同じ名前の指定があります）。待たせないことを優先する書き方です。
- Server Action でも Route Handler でも使えます。
- 合言葉を知らない人が呼ぶと 401 にします。だれでも呼べると、何度も捨てさせて、API に負荷をかけることができてしまいます。

| | `updateTag` | `revalidateTag(…, 'max')` |
| --- | --- | --- |
| 使える場所 | Server Action だけ | Server Action と Route Handler |
| 捨て方 | すぐ捨てる。次は待って新しいものを読む | 古いことにする。次は古いものを返し、裏で作り直す |
| 向いている場面 | 自分の書き換えを、すぐ自分に見せる | ほかから知らされた変化を、少し遅れて反映する |

このほかに、URL を指定して、そのページで使ったものをまとめて捨てる `revalidatePath('/stats')` もあります。名札（`cacheTag`）のほうが、捨てる範囲をはっきり決められます。

---

## 5. 覚えておく長さ: cacheLife

`cacheLife` には、名前の付いた長さを渡します。

| 名前 | stale（ブラウザが、聞かずに使う長さ） | revalidate（これより古いと、裏で作り直す） | expire（これより古いと、捨てて待つ） |
| --- | --- | --- | --- |
| `seconds` | 30 秒 | 1 秒 | 1 分 |
| `minutes` | 5 分 | 1 分 | 1 時間 |
| `hours` | 5 分 | 1 時間 | 1 日 |
| `days` | 5 分 | 1 日 | 1 週間 |
| `weeks` | 5 分 | 1 週間 | 30 日 |
| `max` | 5 分 | 30 日 | 1 年 |
| 書かない（`default`） | 5 分 | 15 分 | 無し |

- `cacheLife({ revalidate: 10, expire: 3600 })` のように、秒で決めることもできます。
- **revalidate が 0 か、expire が 5 分より短い**と、とても短いキャッシュとして扱われ、前もって作る HTML には入りません（2.1節の D）。リクエストが来てから作るので、`<Suspense>` の中に置きます。置かないと、ビルドで「`<Suspense>` の外で…」のエラーになります。
- `'use cache'` には、いつも `cacheLife` を書くようにします。書かないと `default` になり、どれだけ覚えておくのかが、読む人に分かりません。

---

## 6. URL の値ごとのページを前もって作る: generateStaticParams

`/help/start` のように、URL の値が決まった数しかなく、中身がファイルに書いてあるページは、全部をビルドのときに作れます。`lib/help.ts` と `app/help/[topic]/page.tsx` を作ります（`mkdir -p 'app/help/[topic]'`）。

```ts
export type HelpTopic = { slug: string; title: string; body: string };

export const HELP_TOPICS: readonly HelpTopic[] = [
  { slug: 'start', title: 'はじめに', body: '「新しいタスク」から、題名と締め切りを入れて作ります。' },
  { slug: 'status', title: '状態', body: 'タスクは、未着手・作業中・完了のどれかです。タスクのページのボタンで変えます。' },
  { slug: 'conflict', title: 'ほかの人が先に変えたとき', body: '古い画面から変えようとすると断られます。最新の内容を見てから、もう一度変えます。' },
];

export const findTopic = (slug: string) => HELP_TOPICS.find((t) => t.slug === slug);
```

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HELP_TOPICS, findTopic } from '../../../lib/help.ts';

/** ビルドのときに作る [topic] の値の一覧 */
export function generateStaticParams() {
  return HELP_TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: PageProps<'/help/[topic]'>): Promise<Metadata> {
  const topic = findTopic((await params).topic);
  return { title: topic ? `ヘルプ: ${topic.title}` : 'ヘルプ' };
}

export default async function HelpPage({ params }: PageProps<'/help/[topic]'>) {
  const topic = findTopic((await params).topic);
  if (topic === undefined) notFound();
  return (
    <>
      <h1>{topic.title}</h1>
      <p>{topic.body}</p>
    </>
  );
}
```

- **`generateStaticParams`** は、ビルドのときに作る `params` の一覧を返す関数です。Next.js は、この一覧の URL のページを、ビルドのときに作ります。
- `npx next build` の表に、次のように、作ったページが並びます。

```text
├   /help/[topic]
│ ├ ◐ /help/[topic]
│ ├ ○ /help/start
│ ├ ○ /help/status
│ └ ○ /help/conflict
```

- 一覧に無い値（`/help/xyz`）は、リクエストが来てから作ります。ここでは `notFound()` になります。
- 第47章の `/tasks/[id]` には使いません。タスクは増えたり消えたりして、ビルドのときに全部は分からないからです。

---

## 7. 開発サーバと本番のサーバ

| | `next dev` | `next build` → `next start` |
| --- | --- | --- |
| 前もって作る | しない（開くたびに作る） | ビルドのときに作る |
| `'use cache'` | 最初に開いたときに作って覚える（ファイルを変えると、作り直すことがある） | ビルドのときに作ったものから始める |
| コードの速さ | 遅い（開くたびに変換する。確かめやすさ優先） | 速い |
| 使う場面 | 書いている間 | 本番、キャッシュの確かめ、第11部の CI |

キャッシュの動きを確かめるときは、いつも `next build` → `next start` で確かめます。開発サーバで「変わらない」「変わる」を見ても、本番と同じとは限りません。

`next start` で動かすサーバ（自分のサーバで動かす、セルフホスト）では、覚えた結果は、そのサーバの**メモリ**にあります。サーバを2台にすると、それぞれが別々に覚えるので、`updateTag` は、呼ばれたほうのサーバの分しか捨てません。台数を増やすときは、覚えた結果を共有する場所（Redis など）を用意します。Vercel のようなサービスは、これを用意してくれています。詳しくは第12部で扱います。

---

## 8. Flask・Express・第8部と比べる

| | 何を覚えるか | どこに | 古くなったら |
| --- | --- | --- | --- |
| Flask（Flask-Caching） | 関数の結果、ページ全体 | メモリ・Redis | 時間で捨てる、`cache.delete` |
| Express（第2部 第7章・第6部 第34章） | 応答（`Cache-Control`・`ETag` でブラウザ・CDN に覚えてもらう）、データ（Redis） | ブラウザ・CDN・Redis | 時間、ETag で聞き直す、自分で消す |
| 第8部（TanStack Query） | API の応答 | ブラウザのメモリ | `staleTime`・`invalidateQueries` |
| Next.js | 関数・部品の結果（`'use cache'`）、ページの静的な殻 | サーバ（とブラウザ） | `cacheLife`・`updateTag`・`revalidateTag` |

どれも、「何を・どれだけの間・だれに同じものを返してよいか」を決める点は同じです。Next.js では、それを**部品と関数ごとに**、コードの中で決めます。

迷ったときの順番は、次のとおりです。

1. 何もしない（`<Suspense>` の中で、リクエストが来てから読む）。いつも新しい。
2. 少し古くてもよく、みんなに同じものを見せてよいなら、`'use cache'` と `cacheLife`。
3. 書き換えたことが分かるなら、`cacheTag` を付けて、`updateTag`・`revalidateTag` で捨てる。
4. ログインした人ごとに違うもの（第10部）は、覚えない（または、人ごとの値を引数にする）。

---

## まとめ

- `next build` の表の ○ は全部を前もって作ったページ、◐ は静的な殻だけ前もって作り、`<Suspense>` の中を後から流すページ、ƒ は呼ばれるたびに動く入り口。
- `await connection()` の後は、リクエストが来てから作る。`new Date()` などの毎回変わる値は、`connection()` の後か、`'use cache'` の中で使う。
- `'use cache'` の関数・部品は、結果を覚えておく。長さは `cacheLife`、名札は `cacheTag`。
- 自分の書き換えは `updateTag`（Server Action の中）、ほかからの知らせは `revalidateTag(名札, 'max')`（Route Handler の中など）で捨てる。
- `generateStaticParams` で、URL の値ごとのページをビルドのときに作れる。
- キャッシュは、`next build` → `next start` で確かめる。ビルドのときにデータを読むページは、ビルドする場所からデータに届く必要がある。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Next.js Docs「Caching」: https://nextjs.org/docs/app/getting-started/caching
- Next.js Docs「Revalidating」: https://nextjs.org/docs/app/getting-started/revalidating
- Next.js Docs「use cache」: https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js Docs「cacheLife」: https://nextjs.org/docs/app/api-reference/functions/cacheLife
- Next.js Docs「generateStaticParams」: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js Docs「connection」: https://nextjs.org/docs/app/api-reference/functions/connection
- Next.js Docs「Self-Hosting」: https://nextjs.org/docs/app/guides/self-hosting

---

前の章: [第49章 Server Actions と Route Handlers](../ch49-actions-routes/README.md) ／ 第9部の目次: [../README.md](../README.md) ／ 次: [第9部の成果物](../project-task-next/README.md)
