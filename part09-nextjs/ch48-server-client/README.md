# 第48章 Server Components と Client Components

第47章のページは、すべてサーバで動きました。でも、ボタンを押して数を増やす、開け閉めする、打った文字で探す、といったことは、ブラウザで動かないとできません。この章では、Next.js の部品の2つの種類、**サーバだけで動く Server Component** と、**ブラウザでも動く Client Component** を学びます。どのコードがどこで動くのかを確かめ、2つをどう組み合わせるか、サーバでだけ使うべき値をどう守るか、遅い部分だけを後から流すにはどうするかを、手を動かして身につけます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第47章、第42章（Hooks）、第46章（ハイドレーション・ストリーミング） |
| この章のゴール | Server Component と Client Component の違いを、「どこで動くか」「何が使えるか」で説明できる / `'use client'` を付けるファイルを選べる / Client Component に渡せる props と渡せない props を区別できる / `children` で Server Component を Client Component の中に入れられる / `server-only` と環境変数で、サーバだけの値を守れる / `<Suspense>` を分けて、遅い部分だけを後から流せる / `usePathname`・`useSearchParams`・`useRouter` を使える |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で作るアプリの完成形（`web/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part09/ch48-server-client/` で実行します。手を動かして作るアプリ（`web/`）は、このフォルダの直下に作ります。
> - 第47章と同じく、ターミナルを2つ使います（1つ目で `npm run api`、2つ目で Next.js）。この章の Next.js は、ポート 9520 で動かします。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Server Component と Client Component（2・3節） | 第49章（フォームから送る）、第50章（何を覚えておくか）、第9部の成果物 |
| `server-only` とサーバだけの値（4節） | 第10部（ログインの秘密の値・セッション）、第12部（本番の環境変数） |
| `<Suspense>` で分けて流す（5節） | 第50章（前もって作る部分と、毎回作る部分）、第9部の成果物 |
| `useRouter`・`useSearchParams`（6節） | 第9部の成果物（検索・SSE で読み直す） |

---

## 1. 準備

第47章で作った `web/` をコピーして始めます。

```sh
$ cd ~/dev/part09/ch48-server-client
$ cp -R ../ch47-nextjs-intro/samples/web web
$ cd web
$ rm -rf .next
```

- `cp -R 元 先` は、フォルダを中身ごとコピーするコマンドです。自分で作った `../ch47-nextjs-intro/web` をコピーしても構いません。
- `rm -rf .next` は、コピーしてきたビルドの結果を消すコマンドです（`-r` はフォルダの中身ごと、`-f` は確かめずに）。消す前に、`.next` と打ったか、よく見てください。

```sh
$ npx next dev -p 9520
```

`http://localhost:9520/` を開いて、第47章と同じページが出ることを確かめます。

---

## 2. 2つの部品

### 2.1 手を動かす: 押すと増えるボタン

`web/components/` を作り（`mkdir components`）、`components/Counter.tsx` を作ります。まずは、1行目の `'use client';` を**書かずに**作ります。

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  console.log('Counter を描きました', count);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      押した回数: {count}
    </button>
  );
}
```

`app/page.tsx` で使います。

```tsx
import { Counter } from '../components/Counter.tsx';

export default function HomePage() {
  console.log('HomePage を描きました');
  return (
    <>
      <h1>タスク管理</h1>
      <Counter />
    </>
  );
}
```

`/` を開くと、エラーになります。

```text
Error: You're importing a module that depends on `useState` into a React Server Component module. This API is only available in Client Components. To fix, mark the file (or its parent) with the `"use client"` directive.
```

「`useState` は Client Component でしか使えない。ファイルに `"use client"` の印を付けなさい」という意味です。`Counter.tsx` の1行目に、次の1行を足します。

```tsx
'use client';
```

もう一度開くと、ボタンが出て、押すと数が増えます。

### 2.2 どこで動くか

`app/` の部品は、何も書かなければ **Server Component** です。ファイルの1行目に `'use client'` と書くと、そのファイルの部品は **Client Component** になります。

ターミナルと、ブラウザの DevTools の Console を見比べます。

| | `next dev` のターミナル | ブラウザの Console |
| --- | --- | --- |
| `HomePage を描きました` | 出る | 灰色の「Server」の印付きで出る（開発中だけ。サーバの出力を、見やすいように写している） |
| `Counter を描きました 0` | 出る | 出る（2回。StrictMode。第42章 3.4節） |
| ボタンを押した後の `Counter を描きました 1` | 出ない | 出る |

- **Server Component**（`HomePage`）は、サーバでだけ動きます。部品のコードは、ブラウザ用の JavaScript に入りません。
- **Client Component**（`Counter`）は、まずサーバで動いて最初の HTML になり（第46章の SSR）、その後ブラウザで**もう一度**動いて、ボタンが押せるようになります（ハイドレーション。第46章 3節）。ボタンを押した後の描き直しは、ブラウザでだけ起きます。

「Client」という名前ですが、**ブラウザでだけ動く部品ではありません**。「ブラウザ**でも**動く部品」です。

| | Server Component | Client Component |
| --- | --- | --- |
| 印 | 何も書かない | ファイルの1行目に `'use client'` |
| 動く場所 | サーバだけ | サーバ（最初の HTML）とブラウザ |
| `async` にして `await` する | できる | できない（6節の `use` で待つ） |
| `useState`・`useEffect`・`onClick` | 使えない | 使える |
| API やデータベースを直接読む・秘密の値を使う | できる | しない（ブラウザに届いてしまう。4節） |
| `window`・`localStorage` | 無い | ある（ブラウザで動いているときだけ。第46章 4.2節） |
| コードがブラウザに送られる | 送られない | 送られる |

---

## 3. 境界

### 3.1 'use client' は「ここから先はブラウザでも」という印

`'use client'` は、部品ごとではなく、**ファイル**に付けます。そして、そのファイルが import するファイルも、まとめてブラウザ用になります。だから、`'use client'` は、ボタンやフォームのような**小さな部品**のファイルにだけ付け、ページ全体には付けません。ページ全体に付けると、ページのコードが全部ブラウザに送られ、2・4節の良さが無くなります。

```text
app/page.tsx（Server）
├── <h1>…（Server）
└── components/Counter.tsx（'use client' → Client）
```

### 3.2 手を動かす: children でサーバの中身を入れる

Client Component の**ファイル**からは、Server Component を import できません（import したものはブラウザ用になるので）。でも、**`children` として受け取る**ことはできます。`components/Collapsible.tsx` を作ります。

```tsx
'use client';
import { useId, useState, type ReactNode } from 'react';

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section>
      <h2>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? '▼' : '▶'} {title}
        </button>
      </h2>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
```

`app/page.tsx` を書き換えます。

```tsx
import { Collapsible } from '../components/Collapsible.tsx';
import { Counter } from '../components/Counter.tsx';

export default function HomePage() {
  console.log('HomePage を描きました'); // サーバのターミナルにだけ出る
  return (
    <>
      <h1>タスク管理</h1>
      <Counter />
      <Collapsible title="この画面のしくみ">
        {/* この <p> は、サーバで作られて、Collapsible の children として渡る */}
        <p>この文は、サーバで作りました。開け閉めのボタンだけが、ブラウザで動きます。</p>
      </Collapsible>
    </>
  );
}
```

「この画面のしくみ」を押すと、中身が開きます。開け閉めは `Collapsible` が、ブラウザで受け持ちます。中の `<p>` は、`HomePage`（Server Component）が作って、できあがったものを `children` として渡しています。`Collapsible` は、中身が何かを知らずに、出すか隠すかだけを決めます。

### 3.3 props は「送れるもの」だけ

Server Component から Client Component へ渡す props は、サーバからブラウザへ**送られます**。だから、送れる形のものしか渡せません。

| 渡せる | 渡せない |
| --- | --- |
| 文字・数・真偽値・`null`・`undefined` | 関数（`onPress={() => …}` など） |
| 配列・ふつうのオブジェクト（中身も渡せるものだけ） | クラスのインスタンス（`new Map` は渡せるが、自分のクラスは渡せない） |
| `Date`・`Map`・`Set` | |
| JSX（`children` など） | |
| Promise（5.3節） | |
| Server Action（第49章） | |

関数を渡すと、こうなります（試すときは、`Counter` に `onPress` の props を足して、`<Counter onPress={() => console.log('押した')} />` と書く）。

```text
⨯ Error: Event handlers cannot be passed to Client Component props.
  <... onPress={function onPress}>
               ^^^^^^^^^^^^^^^^^^
If you need interactivity, consider converting part of this to a Client Component.
```

サーバの関数は、ブラウザに送れません。押されたときにすることは、Client Component の中に書きます（サーバで何かしたいときは、第49章の Server Action を使います）。

---

## 4. サーバだけの値を守る

### 4.1 手を動かす: server-only

`lib/api.ts` は、API の場所を知っていて、サーバから API を呼ぶ関数です。この章では、API に送る**合言葉**（トークン）も持たせます。`lib/api.ts` の頭を、次のように書き換えます（`listTasks`・`getTask` の `fetch` には、`{ headers }` を足します）。

```ts
import 'server-only';
import { z } from 'zod';

// つなぐ API の場所。API_URL=http://127.0.0.1:9516 npx next dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9500';
// API に送る合言葉（の練習）。サーバだけが知っていればよい値。dev-only- は開発用の仮の値の印
const API_TOKEN = process.env.API_TOKEN ?? 'dev-only-token';
const headers = { Authorization: `Bearer ${API_TOKEN}` };
```

- 練習用の API は、まだ合言葉を確かめません。第10部で、ログインした人だけが使える API にするときに、こうした値を使います。
- **`import 'server-only'`** は、「このファイルは、サーバでだけ使う」という印です。`server-only` は、そのためだけの小さなパッケージです。

もし、だれかが Client Component から `lib/api.ts` を import すると、ブラウザ用の JavaScript に、合言葉ごと入ってしまいます。`server-only` を入れておくと、そうなる前に止まります。試しに、`components/Counter.tsx` に `import { STATUS_LABELS } from '../lib/api.ts';` を足して `/` を開くと、こう出ます（試したら消す）。

```text
Error: 'server-only' cannot be imported from a Client Component module
It should only be used from a Server Component.
```

### 4.2 環境変数

| 環境変数の名前 | Server Component | Client Component（ブラウザ） |
| --- | --- | --- |
| `API_TOKEN` のような、ふつうの名前 | 読める | 読めない（ブラウザ用のファイルに入らない） |
| `NEXT_PUBLIC_` で始まる名前 | 読める | 読める（**ビルドのときに、値がファイルに書き込まれる**） |

第40章 4節の Vite の `VITE_` と同じ決まりです。`NEXT_PUBLIC_` の値は、だれでも読めるものと考え、秘密を入れません。

---

## 5. Suspense で分けて流す

### 5.1 手を動かす: 一覧の待つ部分を中に入れる

第47章では、`/tasks` に `loading.tsx` を置きました。これだと、見出しも含めて、ページ全体が「読み込んでいます…」に替わります。`<Suspense>` を自分で書くと、**待つ部分だけ**を後から流せます。

`app/tasks/loading.tsx` を消し（`rm app/tasks/loading.tsx`）、`app/tasks/[id]/loading.tsx` を作ります（中身は消したものと同じ。`/tasks/1` などは、これまでどおり loading.tsx で待ちます）。`app/tasks/page.tsx` を書き換えます（`SearchBox` は6.2節で作ります。先に作るなら、`SearchBox` の2行を消して試します）。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from '../../components/SearchBox.tsx';
import { STATUS_LABELS, isStatus, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

type Query = Awaited<PageProps<'/tasks'>['searchParams']>;

async function TaskList({ query }: { query: Promise<Query> }) {
  const { status, q } = await query;
  const { items } = await listTasks({ status: isStatus(status) ? status : undefined });
  // 題名で探すのは API に無いので、サーバで絞り込む（ブラウザには、絞り込んだ後のものだけが届く）
  const word = typeof q === 'string' ? q.toLowerCase() : '';
  const shown = items.filter((t) => t.title.toLowerCase().includes(word));
  if (shown.length === 0) return <p>タスクはありません</p>;
  return (
    <ul>
      {shown.map((t) => (
        <li key={t.id}>
          <Link href={`/tasks/${t.id}`}>{t.title}</Link>（{STATUS_LABELS[t.status]}）
        </li>
      ))}
    </ul>
  );
}

export default function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  // ここでは await しない。Promise のまま、<Suspense> の中の部品に渡す
  return (
    <>
      <h1>タスクの一覧</h1>
      {/* useSearchParams を使う Client Component も、<Suspense> の中に置く */}
      <Suspense fallback={<p>検索の欄を用意しています…</p>}>
        <SearchBox />
      </Suspense>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <TaskList query={searchParams} />
      </Suspense>
    </>
  );
}
```

- ページの部品（`TasksPage`）は、`async` ではなく、何も待ちません。`searchParams`（Promise）を、そのまま `TaskList` に渡します。
- `TaskList` が、`<Suspense>` の中で `await` します。だから、見出しと検索の欄は前もって作られ、一覧だけが後から流れてきます。
- 第47章 5.3節の決まりは、正しくは「`fetch`・`params`・`searchParams` を**待つ部品を、`<Suspense>` の中に置く**」です。`loading.tsx` は、ページ全体を包む `<Suspense>` を書く近道でした。

### 5.2 手を動かす: 遅さの違う部分を別々に流す

`app/dashboard/page.tsx` を作ります（`mkdir app/dashboard`）。`components/TaskCount.tsx` は5.3節で作るので、先に5.3節のファイルを作っておきます。

```tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TaskCount } from '../../components/TaskCount.tsx';
import { STATUSES, STATUS_LABELS, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'まとめ' };

/** 状態ごとの数。3つの状態を、同時に（Promise.all で）API に聞く */
async function StatusCounts() {
  const pages = await Promise.all(STATUSES.map((status) => listTasks({ status })));
  return (
    <ul>
      {STATUSES.map((s, i) => (
        <li key={s}>
          {STATUS_LABELS[s]}: {pages[i]?.items.length ?? 0} 件
        </li>
      ))}
    </ul>
  );
}

/** 締め切りのあるタスク（わざと 1.5 秒遅らせる） */
async function WithDueDate() {
  await new Promise((r) => setTimeout(r, 1500));
  const { items } = await listTasks();
  const due = items.filter((t) => t.dueDate !== null);
  return (
    <ul>
      {due.map((t) => (
        <li key={t.id}>
          {t.title}（{t.dueDate}まで）
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  // await しない Promise を、Client Component に渡す（5.3節）
  const count = listTasks().then((p) => p.items.length);
  return (
    <>
      <h1>まとめ</h1>
      <Suspense fallback={<p>数えています…</p>}>
        <TaskCount count={count} />
      </Suspense>
      <h2>状態ごとの数</h2>
      <Suspense fallback={<p>状態ごとに数えています…</p>}>
        <StatusCounts />
      </Suspense>
      <h2>締め切りのあるタスク</h2>
      <Suspense fallback={<p>締め切りを調べています…</p>}>
        <WithDueDate />
      </Suspense>
    </>
  );
}
```

`/dashboard` を開くと、「数えています…」などの3つの文が先に出て、すぐに件数、1.5 秒後に締め切りのあるタスクが出ます。それぞれの `<Suspense>` は、自分の中身ができたら、ほかを待たずに流します（第46章 6節）。1つの `<Suspense>` にまとめると、いちばん遅いものを待ってから、全部が一度に出ます。

`StatusCounts` の `Promise.all` は、3つの状態の一覧を**同時に** API に聞きます（第3部 第12章）。`for` の中で1つずつ `await` すると、3回分待つことになります。

### 5.3 手を動かす: Promise を渡して use で待つ

`components/TaskCount.tsx` を作ります。

```tsx
'use client';
import { use } from 'react';

export function TaskCount({ count }: { count: Promise<number> }) {
  const n = use(count);
  return <p>全部で {n} 件</p>;
}
```

`DashboardPage` は、`listTasks()` の Promise を `await` せずに、`TaskCount` に渡しています。Client Component は `async` にできませんが、React の **`use`** で、渡された Promise の結果を待てます。待っている間は、外の `<Suspense>` の `fallback` が出ます。サーバで読み始めたデータを、ブラウザでも動く部品で使いたいときの書き方です。

---

## 6. ブラウザの情報を使う

### 6.1 手を動かす: 今のページが分かるメニュー

今の URL は、`next/navigation` の **`usePathname()`** で読めます。Hooks なので、Client Component で使います。`components/NavLinks.tsx` を作ります。

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'ホーム' },
  { href: '/tasks', label: 'タスク' },
  { href: '/dashboard', label: 'まとめ' },
  { href: '/about', label: 'このアプリについて' },
];

/** 今の URL が分かる前（前もって作る HTML の中）に出す、印の無いメニュー */
export function NavLinksFallback() {
  return <NavLinksView pathname={null} />;
}

export function NavLinks() {
  const pathname = usePathname();
  return <NavLinksView pathname={pathname} />;
}

function NavLinksView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="メニュー">
      {LINKS.map(({ href, label }) => {
        if (pathname === null) {
          return (
            <Link key={href} href={href}>
              {label}
            </Link>
          );
        }
        // / はぴったりのときだけ、ほかは「その下」も今のページとみなす（/tasks/1 なら「タスク」）
        const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={current ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

`app/layout.tsx` のメニューを、これに替えます。

```tsx
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { NavLinks, NavLinksFallback } from '../components/NavLinks.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: '第48章のサンプル',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>
          {/* usePathname は、開かれた URL が分かるまで待つ。待つ間は、印の無いメニューを出しておく */}
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- レイアウトは Server Component のままで、メニューだけを Client Component にしています（3.1節）。
- `usePathname()` を `<Suspense>` の外で使うと、`/tasks/1` のように URL で中身が変わるページで、`Next.js encountered URL data usePathname() in a Client Component outside of <Suspense>` と出ます。前もって作る HTML の時点では、どの URL で開かれるかが分からないからです。待つ間は、印の無いメニュー（`NavLinksFallback`）を出しておきます。
- `/tasks/1` を開くと、「タスク」が太字になります。

### 6.2 手を動かす: 打った文字で探す

`components/SearchBox.tsx` を作ります。

```tsx
'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function search(q: string) {
    const params = new URLSearchParams(searchParams); // 今の ?status= などは残す
    if (q.trim() === '') params.delete('q');
    else params.set('q', q.trim());
    // サーバでページを作り直している間も、入力欄は打てる（トランジション。pending で「探しています」を出す）
    startTransition(() => router.replace(`${pathname}?${params}`));
  }

  return (
    <search>
      <label>
        題名で探す{' '}
        <input type="search" defaultValue={searchParams.get('q') ?? ''} onChange={(e) => search(e.target.value)} />
      </label>
      {pending && <span> 探しています…</span>}
    </search>
  );
}
```

- **`useSearchParams()`**: 今の URL の検索パラメータです（読むだけ）。
- **`useRouter()`**: ページを移る関数を持つものです。`router.replace(URL)` は、履歴を増やさずに URL を変えます（`router.push` は増やす）。URL が変わると、Next.js はサーバに新しいページの中身を頼み、`TaskList` が新しい `q` で作り直されます。
- **`useTransition`**（第42章では扱っていない Hook）: `startTransition` の中で起こした変化は「急がない」ものとして扱われ、その間も入力欄に打てます。`pending` は、終わるまで `true` です。
- 検索は、ブラウザで絞り込むのではなく、URL を変えてサーバに任せています。ブラウザには、絞り込んだ後のタスクだけが届きます。

`/tasks?status=todo` で「本」と打つと、URL が `/tasks?status=todo&q=本` になり、「本を返す」だけになります。

### 6.3 手を動かす: サーバの中身を読み直す

ほかのタブや別の人がタスクを変えても、今開いているページは古いままです。`components/RefreshButton.tsx` を作ります。

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      {pending ? '読み直しています…' : '最新にする'}
    </button>
  );
}
```

`app/tasks/page.tsx` の `<SearchBox />` の `<Suspense>` の下に、`<RefreshButton />` を置きます（import も足します）。

- **`router.refresh()`**: 今のページの Server Component を、サーバでもう一度作り直してもらいます。ページ全体を読み込み直す（ブラウザの再読み込み）のとは違い、Client Component の state（入力欄に打った文字など）は残ります。
- `startTransition` の中で呼ぶと、終わるまで `pending` が `true` になります（6.2節）。

1つ目のターミナルで API を動かしたまま、別のターミナルで次のようにタスクを1つ足し、「最新にする」を押すと、一覧に「ねこにごはん」が増えます。

```sh
$ curl -X POST http://localhost:9500/api/tasks -H 'Content-Type: application/json' -d '{"title":"ねこにごはん"}'
```

- `curl -X POST URL -H '…' -d '…'` は、URL に POST を送るコマンドです（第3部で使いました）。`-H` でヘッダ、`-d` で本文を付けます。

---

## 7. どちらにするか

迷ったら **Server Component** にして、ブラウザでしかできないことが出てきたら、その部分だけを Client Component に切り出します。

| したいこと | 部品 |
| --- | --- |
| API・データベースを読む、秘密の値を使う | Server |
| 読んだデータを並べるだけ | Server |
| `onClick`・`onChange`・`useState`・`useEffect` | Client |
| `usePathname`・`useSearchParams`・`useRouter` | Client |
| `window`・`localStorage`・`EventSource` などブラウザの機能 | Client |
| Context の Provider（第44章 7節） | Client（Provider の部品だけを `'use client'` のファイルにし、レイアウトで `children` を包む） |

---

## 8. 第46章・第8部・Flask と比べる

Flask と Jinja2 では、サーバで HTML を作って返すと、サーバの仕事は終わりでした。ボタンで何かするには、別に JavaScript を書いて、`<script>` で読ませました。サーバの Python とブラウザの JavaScript は、別のプログラムでした。

Next.js では、同じ React の部品の木の中に、サーバで動く部品とブラウザでも動く部品が混ざります。

| | 第46章（自分で作った SSR） | 第8部（Vite + React） | Next.js |
| --- | --- | --- | --- |
| サーバで動く部品 | 全部（`renderToString`） | 無い | Server Component |
| ブラウザで動く部品 | 全部（`hydrateRoot`） | 全部 | Client Component だけ |
| ブラウザに送るデータ | `<script>` に入れた JSON（自分で書く） | API の JSON（`fetch`） | Server Component が作った結果（Next.js が送る。`?_rsc=…` の中身） |
| ブラウザに送る部品のコード | 全部 | 全部 | Client Component だけ |

Server Component が作った結果は、HTML ではなく、**React の部品の木を表したデータ**（React Server Components の形。RSC ペイロードと呼ぶ）で送られます。ページのソースの最後の `<script>` に入っている、`self.__next_f.push(…)` の中身がそれです。ブラウザの React は、これを見て、Client Component の場所にだけ部品をつなぎます。

---

## まとめ

- `app/` の部品は、何も書かなければ Server Component（サーバでだけ動く）。1行目に `'use client'` を書いたファイルの部品は Client Component（サーバで最初の HTML、ブラウザでもう一度）。
- `'use client'` は、ボタンやフォームなど、小さな部品のファイルにだけ付ける。そのファイルが import するものも、ブラウザ用になる。
- Server Component から Client Component へは、送れるもの（文字・数・配列・オブジェクト・`Date`・JSX・Promise）だけを渡す。関数は渡せない。
- Server Component は、`children` として Client Component の中に入れられる。
- サーバだけで使うファイルには `import 'server-only'` を書く。`NEXT_PUBLIC_` で始まらない環境変数は、ブラウザに届かない。
- `fetch`・`params`・`searchParams`・`usePathname`・`useSearchParams` を待つ部品は、`<Suspense>` の中に置く。`<Suspense>` を分けると、できたものから流れる。
- Promise を Client Component に渡し、`use` で待てる。
- 今の URL は `usePathname`・`useSearchParams`、ページを移るのは `useRouter` の `push`・`replace`。Server Component を作り直してもらうのは `router.refresh()`。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Next.js Docs「Server and Client Components」: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Docs「Fetching Data」（Streaming）: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js Docs「use client」: https://nextjs.org/docs/app/api-reference/directives/use-client
- Next.js Docs「Environment Variables」: https://nextjs.org/docs/app/guides/environment-variables
- React Docs「use」: https://react.dev/reference/react/use
- React Docs「useTransition」: https://react.dev/reference/react/useTransition

---

前の章: [第47章 Next.js 入門](../ch47-nextjs-intro/README.md) ／ 第9部の目次: [../README.md](../README.md) ／ 次の章: [第49章 Server Actions と Route Handlers](../ch49-actions-routes/README.md)
