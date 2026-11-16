# 第9部 Next.js

第8部では、ブラウザで動く画面を React で作り、第46章で、サーバで HTML を作る SSR を自分で組み立てました。この部では、その SSR・ページ分け・データの読み書き・キャッシュを、まとめて引き受けてくれるフレームワーク **Next.js** を使います。ファイルの置き場所が URL になるしくみ、サーバでだけ動く部品とブラウザでも動く部品の分け方、フォームからサーバの関数を呼ぶ Server Action、何をいつ作って覚えておくかを学び、成果物で、第8部の画面を Next.js で作り直して比べます。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第47章 Next.js 入門](ch47-nextjs-intro/README.md) | いちばん小さなアプリ、ファイルが URL になる、`layout`・`page`、`Link`、サーバで API を読む、`loading`・`not-found`・`error`、`[id]` と検索パラメータ、`metadata`、`next build` と `next start` | 5〜6時間 |
| [第48章 Server Components と Client Components](ch48-server-client/README.md) | 2つの部品とどこで動くか、`'use client'` の境界、送れる props、`server-only` と環境変数、`<Suspense>` で分けて流す、`use`、`usePathname`・`useSearchParams`・`router.refresh` | 5〜6時間 |
| [第49章 Server Actions と Route Handlers](ch49-actions-routes/README.md) | Route Handler と BFF、`RouteContext`、`'use server'`、`useActionState`・`useFormStatus`、`bind`、`useOptimistic`、Server Action の安全、SSE の中継 | 5〜6時間 |
| [第50章 レンダリングとキャッシュの戦略](ch50-rendering-cache/README.md) | ビルドのとき・リクエストのとき（○ ◐ ƒ）、`connection()`、`'use cache'`、`updateTag`・`revalidateTag`、`cacheLife`、`generateStaticParams`、開発と本番の違い | 4〜5時間 |
| [成果物 タスク管理アプリを Next.js で作り直す](project-task-next/README.md) | 第8部の画面を Next.js で作り直し、Vite + React 版と比べる。サーバで読む一覧・Server Action で作る・直す（412）・消す、SSE の中継、ページ・Server Action・部品のテスト | 8〜12時間 |

## 準備

第9部のサンプルと練習問題は、外部のパッケージ（Next.js・React・Vitest など）を使います。第5〜8部と同じく、**第9部のフォルダを `~/dev/part09` にコピーし、そこで動かします**。第47章の最初に、次を1回だけ実行します。

```sh
$ bash （ここに Finder から part09-nextjs フォルダの中の setup-part09.sh をドラッグ）
```

- `~/dev/part09` が作られ、`npm ci` でパッケージが入ります。終わったら `cd ~/dev/part09/ch47-nextjs-intro` で第47章のフォルダに移ります
- [setup-part09.sh](setup-part09.sh) は、作成先（既定 `~/dev/part09`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（next 16.4.3、react・react-dom 19.3.1、server-only 0.0.1、zod 4.6.7、vitest 4.1.12、jsdom 30.1.3、@testing-library/react 16.3.3、typescript 6.0.3、eslint 10.13.0、@next/eslint-plugin-next 16.4.3、eslint-plugin-react-hooks 7.1.1 など）
- Next.js のアプリの設定のひな形は [tools/](tools/) にあります（`next.config.ts`・`tsconfig.next.json`。第47章 2.1節）。ESLint の設定は [eslint.config.js](eslint.config.js) です（第47章 9.3節）
- Next.js のサーバからつなぐ API は、**第9部の練習用の API**（[api/](api/)）です。第8部と同じもので、`~/dev/part09` で `npm run api` と打つと、`http://127.0.0.1:9500` で動きます（PostgreSQL は要りません）
- 成果物だけは、`~/dev/task-api` の中に `next/` を作って進めます（[project-task-next/README.md](project-task-next/README.md) の1節）

## 各章の使い方

第1〜8部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている。「手を動かす」の節で、ファイルを自分で書いて動かす |
| `samples/` | 「手を動かす」で書くプログラムの完成形（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- 章の「手を動かす」では、章のフォルダの中に `web/` を作り、そこを1つの Next.js のアプリにして育てます（第47章 2節）
- 練習問題は、**Vitest** のテストで確かめます。ページのテストは、テストが練習用の API と Next.js の開発サーバを別のポートで起動し、ページを読んで確かめます（[tools/servers.ts](tools/servers.ts)）。部品のテストは、第8部と同じく jsdom で描きます。模範解答は、`APP=../solutions npx vitest run app.test.ts` や `MODULE=../solutions/components/○○.tsx npx vitest run ○○.test.tsx` のように指定して確かめられます
- サーバは `127.0.0.1`（`localhost`）だけで待ち受けます。ポートは、練習用の API が 9500、章の開発サーバが 9510（第47章）・9520・9530・9540（第50章）、成果物が 9550、成果物の API（第7部）が 9490 です。テストは、それぞれの番号の 6〜8 番台（例: 9516・9517）を使うので、自分で動かしているサーバとぶつかりません
- パスワードなどの値は、`dev-only-…` で始まる、この Mac の中だけで使う開発用の仮のものです。本番では使いません（第12部）
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしています
- Python と比べる説明では、Flask と Jinja2 が、サーバで HTML を作り、フォームを受けて redirect するのを、Next.js がどう引き受けているかを比べます

## 第9部を終えたときにできること

- Next.js のアプリを作り、フォルダとファイルの名前で URL・枠・読み込み中・見つからない・エラーのページを作れる
- Server Component と Client Component を使い分け、`'use client'` の境界と、サーバだけの値を守る方法を説明できる
- `<Suspense>` で、遅い部分を後から流せる
- Server Action でフォームを受け、確かめ・エラー・redirect・楽観的な更新を書ける。Server Action をブラウザから届く入り口として安全に扱える
- Route Handler で、自分の HTTP の入り口（BFF・SSE の中継）を作れる
- ページのどこを前もって作り、どこを毎回作るかを読み取り、`'use cache'` で覚えておくもの・捨てるときを決められる
- 同じ画面を、Vite + React と Next.js で作った違いを説明し、作るものに合わせて選べる

## 第9部で作るもの

- いちばん小さな Next.js のアプリ、`/about`、共通のメニュー、サーバで API を読む一覧、`/tasks/[id]`、絞り込み（第47章）
- 押すと増えるボタン、`children` で中身を入れる部品、サーバだけの関数、分けて流す一覧、今のページが分かるメニュー、検索欄、読み直すボタン（第48章）
- 自分の HTTP の入り口・API を中継する BFF、作るフォーム・消すボタン・楽観的な更新の状態ボタン、SSE の中継（第49章）
- 3つの時刻のページ、覚えておくタスクの数、すぐに捨てる・知らせで捨てる、前もって作るヘルプのページ（第50章）
- タスク管理アプリの Next.js 版（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第8部 フロントエンドと React](../part08-react/README.md) ／ 次: 第10部 認証（準備中）
