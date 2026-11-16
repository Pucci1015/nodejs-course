# 第48章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part09/ch48-server-client/exercises/` で行います。最初に `cd exercises` で移動してください。

このフォルダは、第47章の練習問題と同じく、1つの Next.js のアプリです。問題1〜3・6〜8 は `components/` の部品を、問題5 は `app/` のページを作ります。

| 問題 | 種類 | テーマ | 作るファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 押すと増えるボタン | `components/LikeButton.tsx` | 2 |
| 2 | 基本 | 今のページが分かるリンク | `components/NavLink.tsx` | 6.1 |
| 3 | 基本 | 押すと答えが見える部品 | `components/Spoiler.tsx` | 3.2 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜6 |
| 5 | 応用 | 2つの部分を別々に流すページ | `app/overview/page.tsx` | 5.1・5.2 |
| 6 | 応用 | 状態を選んで URL を変える | `components/StatusFilter.tsx` | 6.2 |
| 7 | 応用 | Promise を use で待つ | `components/TaskTotal.tsx` | 5.3 |
| 8 | 発展 | API の知らせでページを読み直す | `components/LiveRefresh.tsx` | 6.3 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## 用意してあるもの（書き換えません）

| ファイル | 中身 |
| --- | --- |
| [app/layout.tsx](app/layout.tsx)・[app/page.tsx](app/page.tsx)・[app/not-found.tsx](app/not-found.tsx) | 第47章の練習問題と同じ。title の template は `'%s | 練習問題'` |
| [lib/api.ts](lib/api.ts) | 本文4.1節の `lib/api.ts`（`import 'server-only'` 付き） |
| `components/` の6つのファイル | 問題の部品の「形」だけ。中身は `throw new Error('まだ書いていません')` |
| [next.config.ts](next.config.ts)・[tsconfig.json](tsconfig.json) | 第47章と同じ設定 |
| `*.test.tsx` | 問題1〜3・6〜8 のテスト（部品を、ブラウザの代わりの jsdom で描いて確かめる。第8部と同じ） |
| [app.test.ts](app.test.ts) | 問題5 のテスト（API と Next.js を起動して、ページを HTTP で読む。第47章と同じ） |
| [check-use-client.ts](check-use-client.ts) | テストで使う道具（ファイルの1行目が `'use client'` かを確かめる） |

## テストの使い方

```sh
$ npx vitest run LikeButton.test.tsx     # 問題1（ほかの問題も、ファイルの名前を替える）
$ npx vitest run app.test.ts             # 問題5（API をポート 9526、Next.js をポート 9527 で、自分で起動する）
```

- 最初は、部品が `まだ書いていません` のエラーを投げるので、すべて失敗します。すべて成功すれば完成です。
- 問題1〜3・6〜8 のテストは、ファイルの1行目が `'use client';` かも確かめます。
- 問題2・6・8 のテストは、`next/navigation` の `usePathname`・`useSearchParams`・`useRouter` を、テストの中で偽物に替えています（`vi.mock`）。ブラウザも Next.js も無いところで、「今の URL」や「`router.replace` が呼ばれたか」を決めたり調べたりするためです。
- 模範解答は、`MODULE=../solutions/components/LikeButton.tsx npx vitest run LikeButton.test.tsx`、問題5は `APP=../solutions npx vitest run app.test.ts` で確かめられます。
- 自分の目でも確かめるときは、部品を `app/page.tsx` 以外の、自分で作ったページ（例えば `app/try/page.tsx`）に置いて、`npx next dev -p 9520` で開きます（`npm run api` も動かしておく）。
- `npx tsc` も通してください。

---

## 基本

### 問題1 押すと増えるボタン

`components/LikeButton.tsx` に、`LikeButton` という部品を書いてください（本文2節）。

- 最初は「いいね 0」という文字のボタン（`<button type="button">`）で、押すたびに「いいね 1」「いいね 2」…と増えます。
- `useState` を使うので、Client Component にします。

### 問題2 今のページが分かるリンク

`components/NavLink.tsx` に、`NavLink` という部品を書いてください（本文6.1節）。`<NavLink href="/about">このアプリについて</NavLink>` のように使います。

- `next/link` の `Link` で、`href` へのリンクを作り、`children` を中に入れます。
- 今のページなら、リンクに `aria-current="page"` を付けます。今のページでなければ、`aria-current` を付けません（`undefined` を渡す）。
- 「今のページ」は、URL のパス（`usePathname()`）が `href` と同じか、`href` の下の階層（`href` が `/tasks` なら `/tasks/3` も）のときです。ただし `/tasks-old` は `/tasks` の下ではありません。また、`href` が `/` のリンクは、パスがちょうど `/` のときだけ今のページです。

### 問題3 押すと答えが見える部品

`components/Spoiler.tsx` に、`Spoiler` という部品を書いてください（本文3.2節）。`<Spoiler><p>答えは 42</p></Spoiler>` のように使います。

- 「答えを見る」という文字のボタンと、`children` を入れた `<div>` を出します。最初は `<div>` に `hidden` を付けて隠します。
- ボタンを押すと答えが見え、ボタンの文字は「答えを隠す」になります。もう一度押すと、元に戻ります。
- ボタンには、開いているかを表す `aria-expanded` と、答えの `<div>` の `id` を指す `aria-controls` を付けます。`id` は、同じ部品を2つ置いてもぶつからないように作ります。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の問いに答えてください。

## 応用

### 問題5 2つの部分を別々に流すページ

`/overview` のページ（`app/overview/page.tsx`）を作ってください（本文5.1・5.2節）。

- title は「概要 | 練習問題」、見出し（`<h1>`）は「概要」です。見出しは、API を待たずに出します。
- 見出しの下に、2つの部分を置きます。それぞれを、別々の `<Suspense>` に入れます。
  1. 作業中のタスクの題名を `<ul>` と `<li>` で並べる部分。待つ間の `fallback` は `<p>作業中のタスクを読んでいます…</p>`
  2. 未着手のタスクの数を `<p>未着手: 4 件</p>` の形で出す部分。待つ間の `fallback` は `<p>未着手を数えています…</p>`
- `lib/api.ts` の `listTasks({ status: 'doing' })` のように、状態で絞って読めます。
- テストの API には、例のタスクが5つ入っています（1 牛乳を買う・2 第9部を読む（作業中）・3 部屋の掃除・4 レポートを出す・5 本を返す）。
- テストは、最初に送られる HTML に、2つの `fallback` の文が入っていることも確かめます（`<Suspense>` を使わずに、ページ全体で `await` すると、入りません）。

### 問題6 状態を選んで URL を変える

`components/StatusFilter.tsx` に、`StatusFilter` という部品を書いてください（本文6.2節）。

- 「状態」という文字の `<label>` の中に、`<select>` を置きます。選択肢は、順に「すべて」（値 `''`）・「未着手」（`todo`）・「作業中」（`doing`）・「完了」（`done`）です。
- 最初に選ばれているのは、今の URL の `?status=` の値です（無ければ「すべて」）。`useSearchParams()` で読みます。
- 選ぶと、`router.replace` で、今のパスの `?status=` を選んだ値に変えます（`/tasks` で「完了」を選ぶと `/tasks?status=done`）。
- `?q=本` など、ほかのパラメータは残します。「すべて」を選ぶと、`?status=` を消します（`/tasks?status=todo` で選ぶと `/tasks`）。

### 問題7 Promise を use で待つ

`components/TaskTotal.tsx` に、`TaskTotal` という部品を書いてください（本文5.3節）。

- props の `total` は、数を返す Promise です。`use` で待って、`<p>タスクの数: 7</p>` の形で出します。
- 待っている間は、外の `<Suspense>` の `fallback` が出ます（部品の側では何もしなくてよい）。
- できたら、問題5の `/overview` に、`<Suspense>` に包んだ `<TaskTotal total={listTasks().then((p) => p.items.length)} />` を足して、ブラウザでも確かめてみましょう（テストはしません）。

## 発展

### 問題8 API の知らせでページを読み直す

`components/LiveRefresh.tsx` に、`LiveRefresh` という部品を書いてください（本文6.3節、第39章 7.1節の `EventSource`、第42章の `useEffect` の後片付け）。`<LiveRefresh url="http://localhost:9500/api/events" />` のように使います。

- 画面には何も出しません（`null` を返す）。
- 画面に出たら、`url` に `EventSource` でつなぎます。
- `task.created`・`task.updated`・`task.deleted` の知らせを受けるたびに、`router.refresh()` を呼んで、ページの Server Component を作り直してもらいます。ほかの知らせ（`shutdown` など）では呼びません。
- 画面から消えたら、つながりを閉じます。StrictMode でも、開いたままのつながりが1つだけになるようにします。
- できたら、本文の `web` の `/tasks` に置き、`curl` でタスクを足すと（本文6.3節）、ボタンを押さなくても一覧が増えることを確かめてみましょう（テストはしません）。
  - このときは、API を `CORS_ORIGINS=http://localhost:9520 npm run api` で動かします。`EventSource` はブラウザから API（ポート 9500）に直接つなぐので、`localhost:9520` のページからつなぐことを API に許してもらう必要があります（第2部 第9章の CORS）。第49章では、Next.js の側に中継の入り口を作り、CORS 無しでつなぎます。
