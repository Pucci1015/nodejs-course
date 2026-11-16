# 第8部 フロントエンドと React

第7部までで、タスク管理 API を TypeScript で作りました。でも、使えるのは `curl` やテストからだけです。この部では、**ブラウザで動く画面**を作ります。まず React を使わずに、DOM と `fetch` だけで API とつなぎ、画面を作る苦労を知ります。次に Vite でビルドのしくみを学び、React のコンポーネント・state・Hooks、TanStack Query でのデータの読み書き、React Router でのページ分け、CSS とアクセシビリティ、サーバで HTML を作る SSR までを学び、成果物で API を使う画面を作ります。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第39章 素の JavaScript で API とつなぐ](ch39-vanilla-api/README.md) | DOM の木、`textContent` と XSS、`fetch` と problem+json、CORS、読み込みの状態、フォーム、`If-Match`、SSE | 5〜6時間 |
| [第40章 ビルドツール](ch40-build-tools/README.md) | なぜビルドするのか、Vite と HMR、CSS・JSON の import、`import.meta.env`、プロキシ、Vite は型を確かめない、ビルドとハッシュ、プラグイン | 4〜5時間 |
| [第41章 React の基礎](ch41-react-basics/README.md) | JSX、コンポーネントと props、`map` と `key`、条件で出し分ける、`useState` とイベント、制御されたフォーム、state を持ち上げる | 5〜6時間 |
| [第42章 Hooks と再描画の仕組み](ch42-hooks/README.md) | 描画とは関数を呼ぶこと、state はスナップショット、`useEffect` と後片付け、StrictMode、`useEffect` が要らない場面、`useRef`、`useMemo`、カスタムフック、`useReducer` | 5〜6時間 |
| [第43章 データ取得とフォーム](ch43-data-forms/README.md) | `useEffect` で読む難しさ、TanStack Query、`useMutation` と楽観的な更新、Zod で確かめるフォーム、422 を項目ごとに、412、SSE で読み直す | 6〜7時間 |
| [第44章 ルーティングと状態の設計](ch44-routing-state/README.md) | SPA と React Router、共通の枠と `<Outlet />`、`useParams`、条件を URL に置く、`Link`・`NavLink`・`useNavigate`、state をどこに置くか、Context | 5〜6時間 |
| [第45章 スタイリングとアクセシビリティ](ch45-styling-a11y/README.md) | 全体の CSS・CSS Modules・Tailwind CSS、CSS 変数のテーマ、意味のある HTML、名前・フォーカス・コントラスト、フォーム、画面の変化を知らせる、ダイアログ、キーボード | 5〜6時間 |
| [第46章 フルスタックフレームワークの考え方](ch46-fullstack/README.md) | CSR・SSR・SSG、SSR を自分で作る、ハイドレーション、`<script>` に入れるときのエスケープ、日付とタイムゾーン、本当の 404、ストリーミング、Next.js へ | 4〜5時間 |
| [成果物 タスク管理アプリの画面](project-task-web/README.md) | 第7部の API を使う画面を、React + TypeScript で作る。一覧（もっと読む・URL の条件）・作る・直す（412）・消す、アクセシビリティ、画面全体のテスト | 8〜12時間 |

## 準備

第8部のサンプルと練習問題は、外部のパッケージ（React・Vite・Vitest など）を使います。第5〜7部と同じく、**第8部のフォルダを `~/dev/part08` にコピーし、そこで動かします**。第39章の最初に、次を1回だけ実行します。

```sh
$ bash （ここに Finder から part08-react フォルダの中の setup-part08.sh をドラッグ）
```

- `~/dev/part08` が作られ、`npm ci` でパッケージが入ります。終わったら `cd ~/dev/part08/ch39-vanilla-api` で第39章のフォルダに移ります
- [setup-part08.sh](setup-part08.sh) は、作成先（既定 `~/dev/part08`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（react・react-dom 19.3.1、vite 8.3.5、@vitejs/plugin-react 6.1.2、vitest 4.1.12、jsdom 30.1.3、@testing-library/react 16.3.3、@tanstack/react-query 5.105.0、react-router 8.5.1、tailwindcss 4.3.3、zod 4.6.7、typescript 6.0.3、eslint 10.13.0、eslint-plugin-react-hooks 7.1.1 など）
- 型の設定は、部の直下の [tsconfig.base.json](tsconfig.base.json) にまとめています。第7部との違いは、ブラウザの型（`DOM`）と JSX を使うことです（第40章 6節）。ESLint の設定は [eslint.config.js](eslint.config.js) です（第42章 3.5節）
- 画面からつなぐ API は、**第8部の練習用の API**（[api/](api/)）です。第7部の成果物と同じ API を、データベースなしで動かします。`~/dev/part08` で `npm run api` と打つと、`http://127.0.0.1:9500` で動きます（PostgreSQL は要りません）
- 成果物だけは、第7部までで作った `~/dev/task-api` の中に `web/` を作って進めます（[project-task-web/README.md](project-task-web/README.md) の1節）

## 各章の使い方

第1〜7部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている。「手を動かす」の節で、ファイルを自分で書いて動かす |
| `samples/` | 「手を動かす」で書くプログラムの完成形（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- 練習問題の多くは、**Vitest** のテスト（`npx vitest run ○○.test.ts`）で確かめます（使い方は第39章の練習問題、部品のテストは第41章 8節）。テストは jsdom という「ブラウザのまね」の中で部品を描き、ボタンを押したり文字を打ったりして確かめます。最初はほとんど失敗し、すべて成功すれば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` のように、`MODULE` に模範解答のファイルを指定して確かめられます
- 画面は `npx vite` で開発サーバを動かし、ブラウザで `http://localhost:5173/` を開いて確かめます（第40章）。第39章だけは、Vite を使わずに [tools/serve.ts](tools/serve.ts) で開きます
- サーバは `127.0.0.1`（`localhost`）だけで待ち受けます。ポートは、画面が 5173（`vite preview` は 4173）、練習用の API が 9500、成果物の API（第7部）が 9490 です
- パスワードなどの値は、`dev-only-…` で始まる、この Mac の中だけで使う開発用の仮のものです。本番では使いません（第12部）
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしています
- Python と比べる説明では、まず Flask（Jinja2 のテンプレート）が、サーバで HTML を作って何をしてくれていたのかを説明してから、ブラウザで画面を作る React と比べます

## 第8部を終えたときにできること

- DOM と `fetch` だけで API とつなぎ、利用者が入れた文字を安全に画面に出せる。CORS とプロキシの違いを説明できる
- Vite で開発し、ビルドしたファイルを作れる。ビルドツールが何をしているかを説明できる
- React のコンポーネントを props・state・Hooks で書き、「いつ描き直されるか」を説明できる。`useEffect` が要る場面と要らない場面を区別できる
- TanStack Query で API を読み書きし、楽観的な更新・412・422・SSE を画面で扱える
- URL とページを対応させ、絞り込みの条件を URL に置ける。state をどこに置くかを決められる
- キーボードとスクリーンリーダーでも使える画面を作り、DevTools で確かめられる
- SSR・ハイドレーションのしくみを説明でき、Next.js（第9部）が何を引き受けてくれるのかが分かる

## 第8部で作るもの

- DOM と `fetch` で作るタスクの一覧・フォーム・3つの状態・状態の置き場所・SSE（第39章）
- Vite の開発サーバの設定、API の URL を組み立てる関数、型の付いた要素を作る関数、ビルドの情報を入れるプラグイン、第39章の画面の TypeScript 版（第40章）
- タスクのカード・一覧・絞り込みのボタン・フォーム、追加・完了・削除ができる一覧、並べ替えられる表（第41章）
- 得点と履歴、タブの題名を変えるフック、ストップウォッチ、localStorage に保存される state、`useReducer` のタスクアプリ、少し待ってから絞り込む検索欄（第42章）
- 読み込みの状態ごとの一覧、`useEffect` で読むフック、TanStack Query で読む・作るフック、確かめて送るフォーム、楽観的な更新（第43章）
- URL の条件・今のページが分かるメニュー・`:id` のページ・ページ送り・対応表・Context（第44章）
- CSS Modules と Tailwind CSS のカード、ラベルの付いたフォーム、知らせる場所、確かめのダイアログ、タブ（第45章）
- 自分で作る SSR のサーバ、ハイドレーション、ストリーミング（第46章）
- タスク管理アプリの画面（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第7部 TypeScript](../part07-typescript/README.md) ／ 次: [第9部 Next.js](../part09-nextjs/README.md)
