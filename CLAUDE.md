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

- **実習はすべて `~/dev/` の下で行う。** 教材のフォルダ（`nodejs/`、OneDrive 上）は「見本」として残すので、学習者に、そこでファイルを作らせたり、そこでコマンドを実行させたりしない（`cd` で教材のフォルダに入って `node samples/...` を動かす、も避ける）。
- 各章の最初（「読み方」の囲みの中）に、その章の作業フォルダ `~/dev/chNN/` を作り、教材の `samples/`・`exercises/` をそこへコピーする手順を書く。以降のコマンドは、すべて `~/dev/chNN/` で実行する前提で書く。

  ```sh
  $ mkdir -p ~/dev/ch06 && cd ~/dev/ch06
  $ cp -R "（教材のフォルダ）/part02-web-basics/ch06-http-by-hand/samples" "（教材のフォルダ）/part02-web-basics/ch06-http-by-hand/exercises" .
  ```

  教材のフォルダのパスは長く空白や日本語を含むので、「`cp -R ` まで打ってから、Finder から `samples` と `exercises` のフォルダをターミナルにドラッグし、最後に ` .` を打つ」と説明する。
- 学習者が書くファイルも `~/dev/chNN/` に置く。模範解答（`solutions/`）は見比べるためのもので、動かすときは同じように `~/dev/chNN/` にコピーしてから動かす。
- 練習用のファイルを作るスクリプトは、作成先の既定を `~/dev/...` にする（4節）。

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
- **Node.js のコードは ES Modules**（`.mjs`、または `package.json` に `"type": "module"`）で書き、組み込みモジュールは `node:fs/promises` のように `node:` を付ける。第7部までは JavaScript、第7部以降は TypeScript。
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
| 6 データベース | `part06-database` | 29 リレーショナル DB と SQL / 30 SQL の実践 / 31 Node.js から DB を使う / 32 Docker と PostgreSQL / 33 ORM とマイグレーション / 34 キャッシュと Redis 入門 | SQLite、テーブル設計と正規化、JOIN・集計・インデックス・トランザクション、プレースホルダと SQL インジェクション対策・コネクションプール、Docker Desktop / OrbStack・Compose、Prisma または Drizzle、キーバリューストア・セッション保存 | タスク管理 API を PostgreSQL で永続化 |
| 7 TypeScript | `part07-typescript` | 35 TypeScript の基礎 / 36 型の表現力 / 37 Node.js プロジェクトでの TypeScript / 38 型と実行時の境界 | 型注釈と推論・`tsc`・`tsconfig.json`、ユニオンと絞り込み・ジェネリクス・ユーティリティ型、実行方法（Node.js の型除去機能、tsx、ビルド）と ESM、外部入力は型で守れない・Zod | タスク管理 API を TypeScript に移行 |
| 8 フロントエンドと React | `part08-react` | 39 素の JavaScript で API とつなぐ / 40 ビルドツール / 41 React の基礎 / 42 Hooks と再描画の仕組み / 43 データ取得とフォーム / 44 ルーティングと状態の設計 / 45 スタイリングとアクセシビリティ / 46 フルスタックフレームワーク | `fetch` と DOM・画面とデータのずれ、バンドル・Vite、コンポーネント・JSX・props・state、`useState`・`useEffect`・カスタムフック、ローディングとエラー・TanStack Query・バリデーション、React Router・状態の置き場所、CSS Modules・Tailwind・キーボード操作とセマンティック HTML、SSR とハイドレーション・Server Components・Next.js | タスク管理アプリの画面（React + TS） |
| 9 Next.js | `part09-nextjs` | 47 Next.js 入門 / 48 Server Components と Client Components / 49 Server Actions と Route Handlers / 50 レンダリングとキャッシュの戦略 | App Router とファイルによるルーティング・Vite の React アプリとの違い、コードがサーバとブラウザのどちらで動くか・サーバ側のデータ取得、フォーム送信の受け方・Express API との役割分担、静的生成・動的レンダリング・再検証・Vercel へのデプロイ。第10部以降は Express + React 版を主に進め、Next.js での書き方を各章で補足する | タスク管理アプリを Next.js で作り直し、Express + React 版と比べる |
| 10 認証とセキュリティ | `part10-auth-security` | 51 認証の基礎 / 52 セッションとトークン / 53 メール送信と本人確認 / 54 OAuth 2.0 と OpenID Connect / 55 Web セキュリティの総点検 | ハッシュ化（bcrypt / Argon2）・認証と認可、Cookie セッションと JWT・`HttpOnly`・`Secure`・`SameSite`、SMTP・SPF・DKIM・メール送信サービス・登録確認とパスワードリセット・Mailpit、GitHub ログイン、XSS・CSRF・SQL インジェクション・CSP・OWASP Top 10、依存パッケージの脆弱性とサプライチェーン。**攻撃の再現は自分のローカル環境に限る** | ユーザー登録・メール確認・ログイン |
| 11 テストとコード品質 | `part11-testing` | 56 テストの考え方 / 57 API とデータベースのテスト / 58 フロントエンドのテスト / 59 静的解析と CI | 単体・結合・E2E、`node:test` と Vitest、HTTP レベルのテスト・テスト用 DB、Testing Library・Playwright、ESLint とフォーマッタ・GitHub Actions | テストと CI が整ったアプリ |
| 12 デプロイと運用 | `part12-deploy` | 60 本番環境の考え方 / 61 Docker でコンテナ化 / 62 クラウドへのデプロイ / 63 ファイルの保存 / 64 バックグラウンドジョブ / 65 CDN とキャッシュ / 66 監視とパフォーマンス | 開発と本番・ビルド・プロセス管理・シークレット、Dockerfile・マルチステージ・Apple Silicon と CPU アーキテクチャ、PaaS（Render、Fly.io など）・マネージド DB・独自ドメインと HTTPS、オブジェクトストレージ（S3 互換）・署名付き URL・MinIO、キュー（BullMQ + Redis）・定期実行・再試行と冪等性、CDN の仕組み・`Cache-Control` の設計・キャッシュの消し方、ログとエラー監視・計測してから改善・複数プロセスとロードバランサ | 画像添付・メール通知つきで独自ドメインに公開 |
| 13 総合演習 | `part13-capstone` | 67 要件と設計 / 68 実装（前半） / 69 実装（後半） / 70 公開と振り返り | 機能一覧・画面・API・テーブル設計・Express + React か Next.js かの選択、認証と中心機能、リアルタイム・ファイル保存・バックグラウンドジョブなど、デプロイ・README とポートフォリオ化・次に学ぶこと。教材の指示なしで進めることが目的 | 自分で決めた題材のアプリ |

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
| 第1部から外した問題（2026-11-09、学習者の決定）: 非同期の合計のバグ（旧 第4章 `bug-async.mjs`。forEach + async、Promise.all）、オプションのオブジェクトの共有のバグ（旧 第4章 `bug-shared-options.mjs`。参照とコピー）、環境を診断する `env-report.mjs`（旧 第2章。child_process・JSON） | 第1部では扱わない（削除済み） | 第3部を作り直すときに、デバッガの練習として第11〜12章・第15章に入れる |
| `.mjs`、`node:` プレフィックス、ES Modules | 第2章サンプル | 第3部 第14章 ✅ |
| npm、semver、`sudo npm install -g` をしない理由 | 第1章8.3節、第2章6.6節 | 第3部 第14章 ✅ |
| パストラバーサル対策、MIME タイプ | 第4章 `serve.mjs` | 第4部 第19章 ✅ |
| `innerHTML` と XSS、`textContent` | 第4章 `demo.js` | 第4部 第21章 ✅、第10部 第55章 |
| 秘密情報（`.env`）とローテーション | 第3章13.3節、練習問題5 | 第10部、第12部 第60章 |
| ESLint の設定、CI | 第4章4節 | 第11部 第59章 |

### 第2部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| HTML のエスケープと XSS（`escapeHtml`、`textContent`） | 第10章2.3節・3.1節・練習問題6・7 | 第4部 第21章 ✅、第10部 第55章 |
| ボディを Stream として読む、大きなアップロード | 第6章11.2節 | 第3部 第15章 ✅（Stream・背圧）、第4部 第20章 ✅ |
| ルーティングを `split('/')` で書く。大きい版の `todo-spa.mjs` は正規表現（`/^\/api\/tasks\/(\d+)$/`） | 第10章5節・練習問題1・3・6 | 第4部 第18章 ✅ |
| セッション（ランダムな ID、署名付き Cookie、Flask の `session`・`flash`） | 第7章3節、第8章2節、第10章練習問題7 | 第4部 第22章 ✅、第10部 第52章 |
| CSRF（GET で状態を変えない、`SameSite`、CSRF トークン） | 第10章6.1節 | 第4部 第22章 ✅（`SameSite`・トークン）、第10部 第55章 |
| パスワードのハッシュ化（bcrypt / Argon2） | 第8章2節 | 第10部 第51章 |
| Shift_JIS などの変換を npm のパッケージ（iconv-lite）で行う | 第7章2節 | 第3部 第14章 ✅ |
| Public Suffix List をパッケージ（tldts など）で扱う | 第9章練習問題6 | 第3部 第14章 ✅ |
| Express の cors・ログ（morgan など）・エラーハンドリングのミドルウェア | 第9章5.5節、第6章練習問題7、第10章練習問題6 | 第5部 第24章 ✅ |
| REST の設計（ページネーション、バリデーション、エラーの形） | 第10章5節・練習問題5 | 第5部 第25章 ✅ |
| SSE・WebSocket で画面とサーバのずれを減らす | 第10章練習問題4 | 第5部 第27章 ✅、第8部（画面から受け取る） |
| 冪等キーをデータベースに保存する、トランザクション | 第10章練習問題8 | 第6部 第30章 |
| 開発サーバのプロキシ（Vite の proxy）で CORS を避ける | 第9章5節、練習問題5の解答 | 第8部 第40章 |
| 画面とサーバの状態のずれ、取り直し（TanStack Query） | 第10章3.3節・練習問題4 | 第8部 第39章・第43章 |
| SSR とハイドレーション、ソフト 404 | 第10章4.2節・練習問題4 | 第8部 第46章 |
| 例外でサーバが止まる（第2部は同期の例外。unhandled rejection は第3部）、待っている間の割り込み（第2部は `setTimeout`） | 第10章練習問題6・8 | 第3部 第12〜13章 ✅ |
| `node:test` によるテスト | 第7〜9章の `*.test.mjs` | 第11部 第56章 |
| 本番の HTTPS（リバースプロキシ、独自ドメインの証明書、HSTS の preload） | 第8章、第10章1節 | 第12部 第62章 |
| 計測してから改善する（接続の時間、最初の1バイト） | 成果物 | 第12部 第66章 |

### 第3部（作成済み）で学習者が持っているもの

- 第11章: 型と比較、クロージャ、`this`、プロトタイプとクラス、参照とコピー。解答の部品: `once`・`memoize`・`debounce`・`pipe`（`functions.mjs`）、`parseLine`・`summarize`（アクセスログの集計。`log-summary.mjs`）、`LRUCache`、`deepEqual`・`setIn`
- 第12章: Promise と async/await、`Promise.all`・`allSettled`・`race`・`any`、ループと `await`、`AbortController`・`AbortSignal.timeout`・`AbortSignal.any`。解答の部品: `promisify`・`callbackify`、`mapLimit`（上限付きの並行、`signal` 対応）、`retry`（指数バックオフ・タイムアウト・中止）
- 第13章: タスクとマイクロタスク（ESM のトップレベルではマイクロタスクが `nextTick` より先、CJS では逆）、フェーズ、libuv のスレッドプール、イベントループを止める処理、Worker（`report-worker.mjs`）、`setImmediate` で分割（`chunked.mjs`）、ReDoS（`slug.mjs`）、`monitorEventLoopDelay` と自作の遅れの監視（`lag-monitor.mjs`）、プロセスが終わる条件（`unref`）
- 第14章: ESM と CJS とその混ぜ方（`require(esm)`、トップレベル await があると `ERR_REQUIRE_ASYNC_MODULE`）、`exports`・`imports`（`#config`）、semver（`semver.mjs` を自作）、ロックファイルと `npm ci`、npm scripts と `node_modules/.bin`、install scripts の危険（npm 11 の `allowScripts`）、`npm pack` と `files`。iconv-lite（cp932）と tldts（`allowPrivateDomains`）を使った
- 第15章: `path`、`fs/promises` とエラーの code、**壊れない書き込み** `writeFileAtomic`・`updateJson`（`atomic.mjs`）、EventEmitter（`JobQueue`）、Buffer と文字コードの境目（`TextDecoder` の `stream`）、Stream・`pipeline`・背圧・Transform（`createLineSplitter`）、`readline`、gzip のログを流して集計、`execFile` と `exec`、上限付きでフォルダを歩く `dirSize`
- 第16章: シバン・`bin`・`npm link`、`util.parseArgs` とサブコマンド、`isTTY`、`styleText` と `NO_COLOR`・`FORCE_COLOR`、`process.exit()` はパイプへの出力を切る（`exitCode` を使う）、EPIPE、SIGINT・SIGTERM（130・143、2回目はすぐ終わる）、XDG と設定の優先順位（`loadConfig`）、`confirm`（端末でなければ `--yes` が必要）、CLI を `spawn` でテストする
- 成果物 `project-memo-cli/solutions/`: `memo` コマンド（外部パッケージなし）。front matter は JSON の形で書き YAML の一部だけを読む、id は `YYYYMMDD-HHmmss` で前方一致、利用者の id はパスに使わず一覧と照らし合わせる、新規作成は一時ファイル + `link`（上書きしない）、書き直しは一時ファイル + `rename`、`rm` は `.trash` へ移す、エディタはシェルを通さず `spawn`。テストは `node --test "test/*.test.mjs"`、`cli.test.mjs` は `MEMO_BIN` で学習者の実装も確かめられる

### 第3部で決めた書き方・作り方（第4部以降もそろえる）

- ポート: 第12章 9120・9121 / 第13章 9130〜9132（第14〜16章と成果物はポートを使わない）。第4部は 9170 以降など、別の番号の帯を使う
- 練習問題のひな形は、書く場所に `// ここを書く`。解答の直したところは `// 修正:`、足したところは `// 追加:`。テストか確認スクリプトで「直す前に何個失敗するか」を問題文に書く
- 確認スクリプトは `bash check-xxx.sh [確かめるファイル]` のように **`bash` を付けて**動かす前提で書く（OneDrive の同期で実行の許可が外れることがあるため）。`check 名前 期待 実際` の関数で `[OK]`・`[NG]` を出し、最後に「すべて成功しました」か「N 件失敗しました」（終了ステータス 1）
- 一時ファイルは `os.tmpdir()`（`fs.mkdtemp`）に作り、最後に消す。`npm install` するものは `~/dev` の下（第14章は `setup-ch14.sh` で `~/dev/ch14` を作る。既にあれば何もしない）
- 章をまたいで解答を使うときは、相対パスで `import` してよい（例: 第15章の `log-stream.test.mjs` は `../../ch11-js-refresher/solutions/log-summary.mjs` の `parseLine` を使う）。成果物には、使う解答を `src/` にコピーした
- 子プロセスで node を起動するときは `process.execPath` を使う。CLI のテストでは `env` を必要なものだけにし、`HOME` を一時フォルダにする
- 端末でしか確かめられない動き（`Ctrl+C`、`Ctrl+D`、色）は、擬似端末（Python の `pty`）で実際に確かめてから書いた
- npm・Node.js の版で変わる動き（install scripts の扱い、`require(esm)`、`readline` の `question` が入力の終わりで止まる、など）は「執筆時点では（Node.js 26 / npm 11 で確かめた）」と書く
- `node --test` を引数なしで動かすと、`test/` の中の `.mjs` がすべてテストとして動く。テストの補助のファイルを `test/` に置くときは、`"test/*.test.mjs"` のように絞るか、動かされても害が無いようにする

### 第3部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| パストラバーサル（`path.join` は `..` を止めない、`path.relative` で外を指すか調べる） | 第15章 練習問題1、成果物 2.2節 | 第4部 第19章 ✅ |
| ボディの大きさの上限、Stream で読むリクエストのボディ | 第15章7節 | 第4部 第20章 ✅ |
| サーバを止めるとき（受け付けをやめ、処理中を終えてから終わる） | 第16章8.2節 | 第4部 第17章 ✅、第12部 第60章 |
| `crypto.timingSafeEqual`、パスワードのハッシュ化 | 第15章8.1節 | 第10部 第51・52章 |
| コマンドインジェクション（`exec` と `execFile`）、エディタをシェルで起動しない | 第15章8.2節、成果物 3.4節 | 第10部 第55章 |
| 依存パッケージの危険（install scripts、typosquatting、`npm audit`） | 第14章12節 | 第10部 第55章 |
| Worker のプール、複数プロセス、イベントループの遅れの監視 | 第13章6〜7節 | 第12部 第66章 |
| ReDoS を静的解析で見つける（eslint-plugin-regexp など） | 第13章 練習問題5 | 第11部 第59章 |
| 同時に書き直すと片方が消える（ロック、楽観的ロック、一意制約） | 第15章 練習問題2、成果物 5節 | 第6部 第30章 |
| テストの考え方（関数のテストと外からのテストの分け方） | 第16章10節 | 第11部 第56章 |

### 第4部（作成済み）で学習者が持っているもの

章をまたいで、前の章の模範解答を相対パスで `import` して使う作りにした。後の部でも、これらの部品と比べながら説明できる。

- 第17章: `createApp(handler, { logger, now })`（例外を 400 番台は `HttpError` のメッセージで・それ以外は 500 で JSON にする、`X-Request-Id`、`close` でアクセスログ）と `HttpError(status, message, { headers })`（`solutions/app.mjs`）、`sendText`・`sendHtml`・`sendJson`・`redirect`・`noContent`（`solutions/send.mjs`）、グレースフルシャットダウン（`server.close()` は Node 19 以降 idle の接続も閉じる。止めている間の応答には `Connection: close`）、`headersTimeout`・`requestTimeout`
- 第18章: `Router`（`get`/`post`/…、`handle` はアロー関数のフィールド。`req.pathname`・`req.query`（URLSearchParams）・`req.params`、405 + Allow、HEAD → GET、OPTIONS は 204、最後の `/` は 308（`//` へは送らない）、URIError は 400）、`parsePattern`・`matchPath`・`comparePatterns`（`:name` と最後の `*`）、`parseQuery`・`QueryError`、Koa 風の `compose`。URLPattern は Node 26 でグローバル
- 第19章: `safePath`・`resolveFile`（`path.relative` で外を指すか、ドットファイル、シンボリックリンク）、`serveStatic(root, { mount, index, cacheControl, range })`（弱い ETag・304・Range・HEAD）、`parseRange`、`negotiateEncoding`、`samples/mime.mjs` の `contentType`・`isCompressible`。nosniff で text/plain の JS が動かないことは Chromium で確かめた
- 第20章: `readBody`（`Content-Length` で先に断る、`data` + `pause` で数える。`for await` の途中の `throw` では 413 を返せない）・`mediaType`・`readText`・`readJson`・`readForm`（`solutions/body.mjs`）、`safeMerge`（JSON Merge Patch、`__proto__` などは 400）・`pick`、`detectImageType`・`saveImage`（中身で種類を調べ、名前は randomUUID）、`samples/form-data.mjs` の `readFormData`（上限付きで読んでから `Request.formData()`）
- 第21章: `samples/mini-html.mjs` の `html` タグ・`raw`・`escapeHtml`・`SafeHtml`（null・undefined・false は出さない、配列はつなぐ）、`attrs`・`safeUrl`（http・https・mailto・相対だけ）・`jsonForScript`（`<>&`・U+2028/2029 を `\uXXXX`）・`queryString`（`solutions/html-helpers.mjs`）、`layout`・`taskList`・`paginate`・`pagination`（`solutions/views.mjs`）、小さなテンプレートエンジン `compile`（tokenize → parse → render、`Object.hasOwn` だけをたどる、eval しない）、CSP の nonce
- 第22章: `parseCookies`・`serializeCookie`（名前は token、SameSite=None には Secure、`__Host-`・`__Secure-` の決まり）・`clearCookie`（`solutions/cookie.mjs`）、`sign`・`unsign`（HMAC、最後の `.`、鍵の配列で取り替え、32 文字以上）・`signJson`・`unsignJson`（`iat` で期限）、`SessionStore`（`ttlMs`・`now`、`create`/`get`/`set`/`destroy`/`regenerate`/`prune`）・`withSession`（`res.writeHead` を包んで保存、知らない ID は使わない、空のセッションは作らない、`req.regenerateSession()`・`req.destroySession()`、`Cache-Control: no-store`）・`newSessionId`（32 バイトの base64url）、パスワードは salt 付きの scrypt + `timingSafeEqual`（無いユーザーでもダミーで計算）、flash、CSRF トークン
- 成果物 `project-bbs/solutions/`: 簡易掲示板（`~/dev/bbs` で作る。外部パッケージなし、ポート 9230）。`src/lib/` に第17〜22章と第3部の `atomic.mjs` をコピー（`import` のパスだけ変更）。`Store`（JSON のファイル、書き込みは Promise の鎖で1つずつ、`writeFileAtomic`）、`createBbsApp({ store, sessions, publicDir })` = `withSession(createApp(handler))`、`HttpError` は HTML の画面（401 は /login へ、/api と 413 は JSON のまま）、見るだけの客にはセッションを作らない、CSP は `script-src 'none'`。テスト `test/bbs.test.mjs` は `BBS_SERVER` のサーバを子プロセスで起動し（9231、`DATA_DIR` は一時フォルダ）、HTTP だけで 17 個確かめる

### 第4部で決めた書き方・作り方（第5部以降もそろえる）

- ポート: 第17章 9170〜9179 / 第18章 9180〜9184 / 第19章 9190〜9195 / 第20章 9200〜9205 / 第21章 9210〜9215 / 第22章 9220〜9225 / 成果物 9230（テスト 9231）。第5部は 9300 以降など、別の帯を使う
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
| 入力の確かめをライブラリで（zod など）、エラーの形をそろえる | 第20章 練習問題4、成果物 2.2節 | 第5部 第25章 ✅、第7部 第38章 |
| セッションをデータベース・Redis に置く、サーバが複数台 | 第22章 4.3節 | 第6部 第34章、第10部 第52章 |
| JSON のファイルの代わりにデータベース、一意制約、同時の書き込み | 成果物 3.3節 | 第6部 第29〜31章 |
| パスワードのハッシュ（bcrypt・argon2 との比べ）、認証と認可 | 第22章 6.1節、成果物 3.5節 | 第10部 第51章 |
| 署名付きトークン（JWT）と、Cookie のセッションとの比べ | 第22章 5.1節 | 第10部 第52章 |
| XSS・CSRF・CSP の総点検、`Origin` ヘッダでの CSRF 対策、fetch で送る API の守り方 | 第21章 2.1・8節、第22章 8節 | 第10部 第55章 |
| HTTPS での `Secure`・`__Host-` の Cookie | 第22章 2.1〜2.2節 | 第12部 第62章 |
| テンプレートエンジン（EJS・Nunjucks など）と React の JSX のエスケープ | 第21章 1・6節 | 第5部 第23章 ✅、第8部 第41章 |
| 外から HTTP で確かめるテスト、テスト用のデータ | 成果物 `test/bbs.test.mjs` | 第11部 第57章 |

### 第5部（作成済み）で学習者が持っているもの

第5部は外部パッケージを使う。`part05-express/setup-part05.sh` が部のフォルダを `~/dev/part05` にコピーして `npm ci --ignore-scripts`（作成先があれば何もしない）。`package.json` で版を固定: express 5.3.0、cors 2.8.6、morgan 1.12.1、express-session 1.19.0、zod 4.6.7、pino 10.4.0、ws 8.22.1、fastify 5.12.8、hono 4.13.16、@hono/node-server 2.1.6。`part05-express/lib/` に第4部の部品と `problem.mjs` のコピー（章をまたぐ `import` はここを通す）。

- 第23章: Express 5 の動き（`req.query` は getter で代入すると例外、同じ名前のクエリは配列、405 は無く 404、HEAD・OPTIONS は自動、`res.send(数)` の落とし穴、async の throw は 500 に届く、自動の弱い ETag）。`resource`（405 + Allow）、第21章のエンジンをビューエンジンに
- 第24章: `mini-express`（列と `next`）、`rateLimit`（固定の窓、`RateLimit-*`・`Retry-After`）、`accessLog`、express-session の正しい設定。Express の `next()` は Promise を返さない
- 第25章: `HttpProblem`・`problemHandler`・`notFound`（problem+json、ZodError → 422 + `errors[].pointer`、body-parser のエラーの読み替え）、`paginate`（署名つきカーソル、値で探す、1件多く取る）、`parseListQuery`（`z.coerce` を使わず数字だけの文字列、知らない名前・2回の指定は 400 + `errors[].parameter`）、`evaluatePreconditions`（RFC 9110 13.2.2 の順、強い比べ方と弱い比べ方、428）、冪等キーのサンプル
- 第26章: 3つの層（routes → services → repositories、エラーはサービスのクラスを `mapDomainErrors` で HTTP に）、`loadConfig`（zod で環境変数、値はエラーに書かない、`ConfigError`）、pino と `requestLogger`（応答の後に1行、`reqId`、`redactUrl`）、`/healthz`・`/readyz`、SIGTERM で止める（遅らせる・時間切れで 1）
- 第27章: ポーリング・ロングポーリング（`createWaiter` の片付け）・SSE（`formatEvent`・`createEventStreamParser`、`createEventHub`・`sseRoute`、`Last-Event-ID` と `reset`、心拍）・WebSocket（手書きのハンドシェイクとフレーム、ws、Origin の完全一致、`maxPayload`、心拍）。Node 22+ のグローバルな `WebSocket` は Origin を送らない
- 第28章: 同じ API を Express・Fastify・Hono・Web 標準のハンドラで書き、`contract.mjs` の同じテストで確かめる。Fastify の既定（`coerceTypes`、`removeAdditional`、text/plain を読む、レスポンスのスキーマに無い項目は出ない、`err.validationContext`）。Web 標準とつなぐアダプタ（`rawHeaders`、`getSetCookie`、流す、`request.signal`）、小さなルーター（URLPattern、405、HEAD、玉ねぎのミドルウェア）。Koa・NestJS はコードの形だけ
- 成果物 `project-task-api/solutions/`（`task-api` パッケージ。`~/dev/task-api` で作る。express・zod・pino・cors だけ、ポート 9360）: 第26章 9節の形。`src/lib/`・`src/middleware/` に前の章の解答をコピーし、変えた所に `// 追加（成果物）:`・`// 変更（成果物）:`。タスクは `{ id, title, status, dueDate, createdAt, updatedAt, completedAt, version }`、ETag は `"version"`、PATCH・DELETE は If-Match 必須（428・412）、`expectedVersion` をデータの層まで渡す（SQL の `WHERE version = $2` にあたる）、サービスは `publish(type, task)` だけを受け取り、`server.mjs` が hub につなぐ。SSE は `task.created`・`task.updated`・`task.deleted`、止めるときに `sse.closeAll()` で `shutdown` を送ってから `server.close()`。設定は第26章の `loadConfig` に `CURSOR_SECRET`（本番で必須）・`RATE_LIMIT_PER_MINUTE`・`MAX_DOING`・`SSE_HEARTBEAT_MS` を足した。テスト `test/api.test.mjs` は `API_SERVER` のサーバを子プロセスで起動し（9361、一部 9362）、HTTP だけで 25 個確かめる

### 第5部で決めた書き方・作り方（第6部以降もそろえる）

- ポート: 第23章 9300〜9309 / 第24章 9310〜9319 / 第25章 9320〜9329 / 第26章 9330〜9339 / 第27章 9340〜9349 / 第28章 9350〜9359 / 成果物 9360（テスト 9361・9362）。第6部は 9400 以降など、別の帯を使う
- サーバのサンプルは `listen(port)` を export し、`import.meta.main`（Node 24.2+）のときだけ決まった番号で待つ。テストは空いている番号
- 第6部以降の成果物は、前の部の `project-task-api/solutions/` を出発点にする。データの層の形（`list`・`get`・`insert`・`update(id, fields, { expectedVersion })`・`remove(id, { expectedVersion })`）を保ったまま PostgreSQL に替える。`test/api.test.mjs` は、そのまま通ることを目標にする
- 外のパッケージの版で変わる動き（Fastify の ajv の既定など）は、実際に入れた版で確かめ、版を書く
- 執筆時点では Node.js 24.22 と 26.13 で、すべてのテストと確認スクリプトの模範解答が通ることを確かめた

### 第5部で予告した内容（後の部で回収する）

| 予告した内容 | 予告した場所 | 回収する部・章 |
| --- | --- | --- |
| カーソルの条件・`WHERE version = $2`・冪等キーをデータベースで（索引、トランザクション、一意制約） | 第25章 6.2・7.3・8.2節、成果物 3.3節 | 第6部 第30章 |
| 並べ替えの項目を決めた表から選ぶ理由（SQL インジェクション）、プレースホルダ | 第25章 練習問題1の解答 | 第6部 第31章 |
| メモリのデータの層を PostgreSQL のものに取り替える | 第26章 3・9節、成果物 7節 | 第6部 第31〜33章 |
| 回数の制限・SSE のハブ・セッションを複数台で共有（Redis、Pub/Sub） | 第24章 5節、第27章 4.5節 | 第6部 第34章、第12部 第66章 |
| zod のスキーマから TypeScript の型を作る | 第25章 5.1節 | 第7部 第38章 |
| SSE を画面から受け取る、CORS で Vite の画面から呼ぶ | 第27章 5節、成果物 2.8節 | 第8部（第39・43章） |
| Next.js の Route Handlers を動かす | 第28章 5.2節 | 第9部 第49章 |
| 401・403、ログインしたユーザーごとの冪等キー・回数の制限、WebSocket・SSE の認証 | 第25章 3.2節、第27章 3.3節、成果物 5節 | 第10部 |
| helmet・CSP などのヘッダの総点検 | 第24章 6節 | 第10部 第55章 |
| `req.ip` とリバースプロキシ（`trust proxy`）、本番の `.env` の代わり、圧縮 | 第23章 4節、第24章 6節、第26章 5.3節 | 第12部 第60〜62章 |
| ファイルのアップロード（multer、オブジェクトストレージ） | 第24章 6節 | 第12部 第63章 |
| 二重に実行されても困らないジョブ（冪等キーの考え方） | 第25章 8.2節 | 第12部 第64章 |
| 構造化ログを集めて探す・数える | 第26章 6.1節 | 第12部 第66章 |

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
