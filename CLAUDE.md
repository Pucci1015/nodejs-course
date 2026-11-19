# CLAUDE.md — この教材を作成・編集するときの決まり

このファイルは、Claude（AI）がこの教材の続きを作ったり、既存の章を直したりするときに最初に読むためのものです。人が読んでも構成の説明として使えます。
新しい部を作るときは、**第1部（`part01-mac-dev-env/`）を見本**にして、同じ構成・同じ書き方にそろえてください。

## 1. 教材の目的と学習者

- 目的: Node.js で Web アプリを設計・実装・テスト・公開できるようになる。あわせて、フレームワークが隠している Web の仕組みを自分の言葉で説明できるようになる。
- 学習者: HTML / CSS / JavaScript の基本は学習済み。**Flask での開発経験がある**（Python の概念と対比すると理解が早い）。Mac（**Apple Silicon**）で開発する。
  - ただし **Flask も100%理解しているわけではない**（学習者の指定、2026-11-04）。Flask と対比するときは、Flask の側の仕組みも短く説明してから比べる（「Flask の `request.form` は、裏で〇〇をしている」のように）。Flask の内部（WSGI、Werkzeug、`app.run()` の開発サーバ、`session` の署名など）を知っている前提で書かない。
- 学習者の希望:
  - 寄り道してでも、長く使える深い知識を身につけたい（ツールの使い方だけで終わらせない）
  - HTTP などの Web の基礎も飛ばさない
  - 必要なら React や TypeScript も扱う
  - 簡単すぎる練習問題は不要。ただし「難しく」という意味ではない。基本から順に聞く（2026-11-07）
  - **コマンドの知識は `cd`・`ls` 程度**。オプションはほとんど知らない（2026-11-07）
  - **長い説明を読むのは飽きてしまう。手を動かしながら身につけたい**（2026-11-09）。本文は短い説明と「手を動かす」の繰り返しにし、練習問題は**書く問題**を中心にする
  - 後で読み返しても分かる内容にする（「既に入っているはず」の道具も、インストール手順から書く）

## 2. フォルダ構成

```
nodejs/                        ← 教材のルート（このファイルがある場所）
├── CLAUDE.md                  ← このファイル
├── README.md                  ← 教材全体の目次と使い方（部の状態 ✅ を更新する）
├── part01-mac-dev-env/        ← 部のフォルダ（partNN-英語の短い名前）
│   ├── README.md              ← 部の概要、章の一覧、使い方、終えたときにできること
│   ├── ch01-terminal-zsh/     ← 章のフォルダ（chNN-英語の短い名前。NN は教材全体の通し番号）
│   │   ├── README.md          ← 本文
│   │   ├── samples/           ← 本文で使うサンプル（README.md で一覧と動かし方を説明）
│   │   ├── exercises/         ← 練習問題（README.md）と問題で使うファイル
│   │   └── solutions/         ← 模範解答（README.md）と解答のファイル
│   ├── ch02-.../
│   └── project-dotfiles/      ← 部の成果物（README.md に要件、solutions/ に完成例）
└── part02-web-basics/ ...
```

### 決まり

- **章ごとに1つのフォルダ**にする。章の中の節（1, 2, 3, …）でフォルダを分けない。節は本文 `README.md` の中の番号付きの見出し（`## 1. ...`）にする。（学習者の指定）
- **すべてのフォルダに `README.md`** を置き、そのフォルダの中身を説明する。（学習者の指定）
- 章の番号 `chNN` は部をまたいだ**通し番号**（第2部は ch05 から）。目次（5節）の番号と一致させる。
- 部の成果物は `project-xxx/` フォルダにする。
- 第5部〜第12部は同じタスク管理アプリを育てる。各部の成果物フォルダに「その部の終わりの時点のアプリ」を置き、前の部の成果物を出発点にする。

### 実習の場所（学習者の指定、2026-11-09。徹底する）

- **実習はすべて `~/dev/` の下で行う。** 教材のフォルダ（`~/Documents/nodejs-course`。以前は OneDrive 上の `nodejs/`）は「見本」として残すので、学習者に、そこでファイルを作らせたり、そこでコマンドを実行させたりしない（`cd` で教材のフォルダに入って `node samples/...` を動かす、も避ける）。
- 各章の最初（「読み方」の囲みの中）に、その章の作業フォルダ `~/dev/chNN/` を作り、教材の `samples/`・`exercises/` をそこへコピーする手順を書く。以降のコマンドは、すべて `~/dev/chNN/` で実行する前提で書く。

  ```sh
  $ mkdir -p ~/dev/ch06 && cd ~/dev/ch06
  $ cp -R "（教材のフォルダ）/part02-web-basics/ch06-http-by-hand/samples" "（教材のフォルダ）/part02-web-basics/ch06-http-by-hand/exercises" .
  ```

  教材のフォルダのパスは長く空白や日本語を含むので、「`cp -R ` まで打ってから、Finder から `samples` と `exercises` のフォルダをターミナルにドラッグし、最後に ` .` を打つ」と説明する。
- 学習者が書くファイルも `~/dev/chNN/` に置く。模範解答（`solutions/`）は見比べるためのもので、動かすときは同じように `~/dev/chNN/` にコピーしてから動かす。
- 練習用のファイルを作るスクリプトは、作成先の既定を `~/dev/...` にする（4節）。
- **第3部以降は、部のフォルダを丸ごと `~/dev/partNN/` にコピーする**（2026-11-09 決定）。章の練習問題やサンプルが、前の章の模範解答（例: 第4部の `../../ch17-minimal-server/solutions/app.mjs`）を `import` するので、章ごとのコピーでは相対パスが壊れるため。部の最初の章の「読み方」に `cp -R （Finder から partNN-xxx をドラッグ） ~/dev/partNN` を書き、2回目は打たないよう注意する。各章の「読み方」では `cd ~/dev/partNN/chNN-xxx` から始める。第5部は従来どおり `setup-part05.sh` が `~/dev/part05` にコピーする。
- 部をまたぐ参照（別の部のファイルを読む・`import` する）は作らない。必要なファイルはその部の中にコピーする（例: 第1部のアクセスログ → 第3部 第11章 `exercises/access.log`）。
- 教材のフォルダは、2026-11-09 から Mac の `~/Documents/nodejs-course`（Git のリポジトリ、`main` ブランチ）。

## 3. 本文（章の README.md）の書き方

### 構成

1. `# 第N章 タイトル`
2. 導入（この章で何を学び、なぜ大事か。2〜4文）
3. 表: 所要時間の目安 / 前提 / この章のゴール
4. 表: フォルダの中身（samples / exercises / solutions へのリンク）
5. 「読み方」の囲み（`>` の引用。作業フォルダ `~/dev/chNN/` の作り方とコピーの手順、どこは飛ばしてよいか）と、`## この章で学ぶことを、後でどこで使うか` の表（学習者の指定、2026-11-07。見本は第1部の各章）
6. `---` の後に、番号付きの節 `## 1. ...`、`## 2. ...`（小節は `### 2.1 ...`）
7. `## まとめ`（箇条書き5〜7項目）
8. `## 練習問題`（exercises/README.md へのリンクと問題数）
9. `## 参考資料`（一次情報: 公式ドキュメント、MDN、RFC など）
10. 前後の章へのリンク

### 手を動かして学ぶ形（学習者の指定、2026-11-09。見本は第5章）

- 節は「短い説明（数行）→ **`### N.M 手を動かす: ...`**（打って動かし、出力を見る）→ 表で1行ずつ意味を確かめる」の繰り返しにする。長い説明の段落を続けない。
- 練習問題で使う書き方（Node.js の API、JavaScript の書き方、コマンドとオプション）は、**必ず本文の「手を動かす」で一度、自分で書かせる**。書いたコードの完成形は `samples/` に置き、「うまく動かないときは比べる」と書く。
- 本文の「手を動かす」のコードは短く（10〜20行）。少しずつ書き足していく形にする。
- 動かして結果を見るだけのサンプル（中身は第3部以降で学ぶ書き方を使っているもの）は、「中身は読まなくてよい」と書く。
- 学習者は JavaScript の基本（変数、関数、アロー関数、配列、`for`、`if`、テンプレート文字列。第4章8.1節）を知っている。Node.js の API、`await`、`try` / `catch`、イベント（`.on`）などは、第3部より前の章では、使う所で短く説明する。

### 文体と表記

- 日本語、**です・ます調**。
- **個人の名前・メールアドレス・パスを使わない**（ほかの人も使う教材のため。学習者の指定、2026-11-07）。ユーザー名の例は `alice`（2人目は `bob`）、ホームは `/Users/alice`。教材の置き場所は人によって違うので、決まったパスを書かず「教材のフォルダ」と書く。
- 「なぜそうするのか」を必ず書く。コマンドを並べるだけにしない。
- Flask / Python との対比が理解を助ける場面では、積極的に書く（例: venv と node_modules、WSGI とイベントループ）。**Flask の側も「何をしているか」を1〜2文で説明してから比べる**（学習者は Flask も完全には理解していないため。1節）。対比が理解の助けにならないなら、無理に書かない。
- ターミナルに入力するコマンドは、コードブロックの中で `$ ` を付けて書く。出力は `$` を付けずに続ける。説明は `#` コメントで右に書く。
- Mac のキーは `⌘`、`⌥`、`Ctrl`、`Shift`、`Return` と書く。
- 用語は初出で太字にし、英語や略語を括弧で添える（例: **標準エラー出力**（stderr））。
- 表を積極的に使う（コマンドの一覧、比較、症状と原因）。
- 内容が古くなりやすいもの（Node.js の LTS のバージョン、インストールコマンド、ツールの既定の設定）は、断定せずに「執筆時点では」「必ず公式で確認」と書き、公式の URL を添える。
- 後の部で詳しく扱う話題は「（第N部で学びます）」と予告して深入りしない。前の章の内容を使うときは「（第1章8節）」のように参照する。
- **コマンドとオプションは、初めて出るところで1つずつ意味を書く**（学習者は `cd`・`ls` 程度しか知らない。学習者の指定、2026-11-07）。例: `curl -fsSL` なら `-f`・`-s`・`-S`・`-L` をそれぞれ説明する。
- 危険な操作（`rm -rf`、`sudo`、`git push --force`、秘密情報の扱い）には、必ず注意と安全な代替を書く。

### 練習問題（exercises/README.md）

- **書く問題を中心にする**（学習者の指定、2026-11-09）。基本は「本文の『手を動かす』で書いたコードを少し変える・広げる」、応用は「本文の書き方を組み合わせて小さな道具を作る」、発展は「長めのプログラム」。調べて答えるだけの問題（コマンドの出力を読む、設計を考える）は、各章に1〜3問まで。
- 最初に、問題・テーマ・使うファイル・本文の節の対応表を置く。
- **基本 → 応用 → 発展の順に並べる**（学習者の指定、2026-11-07）。見本は第1章の練習問題。
  - 基本: 本文の例を少し変えて動かす、結果を予想してから確かめる、本文の表を使って読み解く。本文を読んだ人が、迷わず手を動かせるもの。
  - 応用: 本文で学んだことを2つ以上組み合わせる（直す・作る・説明する）。
  - 発展: 長めのスクリプトや、本文の説明を深く読まないと解けないもの。「できなくても次の章に進んでよい」と書く。
  - 「`cd` で移動するだけ」のような、考えることの無い問題は入れない。ただし「簡単すぎない」は「難しく」という意味ではない（学習者の指定）。
- **本文で説明していないコマンド・オプション・書き方を、練習問題で使わせない**（学習者の指定、2026-11-07。例: 本文で awk を表の1行でしか紹介していないのに、集計の問題を出した）。要るなら本文に説明を足すか、問題から外す。模範解答も、本文で説明した書き方だけで書く（別解として紹介するのはよい）。
- 1章の問題数は、基本を中心に 8〜12問程度（基本の問題は短くてよい）。
- スクリプトを書く問題は、要件を箇条書きにし、確認用のコマンドと期待する出力（終了ステータスを含む）を書く。
- 練習用のファイルやリポジトリは、スクリプトで**何度でも作り直せる**ようにする（下の「サンプルとスクリプトの決まり」）。

### 模範解答（solutions/README.md）

- 問題ごとに、コマンド・コード・実行結果と、**「なぜそうなるか」「どこでつまずきやすいか」**の解説を書く。
- 解答のコードは、solutions/ に実際に動くファイルとして置き、修正した箇所には `// 修正: ...` のコメントを付ける。
- 別解があれば触れる。

## 4. サンプルとスクリプトの決まり

- **シェルスクリプトは bash** で書き、`#!/usr/bin/env bash` と `set -euo pipefail` を基本にする（診断スクリプトなど、失敗を扱うものは理由をコメントに書いて `-e` を外す）。**macOS 標準の bash 3.2 で動くこと**（連想配列 `declare -A`、`${var,,}`、`mapfile` などは使わない）。
- **Node.js のコードは ES Modules**（`.mjs`、または `package.json` に `"type": "module"`）で書き、組み込みモジュールは `node:fs/promises` のように `node:` を付ける。第6部までは JavaScript、第7部以降は TypeScript（`.ts`。第7部の節を参照）。
- 外部パッケージは、その部で扱うまで使わない（第1部・第2部は標準機能のみ）。
- 練習用のフォルダやリポジトリを作るスクリプトは:
  - 作成先を第1引数で受け取り、既定は `~/dev/...` にする
  - **作成先が既にあれば何もせずに終了する**（上書き・削除をしない）
  - Git のリポジトリを作る場合は、`user.name` / `user.email` / `commit.gpgsign false` をそのリポジトリだけに設定し、`GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` で日時を固定して、**誰が作っても同じコミットID になる**ようにする（本文や解答にコミットID を書けるようにするため）
- サーバを起動するサンプルは `127.0.0.1` で待ち受ける。
- Linux の GNU 版と macOS の BSD 版で動きが違うコマンド（`sed -i`、`date -d`、`stat`、`readlink -f` など）は使わないか、違いを説明する。
- コードのコメントも日本語で書く。

## 5. 全体の目次（全13部・70章）

2026-11-05 に第9部（Next.js）と第53・63・64・65章を追加し、第9部以降の部と第47章以降の章を振り直した（旧→新: 部 9→10, 10→11, 11→12, 12→13 / 章 47→51, 48→52, 49→54, 50→55, 51〜57→56〜62, 58→66, 59〜62→67〜70）。作成済みの第1〜4部の本文の予告番号も新しい番号に直してある。

元の目次案（Claude Docs）: https://claude.ai/artifact/KNE52emxZUF8WdsJWYqPEc

| 部 | フォルダ名の案 | 章 | 主な内容 | 成果物 |
| --- | --- | --- | --- | --- |
| 1 Mac の開発環境と道具 | `part01-mac-dev-env` ✅ | 1 ターミナルと zsh の基本 / 2 Homebrew と Node.js のインストール / 3 Git と GitHub / 4 エディタとデバッガ | ファイル操作・パイプ・権限・PATH・`.zshrc`、Homebrew と Apple Silicon、mise と LTS、コミット・ブランチ・マージ・PR・SSH 鍵・`.gitignore`、VS Code、Node.js インスペクタ、DevTools | dotfiles を GitHub で管理 |
| 2 Web の基礎 | `part02-web-basics` ✅ | 5 インターネットの仕組み / 6 HTTP を手で話す / 7 HTTP の詳細 / 8 HTTPS と TLS / 9 ブラウザの仕組み / 10 Web アプリの構成パターン | IP・TCP/UDP・ポート、DNS（`dig`）、`curl -v` と `nc`、メソッド・ステータス・ヘッダ・ボディ、Cookie・リダイレクト・キャッシュ（Cache-Control、ETag）、Content-Type と文字コード、HTTP/1.1・2・3、公開鍵暗号と証明書、mkcert、URL 入力から表示まで、同一オリジンポリシーと CORS、MPA/SPA・SSR/CSR・REST、Flask アプリの説明し直し | 実在のサイトを `dig` と `curl` で調べた図解レポート |
| 3 モダン JavaScript と Node.js の基礎 | `part03-js-node-basics` ✅ | 11 JavaScript 再入門 / 12 非同期処理 / 13 イベントループ / 14 モジュールとパッケージ管理 / 15 Node.js の標準 API / 16 CLI ツールを作る | スコープ・クロージャ・`this`・クラス・分割代入・配列メソッド、コールバック→Promise→async/await、エラー処理と `Promise.all`、シングルスレッドとノンブロッキング I/O・libuv・Flask（WSGI）との比較、ESM と CommonJS、npm・`package.json`・semver・ロックファイル、`fs/promises`・`path`・`process`・`events`、Buffer と Stream、引数・標準入出力・終了コード | メモを Markdown で管理する CLI |
| 4 フレームワークなしで Web サーバを作る | `part04-raw-http-server` ✅ | 17 `node:http` で最小のサーバ / 18 ルーティングを自作する / 19 静的ファイル配信 / 20 フォームと JSON を受け取る / 21 HTML を生成する / 22 Cookie とセッションを自作する | リクエストとレスポンス、ストリームとしてのリクエスト、URL とクエリの解析、パスパラメータ、MIME・キャッシュヘッダ・パストラバーサル対策、ボディの読み取り・urlencoded と multipart、テンプレートとエスケープ・XSS、セッション ID の生成と保存 | フレームワークなしの簡易掲示板 |
| 5 Express とサーバサイドの設計 | `part05-express` ✅ | 23 Express 入門 / 24 ミドルウェア / 25 REST API の設計 / 26 アプリケーションの構成 / 27 リアルタイム通信 / 28 他のフレームワークの地図 | 第4部の自作コードと Flask との対応、処理の連鎖とエラーハンドリング、リソースと URL・ステータスコード・ページネーション・入力バリデーション、レイヤー分け・設定と環境変数・ロギング、ポーリング・SSE・WebSocket、Fastify・Hono・Next.js | タスク管理 REST API（メモリ保存） |
| 6 データベース | `part06-database` ✅ | 29 リレーショナル DB と SQL / 30 SQL の実践 / 31 Node.js から DB を使う / 32 Docker と PostgreSQL / 33 ORM とマイグレーション / 34 キャッシュと Redis 入門 | SQLite、テーブル設計と正規化、JOIN・集計・インデックス・トランザクション、プレースホルダと SQL インジェクション対策・コネクションプール、Docker Desktop / OrbStack・Compose、Prisma または Drizzle、キーバリューストア・セッション保存 | タスク管理 API を PostgreSQL で永続化 |
| 7 TypeScript | `part07-typescript` ✅ | 35 TypeScript の基礎 / 36 型の表現力 / 37 Node.js プロジェクトでの TypeScript / 38 型と実行時の境界 | 型注釈と推論・`tsc`・`tsconfig.json`、ユニオンと絞り込み・ジェネリクス・ユーティリティ型、実行方法（Node.js の型除去機能、tsx、ビルド）と ESM、外部入力は型で守れない・Zod | タスク管理 API を TypeScript に移行 |
| 8 フロントエンドと React | `part08-react` ✅ | 39 素の JavaScript で API とつなぐ / 40 ビルドツール / 41 React の基礎 / 42 Hooks と再描画の仕組み / 43 データ取得とフォーム / 44 ルーティングと状態の設計 / 45 スタイリングとアクセシビリティ / 46 フルスタックフレームワーク | `fetch` と DOM・画面とデータのずれ、バンドル・Vite、コンポーネント・JSX・props・state、`useState`・`useEffect`・カスタムフック、ローディングとエラー・TanStack Query・バリデーション、React Router・状態の置き場所、CSS Modules・Tailwind・キーボード操作とセマンティック HTML、SSR とハイドレーション・Server Components・Next.js | タスク管理アプリの画面（React + TS） |
| 9 Next.js | `part09-nextjs` ✅ | 47 Next.js 入門 / 48 Server Components と Client Components / 49 Server Actions と Route Handlers / 50 レンダリングとキャッシュの戦略 | App Router とファイルによるルーティング・Vite の React アプリとの違い、コードがサーバとブラウザのどちらで動くか・サーバ側のデータ取得、フォーム送信の受け方・Express API との役割分担、静的生成・動的レンダリング・再検証（デプロイは第12部）。第10部以降は Express + React 版を主に進め、Next.js での書き方を各章で補足する | タスク管理アプリを Next.js で作り直し、Express + React 版と比べる |
| 10 認証とセキュリティ | `part10-auth-security` ✅ | 51 認証の基礎 / 52 セッションとトークン / 53 メール送信と本人確認 / 54 OAuth 2.0 と OpenID Connect / 55 Web セキュリティの総点検 | ハッシュ化（bcrypt / Argon2）・認証と認可、Cookie セッションと JWT・`HttpOnly`・`Secure`・`SameSite`、SMTP・SPF・DKIM・メール送信サービス・登録確認とパスワードリセット・Mailpit、GitHub ログイン、XSS・CSRF・SQL インジェクション・CSP・OWASP Top 10、依存パッケージの脆弱性とサプライチェーン。**攻撃の再現は自分のローカル環境に限る** | ユーザー登録・メール確認・ログイン |
| 11 テストとコード品質 | `part11-testing` ✅ | 56 テストの考え方 / 57 API とデータベースのテスト / 58 フロントエンドのテスト / 59 静的解析と CI | 単体・結合・E2E、`node:test` と Vitest、HTTP レベルのテスト・テスト用 DB、Testing Library・Playwright、ESLint とフォーマッタ・GitHub Actions | テストと CI が整ったアプリ |
| 12 デプロイと運用 | `part12-deploy` ✅ | 60 本番環境の考え方 / 61 Docker でコンテナ化 / 62 クラウドへのデプロイ / 63 ファイルの保存 / 64 バックグラウンドジョブ / 65 CDN とキャッシュ / 66 監視とパフォーマンス | 開発と本番・ビルド・プロセス管理・シークレット、Dockerfile・マルチステージ・Apple Silicon と CPU アーキテクチャ、PaaS（Render、Fly.io など）・マネージド DB・独自ドメインと HTTPS、オブジェクトストレージ（S3 互換）・署名付き URL・MinIO、キュー（BullMQ + Redis）・定期実行・再試行と冪等性、CDN の仕組み・`Cache-Control` の設計・キャッシュの消し方、ログとエラー監視・計測してから改善・複数プロセスとロードバランサ | 画像添付・メール通知つきで独自ドメインに公開 |
| 13 総合演習 | `part13-capstone` ✅ | 67 要件と設計 / 68 実装（前半） / 69 実装（後半） / 70 公開と振り返り | 題材は教材が決めた「会議室の予約」（学習者の指定、2026-11-18。模範解答つきで、実際の開発の流れを小さく1回通す）。要件定義（ユーザーストーリー・決まり R1〜R10）・画面・API・データの設計（EXCLUDE 制約）・ADR、決まりの純粋な関数、API（役割・会議室・予約）、画面（予約の表・SSE の知らせ・メールとリマインド）、Docker・CI・Render・運用の手順・README・振り返り、自分のアプリへ | 会議室の予約のアプリ（`project-room-booking`）。学習者が自分で決めた題材のアプリは、教材に入れない |

付録（予定）: A. Flask と Node.js の対応表 / B. Mac 開発環境のチェックリスト / C. 一次情報の読み方（MDN、Node.js 公式、RFC 9110）/ D. 次に学ぶこと（GraphQL、サーバーレス、モノレポ、Bun・Deno）

## 6. 作成済みの内容と、後の部とのつながり

### 第1部（作成済み）で学習者が持っているもの

後の部では、これらを前提にしてよい（参照するときは章と節を書く）。

- `~/dev/` を作業用フォルダとして使う（教材フォルダは OneDrive 上にあるため、`npm install` するプロジェクトは `~/dev/` に作る）
- zsh の設定は `~/.zprofile`（PATH）と `~/.zshrc`（対話用）に分け、dotfiles リポジトリで管理している
- Homebrew は `/opt/homebrew`。Node.js は **mise** で管理し、プロジェクトごとに `mise.toml` でバージョンを固定する（Homebrew の node は使わない）
- Git の設定: `init.defaultBranch main`、`pull.ff only`、`core.editor "code --wait"`、`core.quotepath false`、グローバル ignore は `~/.config/git/ignore`
- GitHub には SSH（ed25519、キーチェーン連携）で接続。GitHub Flow（ブランチ → PR → マージ）で進める
- VS Code（`code` コマンド、ESLint・Prettier・EditorConfig）。デバッグは JavaScript Debug Terminal と `launch.json`
- 第4章の `samples/serve.mjs`（`node:http` だけの静的ファイルサーバ）は第4部の予告として使った

### 第2部（作成済み）で学習者が持っているもの

- 通信を見る道具: `curl -v` / `-D -` / `-w`、`nc`、`dig`、`lsof -nP -iTCP -sTCP:LISTEN`、Chrome DevTools の Network（Preserve log、Disable cache、Protocol・Domain の列）と Application（Cookies）
- `node:net`・`node:dgram`・`node:dns`・`node:http`・`node:http2`・`node:tls`・`node:crypto` を、パッケージなしで使った経験（TCP のサーバ、HTTP を手で解析するサーバとクライアント、HMAC の署名、TLS の接続）
- 第6章: リクエストとレスポンスのバイト列、Content-Length はバイト数、chunked、keep-alive。`node:http` は `writeHead` に Content-Length が無いと chunked になり、`setHeader` + `end(本文)` なら自動で Content-Length を付ける
- 第7章: Cookie の属性、301/302/303/307/308 の違い、Cache-Control・ETag・304、gzip・br、Accept の解析。`node --test` の基本（`test`、`assert.equal`・`deepEqual`、`--test-name-pattern`）、`encodeURIComponent`
- 第8章: `createHash`・`createHmac`・`generateKeyPairSync`/`sign`/`verify`・`diffieHellman` を自分で書いた。`https.createServer` と `tls.connect`（`my-https-server.mjs` 8444、`my-cert-check.mjs`）。自己署名証明書（`~/dev/ch08/certs/cert.pem`・`key.pem`、`make-self-signed.sh`）、mkcert、`NODE_EXTRA_CA_CERTS`、HSTS、Secure Cookie。`signed-value.mjs`（HMAC 付きの値）
- 第9章: `URL` による相対 URL の解決、オリジンとサイト、CORS（プリフライト、`Allow-Credentials`、`Vary: Origin`）、オープンリダイレクト対策の `safeRedirectPath()`
- 第10章: いちばん小さな MPA（`mini-mpa.mjs` 8505。フォーム、`URLSearchParams`、303、`escapeHtml` を `replaceAll` で）と SPA（`mini-spa.mjs` 8506。`fetch`、`createElement`、`textContent`、`preventDefault`）を自分で書いた。ルーティングは `pathname.split('/')`（正規表現は使っていない）。大きい版の `todo-mpa.mjs`・`todo-spa.mjs` は動かしただけ。SSR・CSR・SSG、REST の慣習（201 + Location、204、405 + Allow、422）、安全と冪等、PRG（303）、`try`/`catch` で 500、`Map` を使った `Idempotency-Key`、Flask のアプリの説明し直し
- 第10章の `samples/tasks-store.mjs`（メモリのタスクの保存場所。seed は id 1「牛乳を買う」、id 2「第10章を読む」（完了））は、第5部のタスク管理 API の原型として使える

### 第2部で決めた書き方・作り方（第3部以降もそろえる）

- **ポートは章ごとに分ける**（同時に起動してもぶつからないように）。使ったもの: 第5章 7000・7100 / 第6章 8080〜8082・8090 / 第7章 8100・8110・8119 / 第8章 8443・8444・8080・8180 / 第9章 8200・8300・8301・8310・8311・8400・8401 / 第10章 8500〜8502・8505・8506・8510・8519・8520・8529 / Flask 5010（macOS では 5000 番を AirPlay レシーバが使うことがある）。各章の `samples/README.md` の表にポートの列を作る。
- **関数を作る練習問題**は、`exercises/xxx.test.mjs`（`node:test`）を用意し、`process.env.MODULE ?? './xxx.mjs'` を `pathToFileURL(path.resolve(import.meta.dirname, ...))` で読み込む。解答は `MODULE=../solutions/xxx.mjs node --test xxx.test.mjs` で確かめる。
- **サーバを作る練習問題**は、`exercises/check-xxx.sh [ファイル]` を用意する。`~/dev/chNN` で `bash exercises/check-xxx.sh 自分のファイル.mjs` と打てるように、ファイルは「コマンドを打ったフォルダから見た場所」で受け取る（スクリプトの中で `cd "$(dirname "$0")"` しない）。練習問題で学習者がコピーして直すファイルは、`../samples/` などを `import` しない（`~/dev/chNN` 直下にコピーすると、相対パスが壊れるため）。確認用の専用のポートでサーバを起動し、`[OK]`・`[NG]` と理由を表示して、失敗の数を数える（`set -uo pipefail`。`-e` は外す）。最後に「すべて成功しました」か「N 個の確認が失敗しました」（終了ステータス 1）。直す前のファイルで何個失敗するかも、問題文に書く。
- ブラウザでの動きは、Playwright（Chromium）で実際に確かめた結果だけを書き、「Chromium で確かめた」と添える。外のサイトの出力は「出力例」と書く。
- 本文で、ファイルのパスを `new URL(..., import.meta.url).pathname` で作らない（日本語のフォルダ名がパーセントエンコードされる）。`fileURLToPath` か `import.meta.dirname` を使う。
- 証明書・秘密鍵・Python の仮想環境など、OneDrive に置きたくないものは `~/dev/` の下に作る。
- 攻撃の仕組みを扱う練習問題は、自分の Mac の中で動かしているものだけを対象にする。
- 成果物のレポートの見本（`project-web-report/example-report.md`）は、架空のサイトと説明用の IP アドレス（`192.0.2.0/24`、`2001:db8::/32`）で書いた。実在のサイトの結果は、古くなるので見本に使わない。

### 第1部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| 公開鍵暗号、証明書、fingerprint の確認と中間者攻撃 | 第3章11節、練習問題9 | 第2部 第8章 ✅ |
| アクセスログの各列（メソッド、パス、ステータス） | 第1章6節 | 第2部 第6章（練習問題5の `logged-server.mjs`）✅ |
| `process.exitCode`、終了ステータス | 第1章7節、第2章練習問題10 | 第3部 第16章 ✅ |
| `forEach` と async、`Promise.all`、unhandled rejection | （第1部では扱わない） | 第3部 第12〜13章 ✅ |
| 第1部から外した問題（2026-11-09、学習者の決定）: 非同期の合計のバグ（旧 第4章 `bug-async.mjs`。forEach + async、Promise.all）、オプションのオブジェクトの共有のバグ（旧 第4章 `bug-shared-options.mjs`。参照とコピー）、環境を診断する `env-report.mjs`（旧 第2章。child_process・JSON） | 第1部では扱わない（削除済み） | 第3部を作り直すときに入れる。オプションの共有は第11章 練習問題3（`buggy-receipt.mjs`）、非同期の合計は第12章 練習問題2（`buggy-total.mjs`）に入れた ✅。`env-report` は第15章 練習問題3（`env-report.mjs`）に入れた ✅ |
| `.mjs`、`node:` プレフィックス、ES Modules | 第2章サンプル | 第3部 第14章 ✅ |
| npm、semver、`sudo npm install -g` をしない理由 | 第1章8.3節、第2章6.6節 | 第3部 第14章 ✅ |
| パストラバーサル対策、MIME タイプ | 第4章 `serve.mjs` | 第4部 第19章 ✅ |
| `innerHTML` と XSS、`textContent` | 第4章 `demo.js` | 第4部 第21章 ✅、第10部 第55章 ✅ |
| 秘密情報（`.env`）とローテーション | 第3章13.3節、練習問題5 | 第10部 ✅（鍵・`client_secret` は環境変数で、例は `dev-only-…`）、第12部 第60章 6節 ✅（取り替え） |
| ESLint の設定、CI | 第4章4節 | 第11部 第59章 ✅ |

### 第2部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| HTML のエスケープと XSS（`escapeHtml`、`textContent`） | 第10章2.3節・3.1節・練習問題6・7 | 第4部 第21章 ✅、第10部 第55章 ✅ |
| ボディを Stream として読む、大きなアップロード | 第6章11.2節 | 第3部 第15章 ✅（Stream・背圧）、第4部 第20章 ✅ |
| ルーティングを `split('/')` で書く。大きい版の `todo-spa.mjs` は正規表現（`/^\/api\/tasks\/(\d+)$/`） | 第10章5節・練習問題1・3・6 | 第4部 第18章 ✅ |
| セッション（ランダムな ID、署名付き Cookie、Flask の `session`・`flash`） | 第7章3節、第8章2節、第10章練習問題7 | 第4部 第22章 ✅、第10部 第52章 ✅ |
| CSRF（GET で状態を変えない、`SameSite`、CSRF トークン） | 第10章6.1節 | 第4部 第22章 ✅（`SameSite`・トークン）、第10部 第52・55章 ✅ |
| パスワードのハッシュ化（bcrypt / Argon2） | 第8章2節 | 第10部 第51章 ✅ |
| Shift_JIS などの変換を npm のパッケージ（iconv-lite）で行う | 第7章2節 | 第3部 第14章 ✅ |
| Public Suffix List をパッケージ（tldts など）で扱う | 第9章練習問題6 | 第3部 第14章 ✅ |
| Express の cors・ログ（morgan など）・エラーハンドリングのミドルウェア | 第9章5.5節、第6章練習問題7、第10章練習問題6 | 第5部 第24章 ✅ |
| REST の設計（ページネーション、バリデーション、エラーの形） | 第10章5節・練習問題5 | 第5部 第25章 ✅ |
| SSE・WebSocket で画面とサーバのずれを減らす | 第10章練習問題4 | 第5部 第27章 ✅、第8部 第39・43章 ✅ |
| 冪等キーをデータベースに保存する、トランザクション | 第10章練習問題8 | 第6部 第30章 ✅ |
| 開発サーバのプロキシ（Vite の proxy）で CORS を避ける | 第9章5節、練習問題5の解答 | 第8部 第40章 5節 ✅ |
| 画面とサーバの状態のずれ、取り直し（TanStack Query） | 第10章3.3節・練習問題4 | 第8部 第39章・第43章 ✅ |
| SSR とハイドレーション、ソフト 404 | 第10章4.2節・練習問題4 | 第8部 第46章 ✅ |
| 例外でサーバが止まる（第2部は同期の例外。unhandled rejection は第3部）、待っている間の割り込み（第2部は `setTimeout`） | 第10章練習問題6・8 | 第3部 第12〜13章 ✅ |
| `node:test` によるテスト | 第7〜9章の `*.test.mjs` | 第11部 第56章 ✅ |
| 本番の HTTPS（リバースプロキシ、独自ドメインの証明書、HSTS の preload） | 第8章、第10章1節 | 第12部 第62章 3・5節 ✅ |
| 計測してから改善する（接続の時間、最初の1バイト） | 成果物 | 第12部 第66章 4・5節 ✅（負荷をかけて計る・プロファイル。curl の `-w` の時間の内訳は扱っていない） |

### 第3部（作成済み）で学習者が持っているもの

- 第11章: 型と比較、クロージャ、`this`、プロトタイプとクラス、参照とコピー。解答の部品: `makeCounter`（`counter.mjs`）、`undoneTitles`・`totalMinutes`・`countByTag`・`sortByMinutes`（`tasks.mjs`）、`makeReceipt`（`receipt.mjs`）、`once`・`memoize`・`debounce`・`pipe`（`functions.mjs`）、`parseLine`・`summarize`（アクセスログの集計。`log-summary.mjs`）、`LRUCache`、`deepEqual`・`setIn`
- 第12章: Promise と async/await、`Promise.all`・`allSettled`・`race`・`any`、ループと `await`、`AbortController`・`AbortSignal.timeout`・`AbortSignal.any`。解答の部品: `delay`・`delayFail`・`valueOr`（`timers.mjs`）、`totalPrice`、`getPricesSerial`・`getPricesParallel`・`getPricesSettled`（`prices.mjs`）、`promisify`・`callbackify`、`mapLimit`（上限付きの並行、`signal` 対応）、`retry`（指数バックオフ・タイムアウト・中止）
- 第13章: 解答の部品: `nextTask`・`sumSquaresAsync`、`countPrimesInWorker`（`worker-count.mjs`）、`startHeartbeat`（`unref`）。タスクとマイクロタスク（ESM のトップレベルではマイクロタスクが `nextTick` より先、CJS では逆）、フェーズ、libuv のスレッドプール、イベントループを止める処理、Worker（`report-worker.mjs`）、`setImmediate` で分割（`chunked.mjs`）、ReDoS（`slug.mjs`）、`monitorEventLoopDelay` と自作の遅れの監視（`lag-monitor.mjs`）、プロセスが終わる条件（`unref`）
- 第14章: 解答の部品: `cart.mjs`（`subtotal`・`withTax`・default の `formatYen`）、`cart.cjs`、`scripts-practice`（`pre` スクリプト、`&&`）。ESM と CJS とその混ぜ方（`require(esm)`、トップレベル await があると `ERR_REQUIRE_ASYNC_MODULE`）、`exports`・`imports`（`#config`）、semver（`semver.mjs` を自作）、ロックファイルと `npm ci`、npm scripts と `node_modules/.bin`、install scripts の危険（npm 11 の `allowScripts`）、`npm pack` と `files`。iconv-lite（cp932）と tldts（`allowPrivateDomains`）を使った
- 第15章: 解答の部品: `readJson`・`writeJson`・`listMarkdown`（`json-files.mjs`）、`StepCounter`、`commandVersion`・`envReport`（`env-report.mjs`）。`path`、`fs/promises` とエラーの code、**壊れない書き込み** `writeFileAtomic`・`updateJson`（`atomic.mjs`）、EventEmitter（`JobQueue`）、Buffer と文字コードの境目（`TextDecoder` の `stream`）、Stream・`pipeline`・背圧・Transform（`createLineSplitter`）、`readline`、gzip のログを流して集計、`execFile` と `exec`、上限付きでフォルダを歩く `dirSize`
- 第16章: 解答の部品: `greet-cli.mjs`（`parseArgs`、終了コード 2）、`upper.mjs`（標準入力を Buffer のまま集める）、`countdown.mjs`（SIGINT で 130、`TICK_MS`）。シバン・`bin`・`npm link`、`util.parseArgs` とサブコマンド、`isTTY`、`styleText` と `NO_COLOR`・`FORCE_COLOR`、`process.exit()` はパイプへの出力を切る（`exitCode` を使う）、EPIPE、SIGINT・SIGTERM（130・143、2回目はすぐ終わる）、XDG と設定の優先順位（`loadConfig`）、`confirm`（端末でなければ `--yes` が必要）、CLI を `spawn` でテストする
- 成果物 `project-memo-cli/solutions/`: `memo` コマンド（外部パッケージなし）。front matter は JSON の形で書き YAML の一部だけを読む、id は `YYYYMMDD-HHmmss` で前方一致、利用者の id はパスに使わず一覧と照らし合わせる、新規作成は一時ファイル + `link`（上書きしない）、書き直しは一時ファイル + `rename`、`rm` は `.trash` へ移す、エディタはシェルを通さず `spawn`。テストは `node --test "test/*.test.mjs"`、`cli.test.mjs` は `MEMO_BIN` で学習者の実装も確かめられる

### 第3部で決めた書き方・作り方（第4部以降もそろえる）

- ポート: 第12章 9120・9121 / 第13章 9130〜9133（第14〜16章と成果物はポートを使わない）。第4部は 9170 以降など、別の番号の帯を使う
- 練習問題のひな形は、書く場所に `// ここを書く`。解答の直したところは `// 修正:`、足したところは `// 追加:`。テストか確認スクリプトで「直す前に何個失敗するか」を問題文に書く
- 確認スクリプトは `bash check-xxx.sh [確かめるファイル]` のように **`bash` を付けて**動かす前提で書く（OneDrive の同期で実行の許可が外れることがあるため）。`check 名前 期待 実際` の関数で `[OK]`・`[NG]` を出し、最後に「すべて成功しました」か「N 件失敗しました」（終了ステータス 1）
- 一時ファイルは `os.tmpdir()`（`fs.mkdtemp`）に作り、最後に消す。`npm install` するものは `~/dev` の下（第14章は、部のコピー `~/dev/part03` の中の `exercises/packages`・`exercises/deps`・自分で作る `my-app` で npm install する。2026-11-09 に `setup-ch14.sh` と `~/dev/ch14` をやめた）。教材の中の `node_modules` は `ch14-modules-npm/samples/resolve` と `samples/scripts-demo` だけで、Mac のリポジトリの `.gitignore` で例外にする
- 章をまたいで解答を使うときは、相対パスで `import` してよい（例: 第15章の `log-stream.test.mjs` は `../../ch11-js-refresher/solutions/log-summary.mjs` の `parseLine` を使う）。成果物には、使う解答を `src/` にコピーした
- 子プロセスで node を起動するときは `process.execPath` を使う。CLI のテストでは `env` を必要なものだけにし、`HOME` を一時フォルダにする
- 端末でしか確かめられない動き（`Ctrl+C`、`Ctrl+D`、色）は、擬似端末（Python の `pty`）で実際に確かめてから書いた
- npm・Node.js の版で変わる動き（install scripts の扱い、`require(esm)`、`readline` の `question` が入力の終わりで止まる、など）は「執筆時点では（Node.js 26 / npm 11 で確かめた）」と書く
- `node --test` を引数なしで動かすと、`test/` の中の `.mjs` がすべてテストとして動く。テストの補助のファイルを `test/` に置くときは、`"test/*.test.mjs"` のように絞るか、動かされても害が無いようにする

### 第3部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| パストラバーサル（`path.join` は `..` を止めない、`path.relative` で外を指すか調べる） | 第15章 練習問題4、成果物 2.2節 | 第4部 第19章 ✅ |
| ボディの大きさの上限、Stream で読むリクエストのボディ | 第15章7節 | 第4部 第20章 ✅ |
| サーバを止めるとき（受け付けをやめ、処理中を終えてから終わる） | 第16章8.2節 | 第4部 第17章 ✅、第12部 第60章 5節・第61章 5節 ✅ |
| `crypto.timingSafeEqual`、パスワードのハッシュ化 | 第15章8.1節 | 第10部 第51・52章 ✅ |
| コマンドインジェクション（`exec` と `execFile`）、エディタをシェルで起動しない | 第15章8.2節、成果物 3.4節 | 第10部 第55章 ✅ |
| 依存パッケージの危険（install scripts、typosquatting、`npm audit`） | 第14章12節 | 第10部 第55章 ✅ |
| Worker のプール、複数プロセス、イベントループの遅れの監視 | 第13章6〜7節 | 第12部 第66章 ✅（複数プロセスとロードバランサ、イベントループの遅れのメトリクス。Worker のプールは表で触れただけ） |
| ReDoS を静的解析で見つける（eslint-plugin-regexp など） | 第13章 練習問題6 | 第11部 第59章 ✅ |
| 同時に書き直すと片方が消える（ロック、楽観的ロック、一意制約） | 第15章 練習問題5、成果物 5節 | 第6部 第30章 ✅ |
| テストの考え方（関数のテストと外からのテストの分け方） | 第16章10節 | 第11部 第56章 ✅ |

### 第4部（作成済み）で学習者が持っているもの

章をまたいで、前の章の模範解答を相対パスで `import` して使う作りにした。後の部でも、これらの部品と比べながら説明できる。

- 第17章: 解答の部品: `handler`（`greeting.mjs`。`new URL` でパスとクエリ）、`createCounterHandler`（クロージャで数を持つ JSON）、`safe(handler)`（例外を 500、`headersSent` なら `destroy`）。手を動かす: `hello.mjs`・`events.mjs`・`respond.mjs`・`safe-server.mjs`・`stop-server.mjs`（9179）。`createApp(handler, { logger, now })`（例外を 400 番台は `HttpError` のメッセージで・それ以外は 500 で JSON にする、`X-Request-Id`、`close` でアクセスログ）と `HttpError(status, message, { headers })`（`solutions/app.mjs`）、`sendText`・`sendHtml`・`sendJson`・`redirect`・`noContent`（`solutions/send.mjs`）、グレースフルシャットダウン（`server.close()` は Node 19 以降 idle の接続も閉じる。止めている間の応答には `Connection: close`）、`headersTimeout`・`requestTimeout`
- 第18章: 解答の部品: `splitPath`、`findRoute`（表を引く、404・405・HEAD、Allow はアルファベット順）、`readPage`・`readSort`・`readListQuery`。手を動かす: `tasks-if.mjs`・`parse-url.mjs`・`routes-table.mjs`・`mw.mjs`（9183）。`Router`（`get`/`post`/…、`handle` はアロー関数のフィールド。`req.pathname`・`req.query`（URLSearchParams）・`req.params`、405 + Allow、HEAD → GET、OPTIONS は 204、最後の `/` は 308（`//` へは送らない）、URIError は 400）、`parsePattern`・`matchPath`・`comparePatterns`（`:name` と最後の `*`）、`parseQuery`・`QueryError`、Koa 風の `compose`。URLPattern は Node 26 でグローバル
- 第19章: 解答の部品: `contentTypeOf`（`Object.hasOwn`）、`isInside`・`isHidden`、`weakEtag`・`isNotModified`（弱い比較）。手を動かす: `my-mime.mjs`・`inside.mjs`・`file-server.mjs`・`etag-server.mjs`（9196、`path.resolve('samples/public')` なので章のフォルダで動かす）。`safePath`・`resolveFile`（`path.relative` で外を指すか、ドットファイル、シンボリックリンク）、`serveStatic(root, { mount, index, cacheControl, range })`（弱い ETag・304・Range・HEAD）、`parseRange`、`negotiateEncoding`、`samples/mime.mjs` の `contentType`・`isCompressible`。nosniff で text/plain の JS が動かないことは Chromium で確かめた
- 第20章: 解答の部品: `mediaTypeOf`・`isJson`・`isForm`、`readContactForm`（`URLSearchParams` の get・getAll・has）、`validateMessage`（オブジェクトか、name 1〜20・text 1〜200、決めたキーだけ）。手を動かす: `read-body.mjs`・`form-server.mjs`・`json-server.mjs`・`pick-keys.mjs`（9206）。`readBody`（`Content-Length` で先に断る、`data` + `pause` で数える。`for await` の途中の `throw` では 413 を返せない）・`mediaType`・`readText`・`readJson`・`readForm`（`solutions/body.mjs`）、`safeMerge`（JSON Merge Patch、`__proto__` などは 400）・`pick`、`detectImageType`・`saveImage`（中身で種類を調べ、名前は randomUUID）、`samples/form-data.mjs` の `readFormData`（上限付きで読んでから `Request.formData()`）
- 第21章: 解答の部品: `escapeHtml`・`textToHtml`、`commentItem`・`commentList`、`selectBox`（どれも `html` タグで、結果は `SafeHtml`）。手を動かす: `escape.mjs`・`tag-demo.mjs`（`esc` の入れ子で二重のエスケープ）・`book-page.mjs`（9216。自分のファイルは `./samples/mini-html.mjs` を import）。7節の `\u003c` が文字に化けていたのを直した。`samples/mini-html.mjs` の `html` タグ・`raw`・`escapeHtml`・`SafeHtml`（null・undefined・false は出さない、配列はつなぐ）、`attrs`・`safeUrl`（http・https・mailto・相対だけ）・`jsonForScript`（`<>&`・U+2028/2029 を `\uXXXX`）・`queryString`（`solutions/html-helpers.mjs`）、`layout`・`taskList`・`paginate`・`pagination`（`solutions/views.mjs`）、小さなテンプレートエンジン `compile`（tokenize → parse → render、`Object.hasOwn` だけをたどる、eval しない）、CSP の nonce
- 第22章: 解答の部品: `getCookie`・`cookieLine`、`addFlash`・`takeFlash`（flash は配列）、`newToken`・`ensureCsrf`・`checkCsrf`（timingSafeEqual）。手を動かす: `visits.mjs`・`my-session.mjs`（9226。自分のファイルは `./samples/cookie-basic.mjs` を import、curl -c/-b）・`random-id.mjs`・`my-sign.mjs`（鍵は dev-only の値）。`parseCookies`・`serializeCookie`（名前は token、SameSite=None には Secure、`__Host-`・`__Secure-` の決まり）・`clearCookie`（`solutions/cookie.mjs`）、`sign`・`unsign`（HMAC、最後の `.`、鍵の配列で取り替え、32 文字以上）・`signJson`・`unsignJson`（`iat` で期限）、`SessionStore`（`ttlMs`・`now`、`create`/`get`/`set`/`destroy`/`regenerate`/`prune`）・`withSession`（`res.writeHead` を包んで保存、知らない ID は使わない、空のセッションは作らない、`req.regenerateSession()`・`req.destroySession()`、`Cache-Control: no-store`）・`newSessionId`（32 バイトの base64url）、パスワードは salt 付きの scrypt + `timingSafeEqual`（無いユーザーでもダミーで計算）、flash、CSRF トークン
- 成果物 `project-bbs/solutions/`: 簡易掲示板（`~/dev/bbs` で作る。外部パッケージなし、ポート 9230）。`src/lib/` に第17〜22章と第3部の `atomic.mjs` をコピー（`import` のパスだけ変更）。`Store`（JSON のファイル、書き込みは Promise の鎖で1つずつ、`writeFileAtomic`）、`createBbsApp({ store, sessions, publicDir })` = `withSession(createApp(handler))`、`HttpError` は HTML の画面（401 は /login へ、/api と 413 は JSON のまま）、見るだけの客にはセッションを作らない、CSP は `script-src 'none'`。テスト `test/bbs.test.mjs` は `BBS_SERVER` のサーバを子プロセスで起動し（9231、`DATA_DIR` は一時フォルダ）、HTTP だけで 17 個確かめる。`src/lib/` と第5部の `lib/` のファイルの1行目は「第NN章 練習問題N」と章を付けて書く（番号は付け直した後のもの）。部品は `~/dev/part04` からコピーする

### 第4部で決めた書き方・作り方（第5部以降もそろえる）

- ポート: 第17章 9170〜9179（「手を動かす」は 9179）/ 第18章 9180〜9184（「手を動かす」は 9183）/ 第19章 9190〜9196（「手を動かす」は 9196）/ 第20章 9200〜9206（「手を動かす」は 9206）/ 第21章 9210〜9216（「手を動かす」は 9216） / 第22章 9220〜9226（「手を動かす」は 9226） / 成果物 9230（テスト 9231）。第5部は 9300 以降など、別の帯を使う
- 確認スクリプトは、サーバが落ちても後の確認がすべて失敗しないように、`restart_if_dead` で起動し直す（ただし「その後もサーバが動いている」の確認の直前には呼ばない）
- サーバを相手にするテスト（`*.test.mjs`）の `fetch` には `AbortSignal.timeout(…)` を付ける（ひな形が応答しないとテストが止まるため）。テストのサーバは `listen(0)` か専用のポート
- Flask と比べる節（各章の1節）は、まず Flask（と Werkzeug・Jinja2・itsdangerous）が何をしていたかを説明してから、Node.js で同じことを書く。最後の節は「Flask との対応」の表
- 攻撃の仕組みにふれる章（パストラバーサル、プロトタイプ汚染、XSS、セッション固定化、CSRF）は、守り方と「自分のサーバが正しく断るか」を確かめる形にした。攻撃に使う入力の例（スクリプトを動かす文字列など）は書かず、表示が崩れる例（`<p>` を含む題名など）や、「知らない ID」「トークンの無いフォーム」で説明した。XSS の攻撃の具体例と総点検は第10部 第55章に回す
- `/mnt/project-files` に置いた SVG には、保存先の仕組みで C2PA のメタデータが足されることがある。第19章 `samples/public/img/logo.svg` は Mac に書くときに元の 221 バイトに戻した
- 執筆時点では Node.js 24.22 と 26.13 で、すべてのテストと確認スクリプトの模範解答が通ることを確かめた

### 第4部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| 自作の Router・`createApp`・`compose`・`readForm`・`serveStatic`・`withSession` と Express の対応 | 各章の最後の節、成果物 6節 | 第5部 第23〜24章 ✅ |
| 入力の確かめをライブラリで（zod など）、エラーの形をそろえる | 第20章 練習問題3・8、成果物 2.2節 | 第5部 第25章 ✅、第7部 第38章 ✅ |
| セッションをデータベース・Redis に置く、サーバが複数台 | 第22章 4.3節 | 第6部 第34章 ✅、第10部 第52章・成果物 ✅（成果物は PostgreSQL の `PgSessionStore`） |
| JSON のファイルの代わりにデータベース、一意制約、同時の書き込み | 成果物 3.3節 | 第6部 第29〜31章 ✅ |
| パスワードのハッシュ（bcrypt・argon2 との比べ）、認証と認可 | 第22章 6.1節、成果物 3.5節 | 第10部 第51章 ✅ |
| 署名付きトークン（JWT）と、Cookie のセッションとの比べ | 第22章 5.1節 | 第10部 第52章 ✅ |
| XSS・CSRF・CSP の総点検、`Origin` ヘッダでの CSRF 対策、fetch で送る API の守り方 | 第21章 2.1・8節、第22章 8節 | 第10部 第55章 ✅ |
| HTTPS での `Secure`・`__Host-` の Cookie | 第22章 2.1〜2.2節 | 第12部 第60章 7節・第62章 3節 ✅ |
| テンプレートエンジン（EJS・Nunjucks など）と React の JSX のエスケープ | 第21章 1・6節 | 第5部 第23章 ✅、第8部 第41章 2.3節 ✅ |
| 外から HTTP で確かめるテスト、テスト用のデータ | 成果物 `test/bbs.test.mjs` | 第11部 第57章 ✅ |

### 第5部（作成済み）で学習者が持っているもの

第5部は外部パッケージを使う。第23章の最初に `bash （Finder から setup-part05.sh をドラッグ）` で1回だけ動かす。`part05-express/setup-part05.sh` が部のフォルダを `~/dev/part05` にコピーして `npm ci --ignore-scripts`（作成先があれば何もしない）。`package.json` で版を固定: express 5.3.0、cors 2.8.6、morgan 1.12.1、express-session 1.19.0、zod 4.6.7、pino 10.4.0、ws 8.22.1、fastify 5.12.8、hono 4.13.16、@hono/node-server 2.1.6。`part05-express/lib/` に第4部の部品と `problem.mjs` のコピー（章をまたぐ `import` はここを通す）。

- 第23章: 解答の部品: `parseId`・`toArray`、`createGreetApp`、`notFound`・`errorHandler`。手を動かす: `hello.mjs`・`routes.mjs`・`body.mjs`・`errors.mjs`（9307）。Express 5 の動き（`req.query` は getter で代入すると例外、同じ名前のクエリは配列、405 は無く 404、HEAD・OPTIONS は自動、`res.send(数)` の落とし穴、async の throw は 500 に届く、自動の弱い ETag）。`resource`（405 + Allow）、第21章のエンジンをビューエンジンに
- 第24章: 解答の部品: `requestId`（ひな形も next を呼ぶミドルウェアを返す）、`requireJson`、`createTasksRouter`。手を動かす: `order.mjs`・`timing.mjs`・`require-key.mjs`（dev-only の鍵）・`routers.mjs`（9317）。`mini-express`（列と `next`）、`rateLimit`（固定の窓、`RateLimit-*`・`Retry-After`）、`accessLog`、express-session の正しい設定。Express の `next()` は Promise を返さない
- 第25章: 解答の部品: `problem`・`toErrors`、`CreateTask`（zod）、`parseLimit`・`nextLink`。手を動かす: `problem-api.mjs`・`zod-try.mjs`・`etag-lock.mjs`（9327）。`HttpProblem`・`problemHandler`・`notFound`（problem+json、ZodError → 422 + `errors[].pointer`、body-parser のエラーの読み替え）、`paginate`（署名つきカーソル、値で探す、1件多く取る）、`parseListQuery`（`z.coerce` を使わず数字だけの文字列、知らない名前・2回の指定は 400 + `errors[].parameter`）、`evaluatePreconditions`（RFC 9110 13.2.2 の順、強い比べ方と弱い比べ方、428）、冪等キーのサンプル
- 第26章: 解答の部品: `readPort`・`readLogLevel`、`createHealthRouter({ isReady })`、`maskQuery`。手を動かす: `service-split.mjs`・`config-check.mjs`・`pino-log.mjs`・`graceful.mjs`（9337）。3つの層（routes → services → repositories、エラーはサービスのクラスを `mapDomainErrors` で HTTP に）、`loadConfig`（zod で環境変数、値はエラーに書かない、`ConfigError`）、pino と `requestLogger`（応答の後に1行、`reqId`、`redactUrl`）、`/healthz`・`/readyz`、SIGTERM で止める（遅らせる・時間切れで 1）
- 第27章: 解答の部品: `toSse`・`ping`、`createWaiters`、`isAllowedOrigin`・`parseChatMessage`。手を動かす: `long-wait.mjs`・`sse-clock.mjs`・`ws-echo.mjs`・`ws-client.mjs`（9347。クライアントは `new WebSocket(url, { headers: { Origin } })` で Origin を付ける）。ポーリング・ロングポーリング（`createWaiter` の片付け）・SSE（`formatEvent`・`createEventStreamParser`、`createEventHub`・`sseRoute`、`Last-Event-ID` と `reset`、心拍）・WebSocket（手書きのハンドシェイクとフレーム、ws、Origin の完全一致、`maxPayload`、心拍）。Node 22+ のグローバルな `WebSocket` は Origin を送らない
- 第28章: 解答の部品: `readJson`・`problemResponse`、`createHelloApp`（Hono、`app.request` で試す）、`buildApp`（Fastify、`app.inject`）。手を動かす: `fastify-try.mjs`・`hono-try.mjs`・`web-serve.mjs`（9357）。練習問題は8問（基本4・応用2・発展2）。同じ API を Express・Fastify・Hono・Web 標準のハンドラで書き、`contract.mjs` の同じテストで確かめる。Fastify の既定（`coerceTypes`、`removeAdditional`、text/plain を読む、レスポンスのスキーマに無い項目は出ない、`err.validationContext`）。Web 標準とつなぐアダプタ（`rawHeaders`、`getSetCookie`、流す、`request.signal`）、小さなルーター（URLPattern、405、HEAD、玉ねぎのミドルウェア）。Koa・NestJS はコードの形だけ
- 成果物 `project-task-api/solutions/`（`task-api` パッケージ。`~/dev/task-api` で作る。express・zod・pino・cors だけ、ポート 9360）: 第26章 9節の形。`src/lib/`・`src/middleware/` に前の章の解答をコピーし、変えた所に `// 追加（成果物）:`・`// 変更（成果物）:`。タスクは `{ id, title, status, dueDate, createdAt, updatedAt, completedAt, version }`、ETag は `"version"`、PATCH・DELETE は If-Match 必須（428・412）、`expectedVersion` をデータの層まで渡す（SQL の `WHERE version = $2` にあたる）、サービスは `publish(type, task)` だけを受け取り、`server.mjs` が hub につなぐ。SSE は `task.created`・`task.updated`・`task.deleted`、止めるときに `sse.closeAll()` で `shutdown` を送ってから `server.close()`。設定は第26章の `loadConfig` に `CURSOR_SECRET`（本番で必須）・`RATE_LIMIT_PER_MINUTE`・`MAX_DOING`・`SSE_HEARTBEAT_MS` を足した。テスト `test/api.test.mjs` は `API_SERVER` のサーバを子プロセスで起動し（9361、一部 9362）、HTTP だけで 25 個確かめる

### 第5部で決めた書き方・作り方（第6部以降もそろえる）

- ポート: 第23章 9300〜9309 / 第24章 9310〜9319 / 第25章 9320〜9329 / 第26章 9330〜9339 / 第27章 9340〜9349 / 第28章 9350〜9359 / 成果物 9360（テスト 9361・9362）。「手を動かす」は各章の 9307・9317・9327・9337・9347・9357。サンプルは章のフォルダで `node samples/x.mjs` と動かす（先頭のコメントもその形）。第6部は 9420 以降（第6部の節を参照）
- サーバのサンプルは `listen(port)` を export し、`import.meta.main`（Node 24.2+）のときだけ決まった番号で待つ。テストは空いている番号
- 第6部以降の成果物は、前の部の `project-task-api/solutions/` を出発点にする。`test/api.test.mjs` は、そのまま通ることを目標にする（第6部で、データの層の形は `listPage`・`findOpenByTitle`・`countByStatus` を足して `list` をやめた。第6部の節を参照）
- 外のパッケージの版で変わる動き（Fastify の ajv の既定など）は、実際に入れた版で確かめ、版を書く
- 執筆時点では Node.js 24.22 と 26.13 で、すべてのテストと確認スクリプトの模範解答が通ることを確かめた

### 第5部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| カーソルの条件・`WHERE version = $2`・冪等キーをデータベースで（索引、トランザクション、一意制約） | 第25章 6.2・7.3・8.2節、成果物 3.3節 | 第6部 第30章 ✅、第6部 成果物 ✅ |
| 並べ替えの項目を決めた表から選ぶ理由（SQL インジェクション）、プレースホルダ | 第25章 練習問題4の解答 | 第6部 第31章 ✅ |
| メモリのデータの層を PostgreSQL のものに取り替える | 第26章 3・9節、成果物 7節 | 第6部 第31〜33章・成果物 ✅ |
| 回数の制限・SSE のハブ・セッションを複数台で共有（Redis、Pub/Sub） | 第24章 5節、第27章 4.5節 | 第6部 第34章 ✅、第12部 第66章 7節・成果物 ✅（SSE のハブ。回数の制限は成果物の「もっとやるなら」） |
| zod のスキーマから TypeScript の型を作る | 第25章 5.1節 | 第7部 第38章 ✅ |
| SSE を画面から受け取る、CORS で Vite の画面から呼ぶ | 第27章 5節、成果物 2.8節 | 第8部 第39・43章 ✅ |
| Next.js の Route Handlers を動かす | 第28章 5.2節 | 第9部 第49章 2節 ✅ |
| 401・403、ログインしたユーザーごとの冪等キー・回数の制限、WebSocket・SSE の認証 | 第25章 3.2節、第27章 3.3節、成果物 5節 | 第10部 成果物 ✅（SSE は人ごとのハブ。WebSocket の認証は扱っていない） |
| helmet・CSP などのヘッダの総点検 | 第24章 6節 | 第10部 第55章 ✅ |
| `req.ip` とリバースプロキシ（`trust proxy`）、本番の `.env` の代わり、圧縮 | 第23章 4節、第24章 6節、第26章 5.3節 | 第12部 第60〜62章 ✅（圧縮は扱っていない。PaaS・CDN に任せる前提） |
| ファイルのアップロード（multer、オブジェクトストレージ） | 第24章 6節 | 第12部 第63章 ✅（multer は名前だけ。`express.raw` でバイトのまま受け取る） |
| 二重に実行されても困らないジョブ（冪等キーの考え方） | 第25章 8.2節 | 第12部 第64章 ✅ |
| 構造化ログを集めて探す・数える | 第26章 6.1節 | 第12部 第66章 2節 ✅ |

### 第6部（作成済み）で学習者が持っているもの

第6部も外部パッケージを使う。第29章の最初に `setup-part06.sh` を1回だけ動かす（`~/dev/part06` にコピーして `npm ci --ignore-scripts`）。版: pg 8.23.1、drizzle-orm 0.45.4、drizzle-kit 0.31.11、redis 6.3.1、express 5.3.0、zod 4.6.7、pino 10.4.0。章をまたぐ `import` はせず、使う部品は章の `samples/`・`exercises/`・`solutions/` にコピーを置く。

- 第29〜31章は Node.js 組み込みの `node:sqlite`（Docker なし）。第32章で Docker Desktop（か OrbStack）を入れ、部の直下の `compose.yaml`（名前 `nodejs-course-part06`）で postgres:18（127.0.0.1:5433、app / `dev-only-password` / app、ボリューム pgdata、`docker/postgres-init/01-databases.sql` がデータベース ch33・taskapi を作る）と redis:8（127.0.0.1:6380、ボリュームなし）を動かす。コンテナで動かす compose.yaml は、執筆の環境に Docker が無かったので構文だけ確かめた（PostgreSQL 16・Redis 7 を直接動かしてテストした）
- 第29章: SELECT・INSERT・UPDATE・DELETE、制約、外部キー、正規化。練習問題8問（SQL の文字列を export する問題、`?` の関数、外部キーの表、ToDo の CLI、バグ直し）
- 第30章: JOIN・LEFT JOIN（ON と WHERE の違い）、GROUP BY・HAVING・評価の順・JOIN で行が増える問題、インデックスと EXPLAIN、トランザクション、version と冪等キー（第25章の 412・409 とつなぐ）、キーセット（limit + 1）。練習問題8問
- 第31章（9427、練習問題の API は 9428）: `?` と SQL インジェクション（攻撃の文字列は使わず、`Let's` の `'` だけで壊れることを見せる）、行とタスクの変換、`createSqliteTaskRepo`（列の許可リスト、RETURNING）、同期の `withTransaction`（外のトランザクションに入る）、`user_version` のマイグレーション、`statusForDbError`（errcode 2067 UNIQUE・275 CHECK・1299 NOT NULL・787 FK・1555 PK）、Express の API（`mustBeString`、`err.expose`、DB のメッセージは見せない `DB_DETAIL`）。練習問題9問
- 第32章（9437）: Docker・Compose・psql、`pg` の `Pool` と `$1`、型（count・bigint・numeric は文字列、timestamptz は Date、date は `setTypeParser` で文字列にしないと JST で1日ずれる）、`pool.connect()` と `release()`、接続を借りる `withTransaction`、`n = n + 1`・`FOR UPDATE`・`SKIP LOCKED`、エラーコード（23505・23514・23502・23503・22P02 など、`err.constraint`、`err.detail` は見せない）、SQL のファイルのマイグレーション（`schema_migrations`）、`pg-task-repo.mjs`。練習問題9問。テストの部品 `exercises/pg-test.mjs`（テストごとにスキーマを作って `search_path`、返されていない接続は 1 秒後に切る）。練習問題8は アドバイザリロック + sha256 のチェックサムのマイグレーション（成果物で使う）
- 第33章（9447、データベース ch33）: Drizzle（`pgTable`・`check`・部分 `uniqueIndex`・`relations`）、drizzle-kit（設定のパスは打ったフォルダから数える。`import.meta.dirname` は使えない）の `generate --name`・`migrate`（記録は `drizzle.__drizzle_migrations`）、クエリビルダ・`toSQL()`・`SQL_LOG=1`、N+1（ロガーで SQL の回数を数える）、`db.query` の `with`、`db.transaction` と `tx`、エラーは `DrizzleQueryError` に包まれ `err.cause` が pg のエラー、`tx.rollback()`、`getTableColumns` で知らない項目を断る（Drizzle は `set()` の知らないキーを黙って捨てる、`.where(undefined)` は WHERE なし）。drizzle-kit 経由の esbuild の `npm audit`（moderate）は開発用なので `audit fix --force` しないと書いた。練習問題8問、テストの部品 `exercises/drizzle-test.mjs`。練習問題8は学習者が `exercises/` で `npx drizzle-kit generate --name add_priority` を打つ
- 第34章（9457・9458）: redis-cli（文字列・TTL の -1 と -2・INCR・ハッシュ・SCAN、KEYS は使わない）、node-redis（`createClient`、`reconnectStrategy` は5回であきらめる、`setEx`・`multi()`・`expire(…, 'NX')`、`close()`）、cache-aside と消し方、`INCR` と固定の窓の回数の制限、セッションを Redis に（2台のサーバで共有）、Pub/Sub（`duplicate()`、残らない）。express-session + connect-redis は名前だけ（第10部）。練習問題8問、テストの部品 `exercises/redis-test.mjs`（キーの頭 `test:…:` を消す）
- 成果物 `project-task-api/solutions/`（ポート 9460、テスト 9461・9462、データベース taskapi）: 第5部の完成例から、データの層を `createPgTaskRepo(pool)`（`listPage` のキーセット SQL。NULL は PostgreSQL の既定の位置、title は `COLLATE "C"`。`findOpenByTitle`・`countByStatus`・`insert`・`update`・`remove`、23505 `tasks_open_title` を `ConflictError` に）に替え、`memory-tasks.mjs` は消した。冪等キーは `createPgIdempotencyStore`（`INSERT … ON CONFLICT DO NOTHING` の `claim`、`complete`・`delete`・`purgeExpired`）。ミドルウェアの store は async。`lib/cursor.mjs` は `encodeCursor`・`decodeCursor` だけ。`src/db/pool.mjs`（`redactUrl`）・`src/db/migrate.mjs`（第32章 練習問題8 + `npm run migrate`）、`migrations/001_create_tasks.sql`・`002_create_idempotency_keys.sql`。設定に `DATABASE_URL`（本番で必須、開発の既定は taskapi）・`DATABASE_SCHEMA`（テスト用）・`DATABASE_POOL_MAX`。止めるときに `pool.end()`。印は `// 追加（第6部）:`・`// 変更（第6部）:`。テストは 30 個（1〜25 は第5部と同じ、26 同時の PATCH、27 同時の同じ題名、28 再起動しても残る、29 2台で同じ冪等キー、30 つなげないと終了コード 1 でパスワードを隠す）。サーバごとにスキーマを作って `DATABASE_SCHEMA` で渡す。学習者は `~/dev/task-api` でブランチ `part06-postgres` を作って進める
- レート制限と SSE のハブはメモリのまま（「もっとやるなら」で第34章の Redis 版を案内）

### 第6部で決めた書き方・作り方（第7部以降もそろえる）

- ポート: 第31章 9420〜9429 / 第32章 9430〜9439 / 第33章 9440〜9449 / 第34章 9450〜9459 / 成果物 9460（テスト 9461・9462）。手を動かすは 9427・9437・9447・9457。PostgreSQL 5433・Redis 6380（Mac のほかのものとぶつけない）
- 開発用の仮の秘密の値は `dev-only-…`。ログに URL を書くときはパスワードを `***` に
- データベースを使うテストは、テストごとにスキーマ（`test_プロセス番号_乱数`）か Redis のキーの頭を作り、終わったら消す。本文で作ったデータには触らない
- SQL インジェクションなどは、`'` を含む値（`Let's ストレッチ`）だけで示し、攻撃の文字列は書かない
- 外のパッケージの版で変わる動き（drizzle-kit、node-redis の API）は、入れた版で確かめて書く
- 執筆時点では Node.js 24.22、PostgreSQL 16、Redis 7.0 で、すべての練習問題の模範解答と成果物のテストが通ることを確かめた（compose.yaml の postgres:18・redis:8 では未確認）

### 第6部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| データの層の形を型（`interface TaskRepo`）に、SQL の結果の行に型を付ける | 成果物 7節 | 第7部 第37・38章・成果物 ✅ |
| 画面に日付を出す（date の文字列、タイムゾーン） | 第32章 4.2節 | 第8部 第46章 4.3節・成果物 ✅ |
| ユーザーとタスク（外部キー、`user_id` を足すマイグレーション）、ログインごとの冪等キー | 第29章 6節、成果物 7節 | 第10部 成果物 ✅（列の名前は `owner_id`。マイグレーション 004） |
| express-session + connect-redis、ログインの回数の制限 | 第34章 5.2節 | 第10部 第51・52章 ✅（connect-redis は名前だけ。成果物は PostgreSQL に置いた） |
| インジェクションをまとめて扱う | 第31章 1節 | 第10部 第55章 ✅ |
| データベースを使うテスト、偽物のリポジトリに取り替える | 成果物 4節、第33章 7節 | 第11部 第57章 ✅ |
| 自分のアプリをコンテナにする、マネージドの PostgreSQL、`/readyz` で DB を確かめる | 第32章 1節、成果物 5節 | 第12部 第60〜62章 ✅ |
| `SKIP LOCKED` の仕事の列、BullMQ（Redis） | 第32章 6.2節、第34章 6.2節 | 第12部 第64章 3・5節 ✅ |
| キャッシュの置き場所（CDN と `Cache-Control`） | 第34章 3.2節 | 第12部 第65章 ✅ |
| 複数台で SSE を配る（Pub/Sub）、計測してからキャッシュ | 第34章 3.2・6.2節 | 第12部 第66章 5・7節・成果物 ✅ |

### 第7部（作成済み）で学習者が持っているもの

第35章の最初に `setup-part07.sh` を1回だけ動かす（`~/dev/part07` にコピーして `npm ci --ignore-scripts`）。版: typescript 6.0.3（7 は typescript-eslint が未対応なので使わず、本文で触れるだけ）、@types/node 24.19.2、@types/express 5.0.6、@types/pg 8.23.1、eslint 10.13.0、@eslint/js 10.0.1、typescript-eslint 8.72.1、tsx 4.23.15、zod 4.6.7、express 5.3.0、pg 8.23.1、pino 10.4.0。

- `.ts` はビルドせず `node x.ts`（Node.js 24 の型の除去）で動かし、`npx tsc`（`noEmit`）で確かめる。部の直下の `tsconfig.base.json`（es2024・nodenext・strict・noUncheckedIndexedAccess・erasableSyntaxOnly・verbatimModuleSyntax・allowImportingTsExtensions・noEmit・moduleDetection force）を、章・samples・exercises・solutions の `tsconfig.json` が `extends` する（TS 6 は tsconfig があると `tsc ファイル名` を断る TS5112 ので、フォルダごとに `npx tsc`）。ESLint は部の直下の `eslint.config.js`（`defineConfig`・`recommendedTypeChecked`・projectService）
- 練習問題のテストは `x.test.ts`（`node --test x.test.ts`）。動きのテストに加え、`exercises/typecheck.ts`（TypeScript の API）で `[問題のファイル, x.check.ts]` を確かめる。`x.check.ts` は `// @ts-expect-error` と `type-assert.ts` の `Expect<Equal<…>>`。書きかけの関数は `throw new Error('まだ書いていません')`
- 第35章: 型の除去、基本の型と推論、関数・オブジェクト（type と interface）、`undefined`・`null`、`any`・`unknown`・`as`、リテラル型とユニオン（enum は使わない）、tsconfig、`@ts-expect-error` と `Expect<Equal>`。練習問題8問
- 第36章: 絞り込み、判別できるユニオンと `never`、型ガード（`catch` の `err` は unknown）、ジェネリクス、ユーティリティ型とマップ型、Result 型、`as const`・`keyof typeof`・`satisfies`、クラス（`#private`・implements。引数のプロパティは使わない）。練習問題8問
- 第37章（9470〜9479）: 型の除去・tsx・`tsc` のビルドの違い、`@types`、Node.js の API の型、`todo-api`（`interface TaskRepo`、メモリと PostgreSQL の実装、`db.query<Row>`）、Express の型と宣言のマージ（`express.d.ts`）、ESLint（`no-floating-promises`・`no-misused-promises`）、`npm run check`。練習問題8問
- 第38章（9480〜9489）: `as` は何も確かめない、`z.infer`・`z.input`・`z.output`、境界で確かめる `parse<S extends z.ZodType>`、problem+json の `errors[].pointer`、条件型と `infer`、`fetch` の応答の確かめ（`UpstreamError`）、環境変数（`z.stringbool`・`preprocess`。`z.coerce` の落とし穴）、ブランド型、`z.toJSONSchema`。練習問題8問
- 成果物 `project-task-api/solutions/`（ポート 9490、テスト 9491・9492、データベース taskapi。第6部の compose を使う）: 第6部の完成例を、動きを変えずにすべて `.ts` にした。`src/types.ts`（`Task`・`Status`・`Sort`・`interface TaskRepo`・`interface IdempotencyStore`・判別できるユニオン `IdempotencyRecord`）と `src/express.d.ts`（`req.id`・`req.log`）を足した。`as` は `server.ts` の `AddressInfo` の1か所だけ。Zod で確かめる所に、カーソルの中身と冪等キーの表の `response` 列を足した。`pg-tasks.ts` の `COLUMNS`・`SORT_SQL` は `satisfies Record<…>`。`server.close` の中は `cleanup().catch(…)`。`tsconfig.json` と `eslint.config.js`（`test/` だけ `no-unsafe-…` を止める）を持つ。`npm run check`（tsc → ESLint → 30 個のテスト）。印は `// 追加（第7部）:`・`// 変更（第7部）:`。学習者は `~/dev/task-api` でブランチ `part07-typescript` を作り、import されるほうから1つずつ `git mv` で `.ts` にする

### 第7部で決めた書き方・作り方（第8部以降もそろえる）

- ポート: 第37章 9470〜9479 / 第38章 9480〜9489 / 成果物 9490（テスト 9491・9492）
- 第7部以降のコードは TypeScript（`.ts`）。`node` の型の除去で動く書き方だけを使う（enum・引数のプロパティ・namespace の値は使わない）
- `as` は避け、絞り込み・型ガード・Zod・`satisfies` で書く。外から来るものは Zod で確かめてから使う
- tsc のエラーを本文に貼るときは、学習者が見る形（`file.ts:7:3 - error TS…`）にする。行番号は、先頭のコメントを除いたファイルで数えて、実際に確かめる
- 解答と成果物の `src/` は `tsc` と ESLint でエラー 0（サンプルは、わざと間違えて見せるもの（`bug.ts`・`floating.ts`・`enum-demo.ts` など）を除いて `tsc` でエラー 0）。テスト・`typecheck.ts`・`x.check.ts` は `tsc` だけ
- 執筆時点では Node.js 24.22、PostgreSQL 16 で、すべての練習問題の模範解答と成果物のテスト（`npm run check`）が通ることを確かめた

### 第7部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| React の画面も TypeScript で、`@types/react`、Vite の tsconfig | 第35章、第37章 2節 | 第8部 第40章 6節 ✅ |
| 画面の状態（読み込み中・成功・失敗）を判別できるユニオンで | 第36章 2節 | 第8部 第39章・第43章 2.2節 ✅ |
| サーバとブラウザで同じ Zod のスキーマを使う（フォームの確かめ、API の応答の確かめ） | 第38章 8節 | 第8部 第43章 5.1節・成果物 ✅ |
| Server Actions の入力を Zod で | 第38章 | 第9部 第49章 3.2節・成果物 ✅ |
| `req.user` を宣言のマージで、`UserId` のブランド型、トークンの中身を Zod で | 第37章 5.2節、第38章 7節 | 第10部 ✅（`req.user`・`session.d.ts`、ID トークンの中身は Zod。ブランド型は使わなかった） |
| 偽物のリポジトリを `TaskRepo` に合わせる | 第37章 4節、成果物 5節 | 第11部 第57章 ✅ |
| `npm run check` を GitHub Actions で | 第37章 7節 | 第11部 第59章 ✅ |
| ビルドして動かす方法と比べる（本番の Docker のイメージ） | 第37章 1.4節 | 第12部 第61章 4節 ✅（イメージでも型の除去で動かし、`tsc` は確かめる段階で） |

### 第8部（作成済み）で学習者が持っているもの

第39章の最初に `setup-part08.sh` を1回だけ動かす（`~/dev/part08` にコピーして `npm ci --ignore-scripts`）。版: react・react-dom 19.3.1、@types/react・@types/react-dom 19.3.0、vite 8.3.5、@vitejs/plugin-react 6.1.2、vitest 4.1.12、jsdom 30.1.3、@testing-library/react 16.3.3・dom 10.4.2・user-event 14.6.8、@tanstack/react-query 5.105.0、react-router 8.5.1（`createBrowserRouter`、`RouterProvider` は `react-router/dom`）、tailwindcss・@tailwindcss/vite 4.3.3、eslint-plugin-react-hooks 7.1.1、ほかは第7部と同じ（typescript 6.0.3、eslint 10.13.0、typescript-eslint 8.72.1、zod 4.6.7、express 5.3.0）。

- 練習用の API: 部の直下の `api/`（第7部の成果物の `src/` のコピーに、メモリのデータの層 `repositories/memory-tasks.ts` と `api/server.ts` を足したもの）。`~/dev/part08` で `npm run api` → `127.0.0.1:9500`。CORS は `localhost:5173`・`127.0.0.1:5173`。起動のたびに例のタスクを5つ（`SEED=0` で無し）、`API_DELAY_MS` で遅らせられる。PostgreSQL は要らない
- 画面は 5173（`vite preview` は 4173）。第39章だけは `tools/serve.ts`（静的ファイルのサーバ、5173）で開き、第40章から Vite
- 部の直下の `tsconfig.base.json` は、第7部の設定に `lib: DOM`・`moduleResolution: bundler`・`jsx: react-jsx`・`types: [vite/client, node]` を足したもの。`eslint.config.js` は第7部の設定に `reactHooks.configs.flat.recommended` を足したもの（`ch39-vanilla-api/` は見ない）
- 練習問題のテストは Vitest + jsdom（設定ファイル無し。先頭に `// @vitest-environment jsdom`）。`npx vitest run x.test.tsx`、模範解答は `MODULE=../solutions/x.tsx npx vitest run x.test.tsx`。テストは `await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './x.tsx', import.meta.url).pathname)` で読む（相対パスは、Vitest の root が今いるフォルダなので壊れる）。`afterEach(cleanup)`。書きかけの部品は戻り値の型を `ReactNode` にして `throw new Error('まだ書いていません')`
- テストと解答で同じクラス（`ApiError` の `instanceof`）を使う問題は、解答が `../exercises/api.ts` などを import する（第43・44・46章）
- 第39章: DOM の木、`textContent` と XSS、`fetch` と problem+json、CORS、3つの状態、`createStore`、フォーム、`If-Match`、SSE。練習問題8問
- 第40章: なぜビルドするか、Vite と HMR、CSS・JSON の import、`import.meta.env`（秘密を書かない）、プロキシ、Vite は型を確かめない（`npx tsc`）、ハッシュ付きのファイル名と `import()`、プラグイン（`virtual:build-info`）。練習問題8問
- 第41章: JSX（関数の呼び出し、自動のエスケープ）、props、`map` と `key`、出し分け、`useState`、制御されたフォーム、state を持ち上げる、Testing Library（8節）。練習問題8問
- 第42章: 描画は関数を呼ぶこと、スナップショットと更新関数、`with`・`toSorted`、`useEffect` と後片付け・StrictMode、`useEffect` が要らない場面（set-state-in-effect の注意）、`useRef`、`useMemo`、カスタムフック、`useReducer`。練習問題8問（`useLocalStorage`・`useDebounce` など）
- 第43章: `useEffect` で読む（`AbortController`、ユニオンの状態）、TanStack Query（`taskKeys`、`useQuery`・`useMutation`、`invalidateQueries`、楽観的な更新）、Zod のフォーム（`''`→null）、422 を `pointer` で項目ごとに、412（If-Match）、SSE で `invalidateQueries`。Vite のプロキシ `/api` → 9500。練習問題8問
- 第44章: `createBrowserRouter`・`<Outlet />`・`errorElement`・`*`、`useParams` を確かめる、条件を URL に（`parseFilters`・`toSearchParams`・`useFilters` は更新関数の形）、`Link`・`NavLink`・`useNavigate`、state の置き場所、Context（`null` を既定にしてカスタムフックで確かめる、React 19 の `<Context value>`）。練習問題8問
- 第45章: 全体の CSS・CSS Modules・Tailwind CSS 4（`@custom-variant dark`）、CSS 変数と `data-theme`・`prefers-color-scheme`、意味のある HTML・名前・`:focus-visible`・コントラスト・skip link、`useId`・`aria-describedby`・`aria-invalid`、`role="status"`（最初から置く）、`<dialog>` の `showModal`（キャンセルにフォーカス・閉じたら戻す）、roving tabindex のタブ。練習問題8問
- 第46章: CSR・SSR・SSG、自分で作る SSR（Express + `renderToString` + `hydrateRoot`、`<!--app-html-->` などの置き場所、`vite build --ssr`）、`<script>` に入れる JSON は `<` をエスケープ、ハイドレーションの食い違い（`useSyncExternalStore` の `useHydrated`）、日付は `Intl` の `en-CA` で YYYY-MM-DD・`Date.UTC` で日数、本当の 404 と `<title>`、`renderToPipeableStream` と `<Suspense>`・`use`、Server Components の考え方。練習問題8問
- 成果物 `project-task-web/solutions/`（パッケージ `task-web`）: 学習者は `~/dev/task-api` でブランチ `part08-web` を作り、`web/` に置く（API とは別の `package.json`）。`vite.config.ts` は `/api` を `API_TARGET`（既定 `http://127.0.0.1:9490` = 第7部の API）に中継。一覧（`useInfiniteQuery` で「もっと読む」、条件は URL、既定の並べ方 `dueDate` は URL に書かないが API にはいつも `sort` を送る、題名の絞り込みは読み込んだ中から）、作る（`Idempotency-Key`、422 は項目の横）、1つのタスク（状態の変更・409、変わった項目だけ PATCH、412 で「読み直す」、`key={task.version}` でフォームを作り直す、`<dialog>` で消す）、`PageTitle`（`pathname` が変わったら h1 にフォーカス。最初のページ＝key `default` は除く）、`AnnouncerProvider` は Layout の中。`src/routes.tsx` が `routes: RouteObject[]` を export。テストは `test/fake-api.ts`（fetch の代わりの偽の API）と `test/app.test.tsx`（`createMemoryRouter(routes)`、名前で探す 19 個、`vi.setSystemTime` で 2026-12-10）。`npm run check`（tsc → ESLint → Vitest）

### 第8部で決めた書き方・作り方（第9部以降もそろえる）

- ポート: 画面 5173（preview 4173）、練習用の API 9500、成果物の API（第7部）9490
- 画面のテストは、役割と名前（`getByRole('button', { name: '…' })`）で探す。要件の表に名前を書いておく
- API の応答・フォームの入力は Zod で確かめる（画面の `schemas.ts` は第7部の `types.ts` の `Task` と同じ形）
- Hooks の決まりは ESLint（eslint-plugin-react-hooks 7）に見張らせる。わざと依存配列を減らすときは、理由のコメントと、その行だけの `eslint-disable-next-line`
- U+2028・U+2029 などの文字は、ソースにそのまま書かずエスケープで書く（パーサが壊れる）
- 執筆時点では Node.js 24.22、Chromium（Playwright）で、すべての練習問題の模範解答と成果物の `npm run check` が通り、サンプルと成果物がブラウザで動くことを確かめた

### 第8部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| 画面とサーバで同じスキーマのファイルを共有する、Next.js のファイルによるルーティング・SSR・`notFound()`・`metadata`・`loading.tsx`・Server Components | 第43章 5節、第44章 2節、第46章 5〜8節 | 第9部 第47〜49章・成果物 ✅ |
| ログインのフォーム、ログインしている人を Context で、401 でログインのページへ | 第39章 5節、第44章 7節、第45章 6節、成果物 7節 | 第10部 成果物 ✅（ログインしている人は Context ではなく TanStack Query の `['me']` に置いた） |
| `getByRole` で書くテスト、画面と API のテストを GitHub Actions で、Playwright の E2E | 第45章 5節、成果物 7節 | 第11部 第58・59章 ✅ |
| `.env` を本番とステージングで変える、`dist` を配るサーバで `index.html` を返す、ハッシュ付きのファイルを CDN で長く覚えさせる、検索エンジン | 第40章 4・7節、第44章 2.4節、第46章 5節 | 第12部 第60章・第65章 5・6節 ✅（検索エンジンはソフト 404 の注意だけ） |

### 第9部（作成済み）で学習者が持っているもの

第47章の最初に `setup-part09.sh` を1回だけ動かす（`~/dev/part09` にコピーして `npm ci --ignore-scripts`。`.next`・`.next-test`・`*.tsbuildinfo`・`next-env.d.ts` はコピーしない）。版: next 16.4.3、@next/eslint-plugin-next 16.4.3、server-only 0.0.1、ほかは第8部と同じ（react 19.3.1、vitest 4.1.12、jsdom 30.1.3、zod 4.6.7、typescript 6.0.3、eslint 10.13.0 など）。

- Next.js の設定は `tools/next.config.ts`（`cacheComponents: true`・`partialPrefetching: true`・`agentRules: false`・`distDir: process.env.NEXT_DIST_DIR ?? '.next'`）と `tools/tsconfig.next.json`。章の「手を動かす」は、章のフォルダに `web/` を作ってこの2つをコピーし、1つのアプリを育てる。ESLint は部の直下の `eslint.config.js`（第8部の設定 + `@next/eslint-plugin-next`）
- 練習用の API は第8部と同じ `api/`（9500）。Next.js のサーバから呼ぶので CORS は使わない（ブラウザの EventSource を直接つなぐときだけ `CORS_ORIGINS=http://localhost:9520 npm run api`）
- ポート: 第47章 9510・第48章 9520・第49章 9530・第50章 9540・成果物 9550。テストは各章の 6・7（API・Next.js）と 8（Server Action のテストの API）番台
- 練習問題のテスト: `tools/servers.ts` が API と `next dev`（または `buildAndStartNext` で `next build` → `next start`）を `.next-test` で起動し、ページを `fetch` して HTML を確かめる（`APP=../solutions npx vitest run app.test.ts`）。部品は jsdom（`MODULE=…`、`vi.mock('next/navigation')`）。Server Action は `vi.mock('server-only')`・`next/cache`・`next/navigation`（redirect は投げる）にして、`API_URL` を決めてから動的 import でふつうの関数として呼ぶ
- 第47章: 最小のアプリ、ファイルが URL、`layout`・`page`・共通メニュー、`Link`、サーバで API を読む（`lib/api.ts`）、`loading`・`[id]`・`notFound()`・`error.tsx`、`searchParams`、`metadata`、`next build`・`next start`、ESLint。練習問題8問
- 第48章: Server / Client Component、`'use client'` の境界と children、送れる props、`server-only`・環境変数（`NEXT_PUBLIC_`）、`<Suspense>` で分けて流す、`use`、`usePathname`（Suspense の中で）・`useSearchParams`・`router.refresh`。練習問題8問
- 第49章: Route Handler（health・BFF の `/api/tasks`・`RouteContext`）、`'use server'`（async 関数しか export できない）、`useActionState`・`useFormStatus`・`bind`・`useOptimistic`、Server Action の安全（引数はブラウザから届く値、だれが呼んだかは第10部）、SSE の中継。練習問題8問
- 第50章: `next build` の ○ ◐ ƒ、`connection()`、`'use cache'`・`cacheLife`・`cacheTag`、`updateTag`（Server Action）・`revalidateTag(tag, 'max')`（Route Handler、`Bearer dev-only-revalidate-secret`）、`generateStaticParams`、開発と本番の違い。練習問題8問
- 成果物 `project-task-next/solutions/`（パッケージ `task-next`）: 学習者は `~/dev/task-api` でブランチ `part09-next`（`part08-web` から）を作り、`next/` に置く。`lib/schemas.ts`・`dates.ts` は第8部の `web/` からコピー。API は `API_URL`（既定 9490）をサーバから呼ぶ。一覧は GET の `next/form` と `searchParams`（`?status=a,b` と `?status=a&status=b` の両方）、「次のページ」のリンク。`app/tasks/actions.ts` の4つの Server Action（`FormState` = errors・values・stale）、成功で `refresh()`、412 では呼ばず `stale: true`、知らせは `?created=1`・`?deleted=題名`。冪等キーは付けない（`useFormStatus` で防ぐ。キーを作る場所がハイドレーション・Cache Components と合わないため）。キャッシュは使わない（第50章 8節の1番）。テストは `test/pages.test.ts`（偽の API を HTTP で 9556、next dev 9557、14 個）・`actions.test.ts`（9558、14 個）・`components.test.tsx`（6 個）。README 5節に第8部との比較表

### 第9部で決めた書き方・作り方（第10部以降もそろえる）

- Next.js のアプリは Cache Components を有効にする（今の create-next-app の既定）。API やリクエストの値を読む部品は `<Suspense>` の中に置く
- API を呼ぶ関数は `lib/api.ts` に置き、1行目で `import 'server-only'`。Client Component は Server Action を通して書き換える
- Server Action の引数はブラウザから届く値として確かめる。返す型は `{ errors, values }` のような形にし、打った値を消さない
- テストの開発サーバは `NEXT_DIST_DIR=.next-test` と別のポートで起動し、学習者の `npm run dev` とぶつからないようにする
- SSR の HTML を正規表現で確かめるときは、React が文字のつなぎ目に入れる `<!-- -->` を取り除いてから比べる。属性の順番に頼らない

### 第9部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| ログインしていないときのページ、ログインのフォームを Server Action で、Route Handler でログインのコールバック、Server Action で「だれが呼んだか」を確かめる、人ごとのページは覚えない、合言葉は `crypto.timingSafeEqual` で比べる | 第47章 6節、第48章 4節、第49章 4節、第50章 8節・練習問題6の解答、成果物 8節 | 第10部 ✅（第52〜55章の「Next.js では」の節で考え方を表に。成果物は Express + React 版だけ） |
| CI でビルドする、ページ・Server Action・API のテストを GitHub Actions で、Playwright の E2E | 第50章 7節、成果物 6・8節 | 第11部 ✅（GitHub Actions・Playwright・`npm run check` の書き方。Next.js 版の CI は作っていない） |
| `next build` したアプリのデプロイ、本番の環境変数、ヘルスチェック、`metadata` と検索エンジン・SNS、静的なページの配信、ビルドする場所からデータに届くか | 第47章 8・9節、第48章 4節、第49章 2節、第50章 3・6・7節、成果物 8節 | 第12部 第62章 9節 ✅（考え方の表だけ。`metadata` と SNS は扱っていない。Next.js 版を実際にデプロイするのは第13部で選んだ人） |
| Next.js で作るか、Express + React で作るか | 第47章 3節、成果物 5節 | 第13部 |

### 第10部（作成済み）で学習者が持っているもの

第51章の最初に `setup-part10.sh` を1回だけ動かす（`~/dev/part10` にコピーして `npm ci --ignore-scripts`。どの深さの `node_modules`・`dist` もコピーしない）。版: express 5.3.0、express-session 1.19.0 + @types/express-session 1.19.0、helmet 8.3.0、nodemailer 10.3.1 + @types/nodemailer 8.0.2（nodemailer 10 は型を同梱していない）、zod 4.6.7、typescript 6.0.3、eslint 10.13.0、typescript-eslint 8.72.1。`tsconfig.base.json`・`eslint.config.js` は第7部と同じ形。

- 道具（`tools/`）: `fake-smtp.ts`（`npm run mail`。SMTP 127.0.0.1:1025、受け取ったメールは `http://127.0.0.1:8025/api/messages`。`temp-fail@example.com` は 451、`no-such-user@example.com` は 550）、`mini-idp.ts`（`npm run idp`。127.0.0.1:9640、認可コード + PKCE、RS256 と JWKS、ユーザー alice（確認済み）と bob（`email_verified: false`）、クライアント `task-app` / `dev-only-client-secret`、戻り先は 9647 の `/auth/callback` と `http://localhost:5173/api/auth/idp/callback`）。部の直下の `compose.yaml` は Mailpit（axllent/mailpit:v1.33.0。執筆の環境では Docker が使えず構文だけ確かめた）
- 練習問題は第7部と同じ形（`node --test x.test.ts`、`MODULE=../solutions/x.ts`、テストの中に `tsc` で型を確かめるテスト、ひな形は `throw new Error('まだ書いていません')`、投げることを確かめるテストは、その文を除く `rejected` で確かめる）。問題4は毎章 `predict.md`（考えて答える問題。答えは solutions/README）
- 第51章（9617）: 認証と認可、SHA-256 だけではだめ（`naive-hash.ts`）、ソルト、遅いハッシュ（`node:crypto` の Argon2id と scrypt の時間を比べる）、`password.ts`（Argon2id の PHC 文字列、`timingSafeEqual`）、`policy.ts`（12〜128 文字・NFKC・よく使われるもの・メールアドレスを含まない）、登録とログインの API（ダミーのハッシュで時間をそろえる）、`limiter.ts`（失敗を数える）、認可の関数 `can`。練習問題8問（email・phc・policy・predict・rehash・backoff・authorize（共有されたタスク）・パスワードを変える API）
- 第52章（9627）: express-session（`session-app.ts`、`regenerate`・`save`・`destroy`、`requireAuth`）、Cookie の属性とセッション固定、`requireSameOrigin`（`Origin`）、`node:crypto` だけの HS256 の JWT（`jwt.ts`。`alg` を確かめる・期限・書き換え）、store を持ってある人のセッションを全部消す（`store-demo.ts`）、MemoryStore は開発用（connect-redis は名前だけ）、Next.js では。練習問題8問（cookie-options・base64url・require-auth・predict・origin-check（Referer）・verify-jwt・timeout・logout-all。`exercises/client.ts` は Cookie の入れ物を持つテストの道具）
- 第53章（9637）: メールが届くまで（SMTP・MX・SPF・DKIM・DMARC）、`nc` で SMTP を話す、nodemailer（`send-mail.ts`・`mail-errors.ts`。`err.responseCode`・`err.permanent`）、`Mailer` の形と偽物、`token.ts`（32 バイト、表にはハッシュ、期限・1回だけ・使い道、URL の `#` の後ろ）、`mails.ts`、`email-app.ts`（登録 → 確認 → ログイン、登録済みでも同じ 202、送るのを待たない `deliver`）、再設定、届くメールにする（本番の話）。練習問題8問（reset-mail・smtp-data・smtp-reply・predict・token-store・retry・mail-queue・再設定の API）
- 第54章（9640・9647）: OAuth 2.0 と OIDC、認可コードフローを手で（`pkce.ts`・`exchange.ts`、`state`・`nonce`・PKCE）、ID トークンを確かめる（`id-token.ts`。RS256・JWKS・`iss`・`aud`・`exp`・`nonce`）、`oidc-client.ts`（ログインするアプリ。セッションのキー `oidc`）、`sub` とメールアドレス（`email_verified` が無ければ結びつけない）、GitHub でログイン（`github-login.ts`。セッションのキー `githubUser`。執筆の環境では動かしていない）、Auth.js。練習問題8問（callback・basic-auth・pick-key・predict・verify-id-token・exchange・link-account・設定を IdP から読むアプリ）
- 第55章（9657）: 点検の地図（OWASP Top 10 2025 の表。「必ず公式で確認」）、helmet（`plain.ts`・`headers.ts`。12 個のヘッダ、X-Powered-By を消す）、CSP の nonce（`csp-nonce.ts`。`CSP_REPORT_ONLY=1` では `upgrade-insecure-requests` を外す）、XSS の点検、CSRF（`fetch-metadata.ts`。Chromium で、別のサイトからの POST が 403 になることを確かめた）、インジェクション（`sql.ts` は `node:sqlite` と `Let's ストレッチ`、`run-command.ts` は `exec` と `execFile` と `--`）、認可の漏れ（`owner-check.ts`）、SSRF（`outbound-url.ts`。`net.BlockList` は IPv4 を写した IPv6 も IPv4 の決まりで見る、`dns.lookup` の `all: true`）、依存パッケージ（`npm audit`、`audit-part10.json` は本物の結果）、エラーを見せない（`errors.ts`。`errorId`）。練習問題8問（csp・fetch-metadata・count-lines・predict・owner-app・safe-fetch・error-handler・audit-gate（CLI））
- 成果物 `project-task-auth/solutions/`（API は第7部と同じ 9490、テスト 9491〜9494、画面 5173）: 学習者は `~/dev/task-api` でブランチ `part10-auth` を `part08-web` から作る（`next/` は使わない）。API: マイグレーション 003（`users`・`user_identities`・`email_tokens`・`sessions`）と 004（`tasks.owner_id`。**今あるタスクと冪等キーを消す**）、`src/auth/`（章の部品のコピーと `PgSessionStore`）、`pg-users.ts`、`services/auth.ts`、`routes/auth.ts`（`/api/auth/register`・`verify-email`・`resend-verification`・`login`・`logout`・`logout-all`・`me`・`forgot-password`・`reset-password`・`idp/login`・`idp/callback`）、`requireUser`・`requireSameOrigin`、helmet、express-session（`sid`、本番は `__Host-sid` と `Secure`、`rolling`、`saveUninitialized: false`）、`serviceFor(req)` でリクエストごとに `createPgTaskRepo(pool, userId)` のサービス（`services/tasks.ts` は第7部のまま）、`createUserHubs`（SSE を人ごとに）、冪等キーは `idempotency(store, { scope })` で人ごと、`/api/auth` の POST は `LOGIN_RATE_LIMIT_PER_MINUTE` で別に数える。設定に `APP_URL`・`SMTP_*`・`MAIL_FROM`・`OIDC_*`（3つそろえる）・`SESSION_MAX_AGE_HOURS`、`SESSION_SECRET` は開発では起動のたびに乱数。テストは `test/helpers.ts`（テストの中で偽の SMTP サーバを起動、`signUp`、base ごとの Cookie の `jar`）、`api.test.ts`（第7部の 30 個をログイン付きに）、`auth.test.ts`（31〜45。IdP も中で起動）の 45 個。画面（`web/`）: ログインしている人は TanStack Query の `['me']`（Context にしない）、`createQueryClient` で 401 なら `['me']` を `null`、`RequireLogin`（path の無いルート）、`safeNext`、ログイン・登録・確認（ボタンで POST）・再設定・新しいパスワードのページ、ログアウトでタスクのキャッシュを消す、`VITE_IDP_LOGIN=1` で IdP のリンク。テストは `app.test.tsx` 19 個 + `auth.test.tsx` 15 個

### 第10部で決めた書き方・作り方（第11部以降もそろえる）

- ポート: 第51章 9617 / 第52章 9627 / 第53章 9637（メールは 1025・8025） / 第54章 9640（IdP）・9647 / 第55章 9657 / 成果物は第7部の API の 9490（テスト 9491〜9494）と画面 5173
- 攻撃の例は書かない。守り方と「自分のサーバが正しく断るか」を確かめる形にする（SQL は `'` を含む値だけ、XSS は `<p>` だけ、Cookie を作り変えるコードは書かない、ポートを調べるのは 127.0.0.1 だけ）。部の README の冒頭に「攻撃の再現は自分の Mac の中だけ」と書いた
- メールは本物の宛先に送らない。例のアドレスは `alice@example.com`・`bob@example.com`。秘密の値は `dev-only-…`
- 外の SMTP サーバや IdP を相手にするテストは、偽物（`tools/` のコピー）をテストの中で空いているポートに起動する
- express-session を使う SSE は、止めるときに `res.once('finish', () => socket.end())`（`socket` は先に取っておく）で接続も閉じる。閉じないと `server.close()` が客の keep-alive が切れるまで（約4秒）待つ
- 執筆の環境では Mailpit（Docker）と GitHub の OAuth App は動かせなかった。Mailpit の代わりに `tools/fake-smtp.ts` で確かめ、GitHub でログインは型と ESLint だけを確かめたと本文に書いた
- `npm audit` は、ESLint の `minimatch` の moderate が8件出る（開発用の道具だけ。`--omit=dev` なら 0）。直った版は執筆時点で2週間たっていないので、版を上げていない
- 執筆時点では Node.js 24.22、PostgreSQL 16 で、すべての練習問題の模範解答と、成果物の API（45 個）・画面（34 個）の `npm run check` が通ることを確かめた。成果物は Chromium（Playwright）で、登録 → メールのリンク → ログイン → SSE → 別の人に見えない → ログアウト → 再設定 → IdP（結びつく・結びつかない）を通しで確かめた

### 第10部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| ログイン・API・画面のテストの層を分ける、本物の API まで通す E2E（成果物の 4.2節を自動に） | 成果物 7節 | 第11部 第56〜58章 ✅ |
| `npm audit` を CI で毎回動かす | 第55章 9節 | 第11部 第59章 ✅ |
| HTTPS の本番で `Secure`・`__Host-` の Cookie、`trust proxy`、HSTS | 第52章、第55章 2節、成果物 2.3節 | 第12部 第60章 7節・第62章 3節・成果物 ✅ |
| メール送信サービス・本番の SMTP の設定、秘密の値を環境変数で・取り替え | 第53章 8節 | 第12部 第60章 6節・成果物 ✅（`SMTP_USER`・`SMTP_PASS`・`SMTP_SECURE`） |
| メールを後ろで送る・送れなかったら送り直す（キュー・ワーカー） | 第53章 3.3・7節、練習問題7、成果物 5節 | 第12部 第64章・成果物 ✅ |
| 画像の URL を取りに行くときの SSRF、署名付き URL | 第55章 8節 | 第12部 第63章 ✅ |
| エラーとログの監視（`errorId` で探す） | 第55章 10節 | 第12部 第66章 2節・成果物 ✅ |
| 本物の IdP（Google・GitHub）でログイン、認可の漏れを自分の題材で点検 | 第54章 7節、第55章 7節 | 第13部 |

### 第11部（作成済み）で学習者が持っているもの

第56章の最初に `setup-part11.sh` を1回だけ動かす（`~/dev/part11` にコピーして `npm ci --ignore-scripts`。どの深さの `node_modules`・`dist`・`coverage`・`test-results`・`playwright-report`・`.vite` もコピーしない）。版: vitest・@vitest/coverage-v8 4.1.12、jsdom 30.1.3、@testing-library/react 16.3.3・dom 10.4.2・user-event 14.6.8、@playwright/test 1.63.0（ブラウザは第58章 8.1節で `npx playwright install chromium`）、eslint 10.13.0、typescript-eslint 8.72.1、eslint-plugin-react-hooks 7.1.1、eslint-plugin-regexp 3.3.3、prettier 3.9.10、eslint-config-prettier 10.1.8（`eslint-config-prettier/flat` から import）、yaml 2.9.1、express 5.3.0、pg 8.23.1、react 19.3.1、@tanstack/react-query 5.105.0、zod 4.6.7、vite 8.3.5、typescript 6.0.3。

- 「テストを書く」練習問題: `tools/check-tests.ts`（`node ../../tools/check-tests.ts x.test.ts [--vitest]`）。正しい実装（`MODULE` 無し）で通り、`mutants/x-*.ts`（1行目 `// ミュータント: …`）で落ちれば完成。`--vitest` のときは、テストのファイルのフォルダを Vitest の root にする（root の外のテストを探さないため）。問題文に「最初は N 個の確認が失敗」を書く
- 第56章（ポートなし）: 仕様を例で、`assert` の使い分け、表で回す・境界、`aTask(overrides)`、「今」を引数で・`mock.timers`、`mock.fn`・`mock.method`、テストの層、カバレッジ（`--experimental-test-coverage`・`--test-coverage-include`・`--test-coverage-lines`）、ミュータント。練習問題8問（slug・due-label・password-rules・predict・digest・debounce・discount（カバレッジ 100%）・limiter）
- 第57章（9717）: テストの中で `listen(0)` で起動、応答を必要なだけ、偽物のリポジトリ（`seed`）、テスト用のスキーマ（`test_プロセス番号_乱数`、`search_path`）、契約テスト `repoContract(name, makeRepo)`、テストの中のトランザクション、外の API の偽物のサーバ。練習問題8問
- 第58章（API 9727・画面 9728、テスト 9721〜9724）: `samples/app` を `web/` にコピーして育てる（tsconfig は `extends` を使わない単独のもの。コピーの深さが変わっても動く）。Vitest + jsdom、役割と名前で探す（`getByRole<HTMLInputElement>` の型引数で `as` を避ける）、user-event、`fakeTaskApi`、フェイクタイマー（`act(() => { … })` は波かっこ。式の形だと no-floating-promises）、不安定なテスト（`check-flaky.ts` は遅れ 0/150 × seed 1〜4）、Playwright（`outputDir: 'test-results'` を書く。サーバが決めるチェックボックスは `check()` が失敗するので `click()` + `toBeChecked()`）。練習問題8問
- 第59章（ポートなし）: `samples/demo`（直す前）・`samples/layers`（2.4節: `ignores` だけのオブジェクト・`globals`・場所ごとの上書き）・`samples/finished`（`npm run check` が通る）・`samples/github`（`ci.yml`・`dependabot.yml`）。ESLint 10 は lint するファイルから上にたどって近い `eslint.config.js` を使う、`--max-warnings 0`、eslint-plugin-regexp（ReDoS の時間は 20 文字 85ms・28 文字 2.5 秒）、自作のルール `no-focused-tests` と RuleTester（`RuleTester.describe = describe` などで node:test に）、Prettier（`singleQuote`・`printWidth 120`）と eslint-config-prettier を最後に、`check` は `&&` でつなぐ、GitHub Actions（permissions・concurrency・services・needs・upload-artifact）、`npm audit --omit=dev --audit-level=high`、Dependabot の cooldown、注釈の行 `::error file=…`。練習問題8問（lint-me・config-practice・ci.yml・predict・prefer-role-query・ci-full.yml・annotate・no-fixed-wait）。ワークフローのテストは `yaml` で読んで形を確かめる
- 成果物 `project-task-quality/solutions/`（学習者は `~/dev/task-api` でブランチ `part11-testing` を `part10-auth` から作る）: 第10部の完成例に、`test/unit/`（サービス 16・パスワードの決まり 9、PostgreSQL 不要）、`test/contract/`（`taskRepoContract` をメモリと PostgreSQL に。PostgreSQL はテストごとに新しいユーザーで空のリポジトリ。19 個）、`test/http/`（第10部の 45 個をそのまま移した）、`test/support/`（`helpers.ts`・`fake-smtp.ts`・`mini-idp.ts`・`memory-tasks.ts`（第8部の練習用 API のもの。`findOpenByTitle` が中のオブジェクトを返していたのを契約テストで見つけて直した）・`test-db.ts`）。`npm test` は `node --test "test/**/*.test.ts"`、`test:unit`、`coverage`（`src/**`、行 85%。子プロセスのサーバの分も集まる）。E2E は `playwright.config.ts`（偽の SMTP 9497・9498、API 9495（スキーマ `e2e` を `e2e/prepare-db.ts` で作り直す）、画面 9496（`cwd: 'web'` で `npx vite`）、`reuseExistingServer: !CI`）と `e2e/auth-flow.spec.ts` の2個（通しの流れ、人ごとの分離。準備は API で）。ESLint に regexp と prettier（`prefer-d`・`prefer-w`・`use-ignore-case` は書き方の好みなので off。`no-unused-capturing-group` 2・`no-super-linear-backtracking` 1 は直した）、全体を Prettier で整えた。`.github/workflows/ci.yml`（`api`・`web`・`e2e`）と `dependabot.yml`（`/`・`/web`・github-actions）。`web/` は `lint` に `--max-warnings 0` を足しただけ

### 第11部で決めた書き方・作り方（第12部以降もそろえる）

- ポート: 第57章 9717 / 第58章 9720〜9728 / 成果物のテスト 9491〜9494、E2E 9495〜9498（開発の API 9490・画面 5173 とぶつけない）
- 部の直下の `eslint.config.js` は、テストのファイル（`**/exercises/**/*.test.*` など）と `typecheck.ts` で `no-unsafe-assignment`・`no-unused-vars`・`unbound-method` を止め、`**/mutants/**` で `no-unused-vars` を止める。`samples/finished/**` と `project-task-quality/**` は見ない
- コピーして別の深さで動かすプロジェクト（`samples/app`・`samples/demo`）の tsconfig は、`extends` を使わず単独にする
- Vitest は `node_modules/.vite` にキャッシュを作る。教材に入れる前に消す（setup スクリプトも `.vite` をコピーしない）
- GitHub Actions は執筆の環境から動かせなかった（GitHub に届かず、actionlint のバイナリを動かすのも断られた）。「GitHub では動かしていない。YAML として読めることと、各コマンドが手元で通ることだけを確かめた」と本文に書く
- 執筆時点では Node.js 24.22、PostgreSQL 16、Chromium（Playwright 1.63.0）で、すべての練習問題の模範解答（27 件の確認）と、成果物の API 89 個・画面 34 個・E2E 2 個・`npm run coverage` が通ることを、`setup-part11.sh` で作った新しいコピーで確かめた

### 第11部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| CI が通ったらデプロイする、秘密の値を GitHub の Secrets に | 第59章 7.3節、成果物 8節 | 第12部 第62章 7節・成果物 ✅（GitHub では動かしていない） |
| オブジェクトストレージ・キューの偽物を、契約テストで本物とそろえる | 成果物「後でどこで使うか」 | 第12部 第63章 7節・成果物 ✅（`BlobStore`。キューは偽物を作らず、本物の Redis で確かめた） |
| 本番に近い環境で E2E を動かす | 成果物「後でどこで使うか」 | 第12部 成果物 ✅（`STATIC_DIR` で API が画面も配り、1つのオリジンで E2E） |
| 自分の題材のテストの層を決める | 第56章 7節、第58章 9節 | 第13部 |

### 第12部（作成済み）で学習者が持っているもの

第60章の最初に `setup-part12.sh` を1回だけ動かす（`~/dev/part12` にコピーして `npm ci --ignore-scripts`。どの深さの `node_modules`・`dist`・`coverage`・`test-results`・`playwright-report`・`.vite`・`.mini-s3` もコピーしない）。版: @aws-sdk/client-s3・@aws-sdk/s3-request-presigner 3.1161.0、bullmq 6.5.4、redis 6.3.1、express 5.3.0、pg 8.23.1、pino 10.4.0、nodemailer 10.3.1、zod 4.6.7、typescript 6.0.3、eslint 10.13.0、typescript-eslint 8.72.1。`tsconfig.base.json`・`eslint.config.js` は第7部・第11部と同じ形（`project-task-deploy/**` は見ない）。

- 道具（`tools/`）: `mini-s3.ts`（`npm run s3`。127.0.0.1:9800、S3 の API の一部と SigV4 のヘッダ・署名付き URL を自作。鍵は `dev-only-access-key`・`dev-only-secret-key`、バケット `task-files`・`demo`。MinIO のイメージは公開が止まり、ほかのイメージは執筆の環境で動かせなかったため）、`fake-smtp.ts`（第53章のコピー）、`mini-cdn.ts`（`npm run cdn`。9858、オリジン 9857、`X-Cache`・`Age`、`POST /__purge`）。SDK は `forcePathStyle` と `requestChecksumCalculation: 'WHEN_REQUIRED'`
- Docker: 執筆の環境の Docker（x86_64）で、公式のイメージ（node:24-bookworm-slim・postgres:18・redis:8）だけを使って確かめた。Apple Silicon では動かしていない
- 第60章（9807・9808）: 開発と本番、`loadConfig`（本番で必須のものを全部、名前だけ）、落ちたら起こし直す（`supervise.ts`）、止めるとき、秘密の値と取り替え（鍵の配列）、`trust proxy` と `X-Forwarded-*`（`client-ip.ts`）、本番の Cookie（`cookie-rules.ts`）、`/healthz`・`/readyz`、点検表。練習問題8問（config・rotation・client-ip・predict・health・supervise・cookie-rules・check-env）
- 第61章（9817）: `samples/app`（express・pg・redis の小さな API。tsconfig は単独）、Dockerfile を少しずつ（`steps/`）、レイヤーとキャッシュ、`.dockerignore`、マルチステージ（型を確かめる段階）、exec の形の `CMD` と `init`、`USER node`・`HEALTHCHECK`、秘密の値を入れない、CPU の種類、Compose。練習問題8問（`app-image.test.ts` は本当に `docker build` する）
- 第62章（9820〜9829、手を動かすは 9827）: PaaS の流れ、HTTPS はプロキシで終わる（`tls-proxy.ts`、自己署名の証明書）、`DATABASE_URL` と接続の数の予算、独自ドメイン（CNAME・`dig`）、止めずに入れ替える（`switch.ts`・`poll.ts`）、GitHub Actions のデプロイ（デプロイフック・`wait-for-version.ts`）、Render の `render.yaml`（読むだけでもよい）、Next.js、お金と後片付け。Render・GitHub では動かしていない。練習問題8問（`migration-check.ts`・`switch-proxy.ts` など）
- 第63章（9837、S3 9800）: オブジェクトストレージ、SDK、署名付き URL（`sign-by-hand.ts` で SigV4 を手で）、アップロード（中身で種類を決める `sniff`、上限、キーに利用者の名前を使わない）、`Content-Disposition`（`filename*`）、`BlobStore` と契約テスト、孤児の掃除、SSRF。練習問題8問（object-key・content-disposition・sniff-file・predict・presign・memory-blob-store・upload-router・sweep-orphans）
- 第64章（ポートなし）: 何を後ろに回すか、PostgreSQL の列（`FOR UPDATE SKIP LOCKED`）、指数バックオフとあきらめ、2回動いても困らない仕事、BullMQ（node-redis の接続をそのまま渡せる、`UnrecoverableError`、`upsertJobScheduler`）、決まった時刻とタイムゾーン、止めるとき。練習問題8問（backoff・job-schema・next-run・predict・pg-jobs・mail-processor・run-worker・daily-digest）
- 第65章（9856〜9858）: CDN、`s-maxage`・`stale-while-revalidate`・`private`・`Vary`、`mini-cdn.ts` で確かめる、ハッシュ付きのファイル名、ビルドした画面を配る（assets は immutable、HTML は no-cache、`/api` は SPA の戻り先にしない）、印で消す、人ごとの応答を覚えさせない。練習問題8問
- 第66章（9860・9867・9868）: 何を見張るか、pino のログを集計（`log-query.ts`）、Prometheus の形（counter・gauge・histogram、ルートは形で）、負荷をかけて計る（`load.ts`、パーセンタイル）、`--cpu-prof` で計ってから直す、ロードバランサ（`balancer.ts`）と Redis の Pub/Sub で台をまたぐ知らせ。練習問題8問
- 成果物 `project-task-deploy/solutions/`（学習者は `~/dev/task-api` でブランチ `part12-deploy` を `part11-testing` から作る）: 第11部の完成例に、添付ファイル（マイグレーション 005、`routes/attachments.ts`、`storage/` の `BlobStore`・`createS3BlobStore`（署名用に `S3_PUBLIC_ENDPOINT` の client を別に））、メールの仕事の列（`jobs/`、`deliver` は `enqueueMail`、5xx は `UnrecoverableError`、送ったことを Redis に）、毎朝のお知らせ（マイグレーション 006 の `digest_log`、`DIGEST_CRON`・`DIGEST_TZ`）、孤児の掃除（1時間ごと）、`WORKER_MODE`（inline / separate、`src/worker.ts`）、Redis の Pub/Sub の `event-bus.ts`（SSE の id に台ごとの頭）、`routes/ops.ts`（`/readyz` は DB・Redis・ストレージ、`/version`、`/metrics` は `METRICS_TOKEN`）、`lib/metrics.ts`、500 に `errorId`、`TRUST_PROXY`、`STATIC_DIR`（`routes/static-site.ts`）、CSP の `img-src` にストレージ。`Dockerfile`（4段階、`ARG APP_VERSION=` は空で `RENDER_GIT_COMMIT` に落ちる）・`compose.yaml`（`task-app`、9801〜9803、`NODE_ENV=development`）・`render.yaml`・`.github/workflows/deploy.yml`。画面に `Attachments.tsx`（「画像を添付」「…を消す」）。テストは API 113 個（単体 29・契約 25・HTTP 57、`deploy.test.ts` の 46〜57）、画面 37 個、E2E 4 個（`STATIC_DIR` で API が画面も配る）。`npm run coverage` は行 95%

### 第12部で決めた書き方・作り方（第13部もそろえる）

- ポート: 第60章 9807・9808 / 第61章 9817 / 第62章 9820〜9829 / 第63章 9837（練習用の S3 9800） / 第65章 9856〜9858 / 第66章 9860・9867・9868 / 成果物は開発の API 9490・画面 5173、テストは `freePort()`、E2E 9495〜9498、`docker compose` 9801〜9803
- クラウドのサービス（Render・Cloudflare R2・メール送信サービス・ドメイン）と GitHub Actions は、執筆の環境から動かせなかった。「執筆時点では」「必ず公式で確認」と書き、動かしていないことを本文に書く。読むだけで進められるようにする
- Docker のイメージは公式のもの（node・postgres・redis）だけを使う。S3 互換のサーバは自作の `mini-s3.ts` を node のイメージで動かす
- 執筆の環境には `AWS_*` の環境変数があるので、S3 の client には鍵をいつも明示して渡す（SDK が環境変数の鍵を拾わないように）
- Redis を使うテストは、キーの頭（`QUEUE_PREFIX`）をテストごとのスキーマの名前にして、終わったら消す
- 部の直下で `npx eslint .` を動かすと、projectService が全部の章の tsconfig を読んで、Node.js の既定のメモリ（約 2GB）が足りなくなった。ESLint は章ごと（`npx eslint ch60-production` など）に確かめた
- 第65章の `samples/dist` はビルドした画面の見本なので、`setup-part12.sh` は `dist` を除いてコピーした後で、これだけコピーする
- `res.sendFile` には絶対パスを渡す。ヘッドレスの Chromium は、`filename*` が ASCII でないとダウンロードの名前が `download` になるので、E2E のファイル名は ASCII にした
- 執筆時点では Node.js 24.22、PostgreSQL 16、Redis 7.0、Docker（x86_64）、Chromium（Playwright 1.63.0）で、すべての練習問題の模範解答と、成果物の API 113 個・画面 37 個・E2E 4 個が通ること、`docker compose up` で本番と同じ形が動くことを、`setup-part12.sh` で作った新しいコピーで確かめた

### 第12部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| 自分の題材を公開する（Dockerfile・compose・render.yaml・デプロイのワークフローを出発点に） | 成果物 9節 | 第13部 第70章 ✅（題材は会議室の予約。Render・GitHub では動かしていない） |
| ファイル・仕事の列・リアルタイムを自分の題材で使うか決める | 成果物「後でどこで使うか」 | 第13部 第67〜69章 ✅（ファイルは使わない、仕事の列はメールとリマインド、リアルタイムは SSE と決めた） |
| 画像を縮める仕事、ブラウザから直接置く、回数の制限を Redis に、CDN を前に、ステージング | 成果物 7節 | 第13部（任意）。会議室の予約では扱わなかった |

### 第13部（作成済み）で学習者が持っているもの

第67章の最初に `setup-part13.sh` を1回だけ動かす（`~/dev/part13` にコピーして `npm ci --ignore-scripts`。どの深さの `node_modules`・`dist`・`coverage`・`test-results`・`playwright-report`・`.vite` もコピーしない）。部の直下の `package.json` は練習問題の分だけ（express 5.3.0、pg 8.23.1、yaml 2.9.1、zod 4.6.7、typescript 6.0.3、eslint 10.13.0、typescript-eslint 8.72.1）。アプリのパッケージは `base/`（第12部と同じ版。bullmq 6.5.4・redis 6.3.1・express-session 1.19.0・helmet 8.3.0・nodemailer 10.3.1・@playwright/test 1.63.0・prettier 3.9.10 など。画面は react 19.3.1・@tanstack/react-query 5.105.0・react-router 8.5.1・vite 8.3.5・vitest 4.1.12）。

- 題材は「会議室の予約」。学習者は `~/dev/part13/base` を `~/dev/room-booking` にコピーして `git init` し、章ごとに `main` に1つコミットする（土台・第67〜70章の5つ）。第68・69章の練習問題7（`app-tests/`）は、ブランチ（`practice-edit-title`・`practice-mine-by-day`）でアプリに機能を足し、`main` に戻る
- `base/`: 第12部の成果物から、タスク・添付ファイル・毎朝のお知らせ・冪等キー・SSE を取り除いたもの（ログイン・メール・仕事の列・設定・`/healthz`・`/readyz`・`/version`・`/metrics`）。API 25・画面 14・E2E 1
- 各章の `solutions/app/` は、その章を終えたときのアプリ（第67章 57、第68章 82、第69章 API 90・画面 24・E2E 2）。完成形は `project-room-booking/solutions/`（第70章のファイルを足したもの。コードは第69章と同じ）。部の直下の `eslint.config.js` と `.prettierignore` は、これらのアプリ（自分の設定を持つ）を見ない
- 第67章: 部の進め方、土台、要件定義（`docs/requirements.md`。決まり R1〜R10、作らないもの）、画面と API の設計（`screens.md`・`api.md`）、データの設計（`data.md`、`btree_gist` の EXCLUDE 制約 `bookings_no_overlap`、取り消しは `canceled_at`）、決まりの純粋な関数（`src/domain/time.ts` の `tokyoParts` など・`booking-rules.ts` の `checkBookingTime`・`slots.ts`）、ADR と `plan.md`。練習問題8問（slot-round・weekday・booking-length・predict・free-ranges・next-free・room-closures（SQL）・recurring）
- 第68章: 役割（マイグレーション 003、`scripts/grant-admin.ts`、`requireAdmin`）、入力の形とエラー（`schemas.ts`・`domain-errors.ts`）、会議室と予約のリポジトリ・サービス・ルート、決まりを守る場所の表、HTTP のテスト 17 個。練習問題8問（to-booking・cancel-problem・day-query・predict・memory-bookings・require-role・PATCH で題名を変える（app-tests）・usage-report（LEFT JOIN））
- 第69章: `web/src/domain/` に API の決まりをコピー、`useNow`、SSE（`booking.created` などは中身を入れず「変わった」だけ。Redis の Pub/Sub を通す）、`DayGrid`（rowSpan）・`DayPage`（`?date=`）・`BookingDialog`・`MyBookingsPage`・`RoomsAdminPage`、管理者の取り消しのメール、前日のリマインド（マイグレーション 004 の `reminder_log`、`ON CONFLICT DO NOTHING` で1通だけ、`REMINDER_CRON`）、画面のテスト（偽の API・`FakeEventSource`・`Date` だけ止める）、2つのブラウザの E2E。練習問題8問（lengths・when・day-nav・predict・grid-cells・group-by-day・自分の予約を日付ごとに（app-tests）・to-ics（RFC 5545））
- 第70章: `.dockerignore`・4段階の `Dockerfile`（388MB）、`compose.prod.yaml`（`room-booking-prod`、app 9913・mail 9911、`NODE_ENV: development`、`WORKER_MODE: separate`、worker は app の healthy を待つ）、外から5つ確かめる、`ci.yml`（api・web → e2e）、`render.yaml`（envVarGroups・keyvalue・worker・`preDeployCommand`）、`deploy.yml` と `wait-for-version.ts`、`docs/runbook.md`、マイグレーションは「足すだけ」、README とスクリーンショット、`docs/retro.md`（KPT）、自分のアプリへの表、次に学ぶこと。`samples/`（show-jobs・show-env・list-links）。練習問題8問（app-version・ci.yml の穴埋め・missing-env・predict・smoke（CLI）・compose-ports・check-links（CLI）・additive-migration（状態機械））

### 第13部で決めた書き方・作り方

- ポート: 開発の API 9900・画面 5174・偽の SMTP 1025（HTTP 8025）、compose の PostgreSQL 5434・Redis 6381、E2E 9906〜9908、`compose.prod.yaml` 9911・9913。テストは `freePort()`
- 本文の「手を動かす」は、ほとんどが `~/dev/room-booking` のファイルを書くこと。完成形（各章の `solutions/app/`）の同じファイルと見比べる。ファイルの先頭のコメントに、章と節の番号を書く
- 練習問題は、アプリの部品を React や Express を使わない純粋な関数にして `node --test` で確かめるものが中心。`domain/` のコピーを `exercises/domain/` に置く
- 部の直下に `.prettierrc.json`（singleQuote・printWidth 120）と `.prettierignore` を置き、練習問題と本文も Prettier で整えた（オブジェクトは `--object-wrap collapse`）
- 執筆時点では Node.js 24.22、PostgreSQL 16（compose の postgres:18 も `compose.prod.yaml` で動かした）、Redis 7.0（同 redis:8）、Docker（x86_64）、Chromium（Playwright 1.63.0）で、すべての練習問題の模範解答と、各章のアプリ・完成形の `npm run check`・E2E が通ることを確かめた。Render と GitHub Actions では動かしていない

## 7. 作業の手順（Claude 向け）

1. このファイルと、教材全体の `README.md`、見本として第1部の各 `README.md` を読む。
2. 作る部の章立てを5節の表で確認する。内容を大きく変える場合や、学習者に確認したほうがよい点がある場合は、**作り始める前に学習者に聞く**（学習者の希望）。
3. 部の `README.md` → 各章の本文 → samples → exercises → solutions → 成果物、の順に作る。
4. **すべてのスクリプトとコードを実際に動かして確かめる。** 期待する出力を本文や問題に書く場合は、実際の出力を貼る。Git のコミットID を書く場合は、日時を固定したスクリプトで作ったものに限る。
5. すべてのフォルダに `README.md` があること、リンクが切れていないことを確かめる。
   ```sh
   $ find . -type d ! -path '*/.git*' | while read -r d; do [ -f "$d/README.md" ] || echo "README なし: $d"; done
   ```
6. 教材全体の `README.md` の目次の「状態」と、この CLAUDE.md の5節（✅）と6節（作成済みの内容・予告と回収）を更新する。
7. シェルスクリプトに実行権限を付ける: `find . -name '*.sh' -exec chmod +x {} +`
   - 例外: `part01-mac-dev-env/ch01-terminal-zsh/exercises/broken-script.sh` は「実行権限が無い・改行コードが CRLF・shebang が無い」こと自体が練習問題なので、実行権限を付けず、CRLF のまま残す（付けてしまったら `chmod a-x` で戻す）。
