# 第46章 フルスタックフレームワークの考え方

第41〜45章の画面は、ブラウザが空の HTML を受け取り、JavaScript を動かしてから画面を作っていました（**CSR**、クライアントサイドレンダリング）。この章では、同じ React の部品を**サーバで先に HTML にして**送る **SSR**（サーバサイドレンダリング）を、Express と `react-dom/server` で小さく作ります。そのうえで、ハイドレーション・食い違い・本当の 404・ストリーミングを確かめ、Next.js のような**フルスタックフレームワーク**が、これを全部引き受けてくれる道具だということを見ます。第9部で Next.js を使う前の、仕組みの章です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第45章、第5部（Express） |
| この章のゴール | CSR・SSR・SSG の違いを説明できる / `renderToString` で部品を HTML にし、`hydrateRoot` でつなげられる / サーバのデータを安全に画面へ渡せる / ハイドレーションの食い違いの原因と直し方を説明できる / 見つからないページで本当の 404 を返せる / Suspense でストリーミングできる / Server Components と Next.js が何をしてくれるかを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch46-fullstack/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch46-fullstack
>   ```
>
> - もう1つのターミナルで、練習用の API（`cd ~/dev/part08` → `npm run api`）を動かしておきます。
> - この章で作る SSR のサーバは、仕組みを見るためのものです。実際のアプリでは、第9部の Next.js のようなフレームワークを使います。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| SSR とハイドレーション（2・3節） | 第9部（Next.js のページは、決まりで SSR される） |
| 食い違いを避ける（4節） | 第9部（同じエラーが出たときに、原因が分かる） |
| 本当の 404・`<title>`（5節） | 第9部（`notFound()`・`metadata`）、第12部（検索エンジンに載せる） |
| ストリーミング（6節） | 第9部（`loading.tsx`） |
| Server Components（7節） | 第9部（Next.js の部品は、決まりで Server Component） |

---

## 1. 画面をどこで作るか

| 作り方 | HTML を作る場所・とき | 例 |
| --- | --- | --- |
| サーバのテンプレート | サーバ。リクエストのたび | Flask の Jinja2、第5部の EJS |
| **CSR** | ブラウザ。JavaScript が動いてから | 第41〜45章の Vite + React |
| **SSR** | サーバ。リクエストのたび。その後、ブラウザで React がつながる | この章、Next.js |
| **SSG**（静的生成） | ビルドのとき1回だけ | 説明書のサイト、ブログ（Next.js でもできる） |

CSR の弱いところは、JavaScript が全部届いて動くまで、画面が空だということです。

- 最初に中身が見えるまで時間がかかる（特に、遅い回線・遅いスマートフォン）。
- JavaScript を動かさない読み手（curl、リンクのプレビューを作る SNS、一部の検索エンジン）には、中身が無いページに見える。
- どの URL にも `index.html` を 200 で返すので、「見つからない」ページも 200 になる（5節）。

SSR は、Flask と同じようにサーバで HTML を作って送り、届いた後で、React がその HTML にイベントと state をつなぎます。

---

## 2. SSR を自分で作る

### 2.1 手を動かす: 準備

```sh
$ mkdir -p app/src
$ cd app
```

`app/vite.config.ts` と `app/tsconfig.json` を作ります。`tsconfig.json` には、サーバのファイル（`server.ts`）も入れます。

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

```json
{
  "extends": "../../../tsconfig.base.json",
  "include": ["src", "server.ts", "vite.config.ts"]
}
```

### 2.2 手を動かす: ページのデータ

サーバが API から読んで、部品に渡すデータの形を決めます。`app/src/data.ts` を作ります。

```ts
export type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null };

export type Route = { name: 'list' } | { name: 'task'; id: number } | { name: 'not-found' };

export type PageData = {
  route: Route;
  tasks: Task[]; // list のとき
  task: Task | null; // task のとき（無ければ null）
  renderedAt: string; // サーバで作った日時（ISO 8601）
};

// URL のパスから、どのページかを決める（サーバでも、ブラウザでも同じ関数を使う）
export function matchRoute(pathname: string): Route {
  if (pathname === '/') return { name: 'list' };
  const m = /^\/tasks\/([1-9][0-9]{0,8})$/.exec(pathname);
  if (m) return { name: 'task', id: Number(m[1]) };
  return { name: 'not-found' };
}
```

`matchRoute` は、サーバでも、ブラウザでも使います。サーバとブラウザで同じページを描くには、同じ関数で決める必要があるからです。

### 2.3 手を動かす: 部品と、サーバの入り口

`app/src/App.tsx` を作ります。props の `data` だけから描く部品です。

```tsx
import { useEffect, useState } from 'react';
import type { PageData, Task } from './data.ts';

// ハイドレーションが終わったかを出す（サーバの HTML では、いつも「まだ」）
function HydrationBadge() {
  const [hydrated, setHydrated] = useState(false);
  // Effect はブラウザでしか動かない。動いたら、ハイドレーションが終わっている
  // eslint-disable-next-line react-hooks/set-state-in-effect -- ここでは「Effect が動いた」こと自体を見せたい
  useEffect(() => setHydrated(true), []);
  return <p className="badge">JavaScript: {hydrated ? '動いています（ハイドレーション済み）' : 'まだ動いていません'}</p>;
}

function TaskList({ tasks }: { tasks: Task[] }) {
  const [q, setQ] = useState('');
  const shown = tasks.filter((t) => t.title.includes(q));
  return (
    <section>
      <h1>タスク（{tasks.length} 件）</h1>
      {/* 絞り込みは、ハイドレーションが終わってから動く */}
      <input aria-label="絞り込み" value={q} onChange={(e) => setQ(e.target.value)} placeholder="題名で絞り込み" />
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <a href={`/tasks/${t.id}`}>{t.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TaskDetail({ task }: { task: Task }) {
  return (
    <article>
      <h1>{task.title}</h1>
      <p>状態: {task.status}</p>
      <p>締め切り: {task.dueDate ?? 'なし'}</p>
    </article>
  );
}

function NotFound() {
  return <h1>ページが見つかりません</h1>;
}

export function App({ data }: { data: PageData }) {
  const { route } = data;
  return (
    <>
      <header>
        <a href="/">一覧</a> | <a href="/stream">集計（ストリーミング）</a>
        <HydrationBadge />
      </header>
      <main>
        {route.name === 'list' && <TaskList tasks={data.tasks} />}
        {route.name === 'task' && (data.task ? <TaskDetail task={data.task} /> : <NotFound />)}
        {route.name === 'not-found' && <NotFound />}
        <p>
          <small>サーバで作った日時: {data.renderedAt}</small>
        </p>
      </main>
    </>
  );
}

// ページの題名（<title>）
export function titleOf(data: PageData): string {
  if (data.route.name === 'list') return 'タスク';
  if (data.route.name === 'task' && data.task) return `${data.task.title} - タスク`;
  return 'ページが見つかりません';
}
```

- 詳しいページへのリンクは、`<a href>` です（React Router は使わない）。押すたびにサーバへ行き、サーバが次のページの HTML を作ります。Flask の画面と同じ動き方です。
- `HydrationBadge` は、3節のハイドレーションが終わったかを見せるための部品です。

`app/src/entry-server.tsx` を作ります（後半の `renderStats` は6節で説明します）。

```tsx
import { Suspense, use, type ReactNode } from 'react';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { App, titleOf } from './App.tsx';
import type { PageData } from './data.ts';

// 2節: 1回で HTML の文字を全部作る
export function render(data: PageData): { html: string; title: string; status: number } {
  const html = renderToString(<App data={data} />);
  // 見つからないページは、HTML の中身だけでなく、ステータスも 404 にする（5節）
  const notFound = data.route.name === 'not-found' || (data.route.name === 'task' && data.task === null);
  return { html, title: titleOf(data), status: notFound ? 404 : 200 };
}

// 6節: 遅いデータを待つ部分だけ後から送る（ストリーミング）
type Stats = { total: number; done: number };

function StatsView({ stats }: { stats: Promise<Stats> }) {
  const s = use(stats); // Promise が終わるまで、いちばん近い <Suspense> の fallback を出す
  return (
    <p>
      全部で {s.total} 件、完了は {s.done} 件です。
    </p>
  );
}

function StatsPage({ stats }: { stats: Promise<Stats> }): ReactNode {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>集計</title>
      </head>
      <body>
        <h1>集計（ストリーミング）</h1>
        <p>この行は、すぐに届きます。</p>
        <Suspense fallback={<p>集計中…</p>}>
          <StatsView stats={stats} />
        </Suspense>
        <p>
          <a href="/">一覧へ</a>
        </p>
      </body>
    </html>
  );
}

export function renderStats(stats: Promise<Stats>, out: NodeJS.WritableStream, onError: (e: unknown) => void) {
  const stream = renderToPipeableStream(<StatsPage stats={stats} />, {
    // 「すぐ出せる部分」（fallback を含む）ができたら、送り始める
    onShellReady: () => stream.pipe(out),
    onError,
  });
}
```

`renderToString(<App data={data} />)` は、部品を呼んで、HTML の**文字**にします。ブラウザも DOM も要りません。Effect（`useEffect`）は、サーバでは動きません。

### 2.4 手を動かす: SSR のサーバ

`app/index.html` を作ります。`<!--app-html-->` などの印の場所に、サーバが中身を入れます。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><!--app-title--></title>
  </head>
  <body>
    <div id="root"><!--app-html--></div>
    <!--app-data-->
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
```

`app/server.ts` を作ります。第5部と同じ Express で、どの URL でも、データを読んで、HTML を作って返します。

```ts
import { readFileSync } from 'node:fs';
import express from 'express';
import type { PageData, Task } from './src/data.ts';
import { matchRoute } from './src/data.ts';

const API = 'http://127.0.0.1:9500/api';
const template = readFileSync(new URL('./dist/client/index.html', import.meta.url), 'utf8');
// サーバ用にビルドした entry-server（型は、元の .tsx から借りる）
const server = (await import(new URL('./dist/server/entry-server.js', import.meta.url).href)) as typeof import('./src/entry-server.tsx');

// <script> の中に JSON を入れるとき、< を < にする（題名の中の </script> で、script が途中で終わらないように）
function serialize(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function loadData(pathname: string): Promise<PageData> {
  const route = matchRoute(pathname);
  const data: PageData = { route, tasks: [], task: null, renderedAt: new Date().toISOString() };
  if (route.name === 'list') {
    const res = await fetch(`${API}/tasks?sort=dueDate&limit=100`);
    if (!res.ok) throw new Error(`API: HTTP ${res.status}`);
    data.tasks = ((await res.json()) as { items: Task[] }).items;
  } else if (route.name === 'task') {
    const res = await fetch(`${API}/tasks/${route.id}`);
    if (res.ok) data.task = (await res.json()) as Task;
    else if (res.status !== 404) throw new Error(`API: HTTP ${res.status}`);
  }
  return data;
}

const app = express();
// ビルドしたファイル（JavaScript・CSS）。index.html は、下で自分で作るので配らない
app.use(express.static(new URL('./dist/client', import.meta.url).pathname, { index: false }));

// 6節: ストリーミング。集計を 2 秒かけて作る（遅い計算のかわり）
app.get('/stream', (_req, res) => {
  const stats = fetch(`${API}/tasks?limit=100`)
    .then((r) => r.json() as Promise<{ items: Task[] }>)
    .then(async ({ items }) => {
      await new Promise((r) => setTimeout(r, 2000));
      return { total: items.length, done: items.filter((t) => t.status === 'done').length };
    });
  res.type('html');
  server.renderStats(stats, res, (e) => console.error(e));
});

app.get('/{*path}', async (req, res) => {
  let data: PageData;
  try {
    data = await loadData(req.path);
  } catch (e) {
    console.error(e);
    res.status(502).type('text').send('API からデータを読めませんでした');
    return;
  }
  try {
    const { html, title, status } = server.render(data);
    const page = template
      .replace('<!--app-title-->', escapeHtml(title))
      .replace('<!--app-html-->', html)
      .replace('<!--app-data-->', `<script id="page-data" type="application/json">${serialize(data)}</script>`);
    res.status(status).type('html').send(page);
  } catch (e) {
    // 部品を描いている途中の例外（サーバには window も document も無い。4.2節）
    console.error(e);
    res.status(500).type('text').send('ページを作れませんでした');
  }
});

app.listen(5173, 'localhost', () => console.log('SSR のサーバ: http://localhost:5173/ （止めるのは Ctrl+C）'));
```

| 手順 | すること |
| --- | --- |
| 1 | `loadData`: URL からページを決め、練習用の API からデータを読む |
| 2 | `server.render(data)`: 部品を HTML の文字にし、`<title>` とステータスも決める |
| 3 | ひな形の `<!--app-html-->` に HTML、`<!--app-title-->` に題名（エスケープする）、`<!--app-data-->` にデータの `<script>` を入れる |
| 4 | ステータスを付けて返す |

### 2.5 手を動かす: ビルドして動かす

Vite で、**2回**ビルドします。1回目はブラウザ用（`index.html` から）、2回目はサーバ用（`entry-server.tsx` から）です。

```sh
$ npx vite build --outDir dist/client
$ npx vite build --ssr src/entry-server.tsx --outDir dist/server
$ node server.ts
SSR のサーバ: http://localhost:5173/ （止めるのは Ctrl+C）
```

- `--outDir` は、作ったファイルを置くフォルダです。`--ssr` は「サーバで動かす用に、`react` などのパッケージを中に入れずにビルドする」指定です。
- `server.ts` は、Node.js がそのまま TypeScript として動かします（第7部）。`.tsx`（JSX）はそのまま動かせないので、部品はビルドした `dist/server/entry-server.js` を読み込んでいます。

```sh
$ curl http://localhost:5173/
```

`<div id="root">` の中に、タスクの題名が入った HTML が返ることを確かめます（練習問題4の問1）。ブラウザで http://localhost:5173/ を開き、タスクの題名を押して、詳しいページへ移れることも確かめます。

---

## 3. ハイドレーション

### 3.1 手を動かす: ブラウザの入り口

サーバの HTML は、見た目はできていますが、ただの HTML です。絞り込みの欄に打っても、何も起きません。ブラウザで React を動かし、その HTML に、イベントと state を**つなぐ**ことを、**ハイドレーション**（hydration、水を含ませて生き返らせる）と呼びます。`app/src/entry-client.tsx` を作ります。

```tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import type { PageData } from './data.ts';

// サーバが <script id="page-data" type="application/json"> に入れたデータを読む
const data = JSON.parse(document.getElementById('page-data')!.textContent) as PageData;

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App data={data} />
  </StrictMode>,
  {
    // サーバの HTML とブラウザの描画が食い違ったとき（4節）
    onRecoverableError: (error) => console.error('ハイドレーションの食い違い:', error),
  },
);
```

- `createRoot(…).render(…)`（第41章）は、中を空にして作り直します。`hydrateRoot(要素, 部品)` は、今ある HTML を**そのまま使い**、同じ部品を描いた結果と突き合わせながら、イベントをつなぎます。
- ブラウザの部品も、サーバと**同じデータ**で描く必要があります。そのため、サーバは、使ったデータを `<script id="page-data" type="application/json">` に入れて、HTML と一緒に送っています。ブラウザは、それを読んで `App` に渡します（API をもう一度呼ばない）。

ビルドし直して開くと、上の行が「まだ動いていません」から「動いています（ハイドレーション済み）」に変わり、絞り込みが動くようになります。

### 3.2 データを `<script>` に入れるときのエスケープ

`server.ts` の `serialize` は、`JSON.stringify` の結果の `<` を `<` に変えています。ブラウザは、`<script>` の中身を読む前に、`</script>` という並びを探して、script の終わりを決めます。タスクの題名に `</script>` という文字が入っていると、そこで script が終わり、後ろの題名の続きが HTML として読まれてしまいます（XSS。第4部 第21章）。`<` は、JSON の文字列の中では `<` と同じ意味なので、`JSON.parse` すると元に戻ります（練習問題1）。

`renderToString` が作る HTML の中の題名は、React がエスケープします（第41章 2節）。自分で文字をつなげて作る部分（`<title>` と `<script>`）だけ、自分でエスケープします。

---

## 4. 食い違いを避ける

### 4.1 ハイドレーションの食い違い

ハイドレーションでは、ブラウザで描いた結果が、サーバの HTML と**同じ**でなければなりません。違うと、React は Console にエラー（ビルドしたファイルでは `Minified React error #418` のような番号）を出し、その部分をブラウザで描き直します（練習問題4の問4）。

| 食い違う原因 | 直し方 |
| --- | --- |
| 描画の中で `new Date()`・`Math.random()` を使う | サーバで決めてデータで渡す（`App.tsx` の `renderedAt`） |
| ブラウザにしか無いもの（`window.innerWidth`・`localStorage`）を描画で使う | ハイドレーションの後で使う（`useEffect`・練習問題6の `useHydrated`） |
| タイムゾーン・言語で変わる書き方（`toLocaleString()`） | サーバでもブラウザでも同じになる書き方にする（4.3節） |
| ブラウザの拡張機能が HTML を書き換えた | 自分では直せない。直せない属性には `suppressHydrationWarning` |

### 4.2 サーバに無いもの

サーバ（Node.js）には、`window`・`document`・`localStorage` がありません。描画の中で使うと、サーバで `ReferenceError` になります（練習問題4の問6）。Effect とイベントの関数は、ブラウザでしか動かないので、そこで使います（第42章 1.2節の「描画は純粋に」が、ここでも効いてきます）。

### 4.3 日付とタイムゾーン

API は、締め切りを `'2026-11-20'` のような**日付だけの文字**、作った日時を `'2026-11-11T16:10:38.925Z'` のような **UTC の日時**で返します（第6部 第32章）。

- 日付だけの文字は、`new Date('2026-11-20')` にすると、UTC の 0 時として読まれます。日本のブラウザで `toLocaleDateString()` すると、時刻によっては1日ずれます。日付は、文字のまま比べたり、`Date.UTC` で日数を数えたりします（練習問題7）。
- 「今日」は、タイムゾーンで変わります。UTC の 11/11 16:00 は、日本では 11/12 です。サーバで `Intl.DateTimeFormat` に `timeZone: 'Asia/Tokyo'` を渡して決めれば、サーバがどこで動いていても同じになり、画面にデータで渡せば食い違いません。
- 日時を利用者の時刻で出すときは、ハイドレーションの後で書き換えるか（練習問題6）、サーバとブラウザで同じタイムゾーンを決めて書きます。

---

## 5. 本当の 404 と、`<title>`

CSR の画面は、どの URL にも `index.html` を 200 で返し、JavaScript が「ページが見つかりません」と出します。これを **ソフト 404** と呼びます。検索エンジンは、ステータスが 200 なので、無いページを「ある」と思って登録してしまいます。

SSR では、サーバがページを作るときに、そのページがあるかを知っています。`entry-server.tsx` の `render` は、無いページと無いタスクのとき、ステータスを 404 にしています。

```sh
$ curl -i http://localhost:5173/tasks/99
HTTP/1.1 404 Not Found
```

同じように、`<title>`（タブ・検索結果・ブックマークに出る題名）や、`<meta name="description">` も、ページごとにサーバで決めて入れられます（練習問題2）。

---

## 6. ストリーミング

`/stream` のページは、集計に2秒かかるとします。全部できるまで待ってから送ると、利用者は2秒間、真っ白な画面を見ることになります。**ストリーミング**は、すぐ作れる部分を先に送り、遅い部分は、できたときに後から送る仕組みです（第3部 第15章の Stream の上で動きます）。

`entry-server.tsx` の後半を見ます。

- `use(stats)`（React 19）は、Promise の値を受け取るフックです。まだ終わっていなければ、いちばん近い `<Suspense>` の `fallback`（「集計中…」）を代わりに出します。
- `renderToPipeableStream` は、HTML を少しずつ Stream に流します。`onShellReady`（Suspense の外と `fallback` ができた）で `pipe` すると、そこから送り始めます。

```sh
$ curl -N http://localhost:5173/stream
```

`-N` は、届いた分をすぐ出す指定です。見出しと「集計中…」がすぐ出て、2秒後に残りが出ることを確かめます（練習問題4の問5）。後から届いた部分は、小さな `<script>` が「集計中…」と入れ替えます。

---

## 7. フレームワークが引き受けてくれること

この章の SSR は、ページが2つしかないのに、ビルドが2回、入り口が2つ、データの受け渡し、エスケープ、ステータス、ストリーミングと、考えることがたくさんありました。本物のアプリで、これを全部自分で作るのは大変です。**フルスタックフレームワーク**（Next.js・React Router のフレームワークモード・Remix など）は、これを引き受けます。

| この章で自分で書いたこと | フレームワークでは |
| --- | --- |
| `matchRoute` でページを決める | フォルダとファイルの名前が、そのまま URL になる |
| `loadData` で API を読み、データを `<script>` で渡す | ページの部品の中で、サーバのデータを直接読める（受け渡しは自動） |
| 2回のビルド・2つの入り口 | `next build` の1回。入り口も自動 |
| ステータス・`<title>` | `notFound()`・`metadata` |
| `<Suspense>` とストリーミング | `loading.tsx` を置くだけ |
| 書き込みは別の API（第5部）を `fetch` で呼ぶ | フォームから、サーバの関数を直接呼べる（Server Actions） |

### 7.1 Server Components

この章の SSR では、`App` の部品は、サーバで1回、ブラウザでもう1回動きます。ブラウザでも動かすので、部品の JavaScript を全部ブラウザに送る必要があります（Network タブで見ると、`index-….js` は 200KB 以上あります）。

**React Server Components**（RSC）は、「**サーバでだけ動く部品**」です。

| | Server Component | Client Component |
| --- | --- | --- |
| 動く場所 | サーバだけ | サーバ（SSR）とブラウザ |
| ブラウザに送るもの | 描いた結果だけ（部品の JavaScript は送らない） | 部品の JavaScript |
| できること | データベースやファイルを直接読む、秘密の鍵を使う | `useState`・`useEffect`・イベント |
| 書き方（Next.js） | 何も書かない（決まりはこちら） | ファイルの先頭に `'use client'` |

タスクの一覧のような「データを読んで出すだけ」の部分は Server Component に、絞り込みの欄のような「操作で変わる」部分だけを Client Component にすると、ブラウザに送る JavaScript が減り、データベースまでの距離も縮まります。

## 8. 第9部へ: Next.js では

第9部では、このタスク管理アプリを Next.js で作り直します。この章の app は、Next.js では、だいたい次のファイルになります。

| この章 | Next.js（App Router） |
| --- | --- |
| `matchRoute` の `/` | `app/page.tsx` |
| `matchRoute` の `/tasks/:id` | `app/tasks/[id]/page.tsx`（`[id]` がパラメータ） |
| `NotFound` と 404 | `app/not-found.tsx` と、ページの中の `notFound()` |
| `<title>` | ページのファイルの `export const metadata` |
| `/stream` の `<Suspense>` | `app/stream/loading.tsx` |
| `HydrationBadge`・絞り込み | `'use client'` を書いたファイルの部品 |
| `server.ts`・2回のビルド | `next dev`・`next build`（フレームワークが持つ） |

この章で見た「サーバで HTML を作る → ブラウザでつなぐ」「描画はサーバとブラウザで同じに」「本当の 404」は、Next.js でもそのまま当てはまります。

## 9. Flask と比べる

| | Flask（Jinja2） | React の SSR |
| --- | --- | --- |
| HTML を作る場所 | サーバ | サーバ（`renderToString`） |
| 届いた後 | そのまま。動きは別に書いた JavaScript | `hydrateRoot` で、同じ部品がブラウザでも動く |
| ページを移る | リンクでサーバへ | リンクでサーバへ（この章）。フレームワークは、移るときはブラウザで部品を差し替える |
| 見つからない | `abort(404)` | ステータスを 404 にして、`NotFound` の部品を描く |
| データの受け渡し | テンプレートに変数を渡す | 部品に props で渡し、同じデータを `<script>` でブラウザにも渡す |

SSR は、「Jinja2 のようにサーバで HTML を作り、その後で、同じ部品がブラウザで動き出す」仕組みだと言えます。

## まとめ

- CSR はブラウザで、SSR はリクエストのたびにサーバで、SSG はビルドのときに HTML を作る。SSR は、最初の表示が速く、JavaScript を動かさない読み手にも中身が見え、本当の 404 を返せる。
- `renderToString` で部品を HTML にし、ブラウザでは `hydrateRoot` で同じ部品をつなぐ（ハイドレーション）。
- サーバのデータは、`<` をエスケープした JSON で `<script>` に入れて渡す。
- 描画の結果は、サーバとブラウザで同じにする。時刻・乱数・`window`・タイムゾーンで変わる書き方は、データで渡すか、ハイドレーションの後で使う。
- 見つからないページは、ステータスも 404 にする。`<title>` もページごとに決める。
- `<Suspense>` と `renderToPipeableStream` で、遅い部分だけ後から送れる。
- フルスタックフレームワークは、ルーティング・データの受け渡し・ビルド・ストリーミングを引き受ける。Server Components は、サーバでだけ動き、JavaScript を送らない部品。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- React 公式「サーバ用 React DOM API」: https://ja.react.dev/reference/react-dom/server
- React 公式「hydrateRoot」: https://ja.react.dev/reference/react-dom/client/hydrateRoot
- React 公式「use」: https://ja.react.dev/reference/react/use
- React 公式「サーバコンポーネント」: https://ja.react.dev/reference/rsc/server-components
- Vite「サーバサイドレンダリング」: https://ja.vite.dev/guide/ssr
- Next.js「Getting Started」（英語）: https://nextjs.org/docs/app/getting-started

---

前: [第45章 スタイリングとアクセシビリティ](../ch45-styling-a11y/README.md) ／ 次: [第8部の成果物 タスク管理アプリの画面](../project-task-web/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
