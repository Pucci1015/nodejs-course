# 第47章 Next.js 入門

第8部では、Vite と React で画面を作り、第46章では、サーバで HTML を作る SSR を自分で組み立てました。ルーティング・データの受け渡し・ハイドレーション・ビルドと、やることがたくさんありました。この章では、それをまとめて引き受けてくれる**フルスタックフレームワーク**の **Next.js** を使います。フォルダとファイルを置くだけでページができ、ページの部品の中で `await` して API を読めることを、手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第8部（React・React Router・第46章の SSR）、第7部（TypeScript・Zod） |
| この章のゴール | Next.js のアプリを手で作り、`next dev` で動かせる / `app/` のフォルダとファイルの名前から、URL とページの対応を説明できる / `layout.tsx`・`page.tsx`・`loading.tsx`・`not-found.tsx`・`error.tsx` の役割を説明できる / ページの部品の中で API を読める / URL のパラメータ（`params`）と検索パラメータ（`searchParams`）を使える / `metadata` で `<title>` を決められる / `next build` の結果の記号（○・◐）を読める |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で作るアプリの完成形（`web/`） |
| [exercises/](exercises/) | 練習問題（Next.js のアプリ。テストで確かめる） |
| [solutions/](solutions/) | 模範解答（Next.js のアプリ） |

> **読み方**
> - 第9部の最初の章です。1節で、第9部のフォルダを `~/dev/part09` にコピーし、Next.js などのパッケージを入れます（1回だけ）。
> - この章のコマンドは、`~/dev/part09/ch47-nextjs-intro/` で実行します。手を動かして作るアプリ（`web/`）は、このフォルダの直下に作ります。
> - この章では、**ターミナルを2つ**使います。1つ目で練習用の API を、2つ目で Next.js を動かします。
> - 第8部の Vite と比べながら読むと、Next.js が何を引き受けているかが分かります。比べる表は10節にあります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ファイルの置き場所が URL になる（3節） | 第48〜50章、第9部の成果物、第13部（Next.js で作るなら） |
| ページの部品の中で API を読む（5節） | 第48章（サーバとブラウザのどちらで動くか）、第50章（読んだ結果を覚えておく） |
| `loading.tsx`・`not-found.tsx`・`error.tsx`（5・6節） | 第9部の成果物、第10部（ログインしていないときのページ） |
| `metadata`（8節） | 第12部（検索エンジンに載せる・SNS に貼られたときの表示） |
| `next build` と `next start`（9節） | 第50章（どのページが前もって作られるか）、第12部（デプロイ） |

---

## 1. 準備

### 1.1 第9部のフォルダを ~/dev/part09 にコピーする

第9部のサンプルと練習問題は、Next.js・React・Vitest などの外部のパッケージを使います。第5〜8部と同じく、**第9部のフォルダを `~/dev/part09` にコピーし、そこで動かします**。次を1回だけ実行します。

```sh
$ bash （ここに Finder から part09-nextjs フォルダの中の setup-part09.sh をドラッグ）
```

- `bash ファイル` は、シェルスクリプトを動かすコマンドです（第1部 第1章）。Finder からファイルをターミナルにドラッグすると、そのファイルの場所（パス）が入力されます。
- `setup-part09.sh` は、教材の `part09-nextjs` フォルダを `~/dev/part09` にコピーし、`npm ci` で [package.json](../package.json) に書いたパッケージを入れます。`~/dev/part09` が既にあれば、何もしません。

```text
作りました: /Users/alice/dev/part09
  次は: cd /Users/alice/dev/part09/ch47-nextjs-intro
```

### 1.2 練習用の API を動かす

第9部でも、第8部と同じ練習用の API（第7部の成果物と同じ API を、データベースなしで動かすもの）を使います。1つ目のターミナルで、次を実行します。

```sh
# 1つ目のターミナル（Ctrl+C で止める）
$ cd ~/dev/part09
$ npm run api
練習用の API: http://127.0.0.1:9500/api/tasks （止めるのは Ctrl+C）
```

- `npm run api` は、[package.json](../package.json) の `scripts` の `api`（`node api/server.ts`）を動かします。中身は [../api/](../api/) です。
- データはメモリに置くので、止めると、足したタスクは消えます。動かすたびに、例のタスクが5つ入ります。

2つ目のターミナルを開き、この章のフォルダに移ります。

```sh
# 2つ目のターミナル
$ cd ~/dev/part09/ch47-nextjs-intro
```

---

## 2. 手を動かす: いちばん小さな Next.js のアプリ

### 2.1 設定のファイル

アプリのフォルダ `web/` と、ページを置くフォルダ `web/app/` を作り、設定のファイルを2つコピーします。

```sh
$ mkdir -p web/app
$ cp ../tools/next.config.ts ../tools/tsconfig.next.json web/
$ cd web
$ mv tsconfig.next.json tsconfig.json
```

- `mkdir -p` は、途中のフォルダもまとめて作るオプションです。`mv 元 先` は、ファイルの名前を変えるコマンドです。
- Next.js には、アプリのひな形を作る `npx create-next-app@latest` というコマンドもあります。この教材では、何がどのファイルにあるのかを1つずつ見るために、手で作ります（ひな形は 10 節で見ます）。

`next.config.ts` は、Next.js の設定です。

```ts
// Next.js の設定（第47章 2節）。第9部のアプリは、どれもこの形
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components（第50章）。今の Next.js の、おすすめの決まり（create-next-app の既定）
  cacheComponents: true,
  partialPrefetching: true,
  // 開発サーバが AGENTS.md（AI 向けの説明）を作らないようにする
  agentRules: false,
  // ビルドの結果を置くフォルダ。練習問題のテストは .next-test を使い、自分で動かしている next dev とぶつからないようにする
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
```

- `cacheComponents` は、Next.js が作ったページやデータを覚えておく仕組みです。詳しくは第50章で学びます。今は「今の Next.js のおすすめの設定」とだけ思ってください。
- `distDir` は、ビルドした結果を置くフォルダです。ふだんは `.next` です。練習問題のテストは `.next-test` を使い、自分で動かしている Next.js とぶつからないようにしています。

`tsconfig.json` は、第8部とほぼ同じ TypeScript の設定に、Next.js が求める項目（`"plugins": [{ "name": "next" }]` など）を足したものです。Next.js は、起動のときに `tsconfig.json` を確かめ、足りない項目があれば**自分で書き足します**。コピーしたものは、書き足された後の形なので、変わりません。

### 2.2 ルートのレイアウトと、最初のページ

`app/layout.tsx` を作ります。

```tsx
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx` を作ります。

```tsx
export default function HomePage() {
  console.log('HomePage を描きました');
  return <h1>タスク管理</h1>;
}
```

- **`layout.tsx`**: 何ページにも共通の枠です。`app/` の直下のものは**ルートのレイアウト**と呼び、`<html>` と `<body>` はここにだけ書きます。ページの中身は `children` に入ります（第44章 2.2節の `<Outlet />` と同じ役割です）。
- **`page.tsx`**: ページそのものです。`app/page.tsx` が `/` のページになります。
- どちらも、**`export default`** で部品を出します。Next.js が、ファイルの名前と場所を見て、この部品を呼びます。第8部の `main.tsx`（`createRoot(…).render(…)`）や、`createBrowserRouter` の表は、自分では書きません。

### 2.3 動かす

```sh
$ npx next dev -p 9510
▲ Next.js 16.4.3 (Turbopack)
- Local:         http://localhost:9510
✓ Ready in 266ms
- Cache Components enabled
- Partial Prefetching enabled
```

- `npx next dev` は、Next.js の**開発サーバ**を起動するコマンドです（第40章の `npx vite` にあたります）。`-p 9510` は、待ち受けるポートを 9510 にするオプションです（何も付けなければ 3000）。
- 止めるときは `Ctrl+C` です。

ブラウザで `http://localhost:9510/` を開くと、「タスク管理」と出ます。次の3つを確かめます。

1. **ターミナル**に `HomePage を描きました` と出ます。ブラウザの DevTools の Console には出ません。`page.tsx` の部品は、**サーバで**動いたのです。
2. ページのソース（`Cmd+Option+U`）を見ると、`<h1>タスク管理</h1>` が最初から HTML に入っています。第46章で自分で作った SSR と同じことを、Next.js がしています。
3. `web/` に `.next/`（ビルドの結果）と `next-env.d.ts`（型の設定。Next.js が作り直すので、書き換えない）ができています。どちらも Git に入れないものです。

---

## 3. ファイルが URL になる

### 3.1 手を動かす: /about のページ

`app/about/page.tsx` を作ります。

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'このアプリについて' };

export default function AboutPage() {
  return (
    <>
      <h1>このアプリについて</h1>
      <p>Next.js の App Router で作りました。ページは、サーバで HTML になってから届きます。</p>
    </>
  );
}
```

`http://localhost:9510/about` を開くと、このページが出ます。**フォルダの名前が URL** になり、その中の `page.tsx` がページになります。サーバを止めて動かし直す必要はありません（保存すると、すぐ変わります）。

| ファイル | URL |
| --- | --- |
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/tasks/page.tsx` | `/tasks` |
| `app/tasks/[id]/page.tsx` | `/tasks/1`・`/tasks/2`・…（6節） |

- `page.tsx` の無いフォルダは、URL になりません。`app/lib/` のように、部品や関数を置くフォルダを作っても、ページにはなりません（この章では、`app/` の外の `lib/` に置きます）。
- `export const metadata` は、ページの `<title>` などを決めます（8節）。

### 3.2 決まった名前のファイル

`page.tsx` と `layout.tsx` のほかにも、Next.js が意味を決めている名前があります。

| ファイル | 役割 | 節 |
| --- | --- | --- |
| `layout.tsx` | その URL と、その下の URL に共通の枠 | 2・3節 |
| `page.tsx` | ページ | 2・3節 |
| `loading.tsx` | ページを作っている間に出すもの | 5節 |
| `not-found.tsx` | 「見つからない」ときに出すもの | 6節 |
| `error.tsx` | ページを作る途中で失敗したときに出すもの | 6節 |
| `route.ts` | ページではなく、JSON などを返す入り口 | 第49章 |

### 3.3 手を動かす: 共通のメニューと CSS

`app/globals.css` を作ります。

```css
/* 第47章 2節: アプリ全体の CSS。layout.tsx で import する */
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
header nav {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #d1d9e0;
}
main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem;
}
a[aria-current='page'] {
  font-weight: bold;
}
```

`app/layout.tsx` を、次のように書き換えます（`/tasks` は5節で作ります）。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  // ページが title を決めなければ「タスク管理」。決めたら「（ページの title） | タスク管理」
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: '第47章のサンプル',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav aria-label="メニュー">
            <Link href="/">ホーム</Link>
            <Link href="/tasks">タスク</Link>
            <Link href="/about">このアプリについて</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- **`import './globals.css'`**: CSS は、JavaScript から import します（第40章 3節と同じ）。ルートのレイアウトで読めば、どのページにも効きます。
- **`<Link href="/about">`**: Next.js のリンクです（4節）。

メニューのリンクを押して、ページが替わることを確かめます。

---

## 4. Link とページの移動

`<Link>` は、`<a>` のタグを出します。ページのソースを見ると、`<a href="/about">` です。違うのは、押したときです。

1. DevTools の **Network** を開き、「このアプリについて」を押します。
2. `about?_rsc=…` のようなリクエストが出ます。これは、ページの HTML ではなく、ページの中身だけを表したデータです。画面は白くならず、ページ全体は読み直されません。

`<Link>` を押すと、Next.js は、**新しいページの中身だけ**をサーバに頼み、今の画面の中身だけを入れ替えます（React Router の `<Link>`（第44章 5.1節）と同じく、ページを読み直しません）。さらに、画面に見えているリンクの先を、押される前に**先読み（prefetch）**しておくので、押したらすぐ替わります。

> `<a href="/about">` と書いても動きますが、押すたびにページ全体を読み直します。アプリの中のリンクは `<Link>` にします。外のサイトへのリンクは `<a>` で構いません。

---

## 5. サーバで API を読む

### 5.1 手を動かす: API を呼ぶ関数

`web/lib/api.ts` を作ります（`app/` の外に作ります。`mkdir lib` で、フォルダを作ってから）。

```ts
import { z } from 'zod';

// つなぐ API の場所。API_URL=http://127.0.0.1:9516 npx next dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9500';

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

// 第7部の API の Task と同じ形（第8部の成果物の schemas.ts と同じ）
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });
export type Page = z.infer<typeof PageSchema>;

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

/** 一覧の1ページ。status を渡せば、その状態のものだけ */
export async function listTasks({ status, cursor }: { status?: Status; cursor?: string } = {}): Promise<Page> {
  const q = new URLSearchParams({ sort: 'createdAt', limit: '20' });
  if (status) q.set('status', status);
  if (cursor) q.set('cursor', cursor);
  const res = await fetch(`${API_URL}/api/tasks?${q}`);
  if (!res.ok) throw new Error(`タスクを読めませんでした（${res.status}）`);
  return PageSchema.parse(await res.json());
}

/** 1つ読む。無ければ null */
export async function getTask(id: number): Promise<Task | null> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`タスクを読めませんでした（${res.status}）`);
  return TaskSchema.parse(await res.json());
}
```

- 第8部の成果物の `schemas.ts`・`client.ts` とほぼ同じです。違うのは、**`/api/…` ではなく `http://127.0.0.1:9500/api/…` と、API の場所をすべて書く**ことです。この関数は、ブラウザではなく、Next.js のサーバの上で動くからです（Vite のプロキシ（第40章 5節）も、CORS（第39章）も要りません）。
- `process.env.API_URL` は、環境変数です（第5部 第26章）。サーバで動くので、`process.env` が使えます。練習問題のテストは、ここに別の API の場所を入れます。

### 5.2 手を動かす: 一覧のページ

`app/tasks/page.tsx` を作ります。まずは、絞り込み（7節）の無い形です。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUS_LABELS, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

export default async function TasksPage() {
  const { items } = await listTasks();
  return (
    <>
      <h1>タスクの一覧</h1>
      <ul>
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`}>{t.title}</Link>（{STATUS_LABELS[t.status]}）
          </li>
        ))}
      </ul>
    </>
  );
}
```

部品の関数に **`async`** が付き、中で **`await listTasks()`** しています。第8部では、部品の関数は `async` にできませんでした（第43章では `useEffect` か TanStack Query で読みました）。Next.js では、サーバで動く部品（**Server Component**。第48章）は、`async` にして、その場で `await` できます。`useState`・`useEffect`・読み込み中の state は要りません。

`http://localhost:9510/tasks` を開くと、一覧は出ますが、ブラウザの左下に赤い「1 Issue」の印が出て、ターミナルにもこう出ます。

```text
Error: Route "/tasks": Next.js encountered uncached data during prerendering.

`fetch(...)` or `connection()` accessed outside of `<Suspense>` prevents the route from being prerendered, blocking the page load and leading to a slower user experience.
```

「`fetch` を、`<Suspense>` の外で待っている。これでは、待っている間、ページ全体が届かない」という意味です。API の応答を待つ間、メニューすら出ない、ということです。

### 5.3 手を動かす: loading.tsx

`app/tasks/loading.tsx` を作ります。

```tsx
export default function Loading() {
  return <p>読み込んでいます…</p>;
}
```

もう一度開くと、赤い印が消えます。`loading.tsx` を置くと、Next.js は、ページを `<Suspense fallback={<Loading />}>`（第46章 6節）で包みます。だから、

1. メニューと「読み込んでいます…」が、**すぐに**届く
2. API の応答が来たら、一覧が**後から流れてきて**、「読み込んでいます…」と入れ替わる

という順になります。第46章 6節で、`renderToPipeableStream` で自分で書いたストリーミングです。1つ目のターミナルの API を止めて `API_DELAY_MS=2000 npm run api` で動かし直すと、「読み込んでいます…」が2秒見えます。

> **決まり**: `fetch` で API を読むページ、6・7節の `params`・`searchParams` を使うページには、`loading.tsx` を置きます（`<Suspense>` を自分で書く方法は第48章、前もって作っておく方法は第50章で学びます）。

---

## 6. URL のパラメータ

### 6.1 手を動かす: /tasks/[id]

フォルダの名前を `[id]` のように `[ ]` で囲むと、その部分にどんな文字が来ても合う URL になります（第44章 3節の `/tasks/:id` と同じ）。`app/tasks/[id]/page.tsx` を作ります。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STATUS_LABELS, getTask } from '../../../lib/api.ts';

/** URL の id を確かめて読む。数字でない・無いタスクなら notFound()（not-found.tsx を出す） */
async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

// ページごとに title を変える。同じ URL への fetch は、1回の描画の中では1回にまとめられる
export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const task = await loadTask(params);
  return { title: task.title };
}

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  return (
    <>
      <h1>{task.title}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[task.status]}</dd>
        <dt>締め切り</dt>
        <dd>{task.dueDate ?? 'なし'}</dd>
      </dl>
      <p>
        <Link href="/tasks">一覧に戻る</Link>
      </p>
    </>
  );
}
```

- **`params`** に、URL の `[id]` の部分が入ります。`params` は **Promise** なので、`await` してから使います。`/tasks/1` なら `{ id: '1' }`、`/tasks/abc` なら `{ id: 'abc' }` です。値は**文字**で、どんな文字でも来るので、確かめてから使います（第44章 3節）。
- **`PageProps<'/tasks/[id]'>`** は、Next.js が `.next/` の中に作る型です。URL の形から、`params` の型（`Promise<{ id: string }>`）を作ってくれます。`next dev` か `next build` を一度動かすと作られます。まだ一度も動かしていないフォルダで `npx tsc` を打つと `Cannot find name 'PageProps'` と出るので、そのときは型だけを作るコマンド `npx next typegen` を先に打ちます。
- **`notFound()`** は、「このページは無い」として、`not-found.tsx` を出す関数です。`return` を書かなくても、ここで止まります（中で例外を投げています）。
- **`generateMetadata`** は、ページごとに `<title>` を決める関数です（8節）。`loadTask` を2回呼んでいますが、1回の表示の中で同じ URL への `fetch` は、Next.js が1回にまとめます。
- URL の値は、**エスケープされたまま**届きます。`/tasks/ねこ` なら、`id` は `'%E3%81%AD%E3%81%93'` です。文字として使うときは `decodeURIComponent(id)` で戻します（練習問題3）。

`/tasks/1` のページは、`app/tasks/loading.tsx` が `/tasks` の下のページも包むので、そのままで「読み込んでいます…」が出ます。

### 6.2 手を動かす: not-found.tsx と error.tsx

`app/not-found.tsx` を作ります。

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>ページが見つかりません</h1>
      <p>
        <Link href="/">ホームに戻る</Link>
      </p>
    </>
  );
}
```

`/tasks/99`（無いタスク）・`/tasks/abc`・`/nothing`（どれにも合わない URL）を開くと、どれも「ページが見つかりません」と出ます。

ここで、DevTools の Network でステータスを見ると、`/nothing` は **404** ですが、`/tasks/99` は **200** です。`/tasks/99` は、5.3節のとおり、メニューと「読み込んでいます…」を**先に送り始めて**から、API に聞いて「無い」と分かります。HTTP のステータスは最初に送るので、後から 404 には変えられないのです。代わりに Next.js は、ページに `<meta name="robots" content="noindex">`（検索エンジンに載せないで、という印）を入れます。第46章 5節の「ソフト 404」の問題を、こうして小さくしています。

`app/error.tsx` を作ります。

```tsx
'use client';
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert">
      <h1>うまく表示できませんでした</h1>
      {/* 投げられたものが Error とは限らないので、確かめてから message を読む（第36章 3節） */}
      <p>{error instanceof Error ? error.message : '思わぬ失敗です'}</p>
      <button type="button" onClick={retry}>
        もう一度読む
      </button>
    </div>
  );
}
```

- 1行目の **`'use client'`** は、「この部品は、ブラウザでも動く」という印です。ボタンを押して `retry()`（サーバにもう一度頼んで、作り直す）を呼ぶには、ブラウザで動く必要があります。詳しくは第48章で学びます。`error.tsx` には、必ず付けます。
- `error` には、投げられたものが入ります。`Error` とは限らないので、`instanceof Error` で確かめてから `message` を読みます（第36章 3節）。本番（`next start`）では、`message` は中身を隠した文になります。サーバのエラーの文に、秘密の値やデータベースの中身が入っていることがあるからです。
- 1つ目のターミナルの API を `Ctrl+C` で止めて、`/tasks` を開くと、このページが出ます。API を動かし直して「もう一度読む」を押すと、一覧に戻ります。

---

## 7. 検索パラメータで絞り込む

`/tasks?status=done` のように、`?` の後ろの検索パラメータは、ページの **`searchParams`**（Promise）に入ります。`app/tasks/page.tsx` を、次のように書き換えます。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, isStatus, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  // searchParams は Promise。await すると、?status=done なら { status: 'done' }
  const { status } = await searchParams;
  const current = isStatus(status) ? status : undefined; // 知らない値は「全部」と同じ
  const { items } = await listTasks({ status: current });

  return (
    <>
      <h1>タスクの一覧</h1>
      <nav aria-label="状態で絞り込む">
        <Link href="/tasks" aria-current={current === undefined ? 'page' : undefined}>
          全部
        </Link>
        {STATUSES.map((s) => (
          <span key={s}>
            {' | '}
            <Link href={`/tasks?status=${s}`} aria-current={current === s ? 'page' : undefined}>
              {STATUS_LABELS[s]}
            </Link>
          </span>
        ))}
      </nav>
      {items.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul>
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`}>{t.title}</Link>（{STATUS_LABELS[t.status]}）
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- `await searchParams` で、`/tasks?status=done` なら `{ status: 'done' }` です。値は、`undefined`（無い）・文字・文字の配列（`?status=a&status=b`）のどれかです。`isStatus` で確かめて、知らない値は「全部」と同じにします（第44章 4節）。
- 絞り込みのリンクを押すと、URL の `?status=…` が変わり、ページがサーバで作り直されます。第44章では `useSearchParams` で読み、TanStack Query のキーにしましたが、ここでは、サーバで読んで、そのまま API に渡すだけです。
- `aria-current="page"` で、今の条件のリンクを示します（第44章 5.2節）。CSS で太字にしています。

---

## 8. metadata で title を決める

| 書き方 | どこに書くか | 使う場面 |
| --- | --- | --- |
| `export const metadata: Metadata = { title: '…' }` | `layout.tsx`・`page.tsx` | 決まった title |
| `export async function generateMetadata({ params })` | `page.tsx`（`layout.tsx`） | データで変わる title（タスクの題名など） |

ルートのレイアウトの `title: { default: 'タスク管理', template: '%s | タスク管理' }` は、

- ページが title を決めなければ「タスク管理」
- ページが `'このアプリについて'` と決めたら、`%s` に入って「このアプリについて | タスク管理」

という意味です。ブラウザのタブで確かめます。第46章 5節では、`<title>` をサーバで自分で入れましたが、ここでは、ページが値を返すだけで、Next.js が `<head>` に入れます。

---

## 9. ビルドして動かす

### 9.1 手を動かす: next build

開発サーバを `Ctrl+C` で止めて、本番用にビルドします。

```sh
$ npx next build
（…）
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ◐ /tasks
└   /tasks/[id]
  └ ◐ /tasks/[id]

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
```

- **○（Static）**: ビルドのときに、HTML を**作り終えた**ページです。`/` と `/about` は、API も URL のパラメータも使わないので、毎回同じです。だから、前もって作っておけます。
- **◐（Partial Prerender）**: 一部だけ前もって作ったページです。メニューと「読み込んでいます…」までをビルドのときに作り、API を読む部分は、開かれたときにサーバで作って流します（5.3節の順番）。

ビルドの途中に、ターミナルに `HomePage を描きました` と出ます。`/` のページは、**ビルドのときに**作られたのです。

### 9.2 手を動かす: next start

```sh
$ npx next start -p 9510
```

`next start` は、`next build` の結果を動かすコマンドです（第46章 2.5節で、`vite build` の後に `node server.ts` で動かしたのと同じ）。`/` を何度開いても、ターミナルに `HomePage を描きました` は**出ません**。作っておいた HTML を返すだけだからです。`/tasks` を開くと、毎回 API を読みます（API に新しいタスクを足すと、すぐ一覧に出ます）。

どのページを前もって作り、どのページを毎回作るかは、第50章で詳しく学びます。

### 9.3 ESLint

第9部の ESLint の設定（[../eslint.config.js](../eslint.config.js)）は、第8部の設定に、Next.js のルール（`@next/eslint-plugin-next`）を足したものです。`<img>` より `next/image` を使う、アプリの中のリンクに `<a>` を使わない、などを見張ります。

```sh
$ npx eslint .
```

---

## 10. 第8部（Vite + React）・Flask と比べる

Flask では、`@app.route('/tasks/<int:id>')` のように、Python の関数に URL を付けました。関数の中でデータベースを読み、Jinja2 のテンプレートに渡して、サーバで HTML を作って返しました。ページを移るたびに、ブラウザはページ全体を読み直しました。

Next.js の Server Component は、この「サーバで読んで、HTML を作る」に戻ったように見えます。違うのは、作るのが React の部品なので、同じ部品の続きをブラウザでも動かせること（第48章）と、`<Link>` でページの中身だけを入れ替えることです。

| やること | Flask | 第8部（Vite + React） | Next.js |
| --- | --- | --- | --- |
| URL とページの対応 | `@app.route('/tasks/<int:id>')` | `createBrowserRouter([{ path: 'tasks/:id', … }])` | `app/tasks/[id]/page.tsx` を置く |
| 共通の枠 | `{% extends "base.html" %}` | 親のルートと `<Outlet />` | `layout.tsx` と `children` |
| データを読む | 関数の中でデータベースを読む | `useQuery`（ブラウザから API） | `async` の部品の中で `await`（サーバから API） |
| 読み込み中 | （無い。読み終えてから HTML を返す） | `isPending` で出し分ける | `loading.tsx` |
| HTML を作る場所 | サーバ | ブラウザ | サーバ（続きをブラウザで） |
| 見つからない | `abort(404)` | `path: '*'` のページ | `notFound()` と `not-found.tsx` |
| title | テンプレートの `<title>` | （自分で `document.title`） | `metadata`・`generateMetadata` |
| 開発サーバ | `flask run` | `npx vite` | `npx next dev` |
| 本番 | gunicorn など | `vite build` して、静的なファイルを配る | `next build` して `next start` |

`npx create-next-app@latest` で作るひな形には、ここで手で作ったものに加えて、Tailwind CSS（第45章 4節）・ESLint の設定・`public/`（画像などをそのまま配るフォルダ）・`.gitignore` が入っています。

---

## まとめ

- Next.js は、ルーティング・SSR・ストリーミング・ビルドを引き受けるフルスタックフレームワーク。`npx next dev` で動かし、`npx next build` → `npx next start` で本番の形にする。
- `app/` の中のフォルダが URL になり、`page.tsx` がページ、`layout.tsx` が共通の枠。`[id]` のフォルダは、どんな文字にも合う。
- `app/` の部品は、ふだんはサーバで動く（Server Component）。`async` にして、その場で API を `await` できる。API の場所はすべて書く。
- API・`params`・`searchParams` を待つページには `loading.tsx` を置く。先に枠を送り、中身を後から流す。
- `params`・`searchParams` は Promise で、値はエスケープされたままの文字。確かめてから使う。
- `notFound()` は `not-found.tsx` を出す。流し始めた後なら、ステータスは 200 で、`noindex` が付く。`error.tsx` は `'use client'` を付ける。
- `<Link>` は、ページの中身だけを入れ替え、先読みもする。
- `metadata`・`generateMetadata` で `<title>` を決める。`template` で、サイトの名前を後ろに付けられる。
- `next build` の結果の ○ は前もって作ったページ、◐ は一部だけ前もって作ったページ。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Next.js Docs「Getting Started」: https://nextjs.org/docs/app/getting-started
- Next.js Docs「Layouts and Pages」: https://nextjs.org/docs/app/getting-started/layouts-and-pages
- Next.js Docs「Linking and Navigating」: https://nextjs.org/docs/app/getting-started/linking-and-navigating
- Next.js Docs「Fetching Data」: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js Docs「Error Handling」: https://nextjs.org/docs/app/getting-started/error-handling
- Next.js Docs「Metadata and OG images」: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- `~/dev/part09/node_modules/next/dist/docs/` に、入れた版の Next.js の説明書（英語の Markdown）が入っています。

---

前の部: [第8部 フロントエンドと React](../../part08-react/README.md) ／ 第9部の目次: [../README.md](../README.md) ／ 次の章: [第48章 Server Components と Client Components](../ch48-server-client/README.md)
