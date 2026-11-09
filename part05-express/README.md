# 第5部 Express とサーバサイドの設計

第4部では、`node:http` だけで、ルーター・静的ファイル・ボディの読み取り・HTML・セッションを自分で作りました。この部では、それを Express に任せ、その上で「よいサーバ」にするための設計を学びます。API の URL とステータスコードの決め方、エラーの形、入力の確かめ、ページ分け、同時の書き換え、層の分け方、設定・ログ・止め方、リアルタイムの通知です。

この部の成果物のタスク管理 REST API は、第12部まで育て続けるアプリの出発点です。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第23章 Express 入門](ch23-express-intro/README.md) | Flask と Express がすること、ルーティング、`req`・`res` に足されたもの、ボディ、静的ファイル、ビューエンジン、エラーの扱い。第4部の部品との対応 | 4〜5時間 |
| [第24章 ミドルウェア](ch24-middleware/README.md) | ミドルウェアの列と `next`、エラーの流れ、応答の後の処理、自分で書く、cors・morgan・express-session、`express.Router`、Express の中身 | 5〜6時間 |
| [第25章 REST API の設計](ch25-rest-api-design/README.md) | リソースと URL、メソッドとステータスコード、problem+json、zod、カーソルのページ分け、ETag と If-Match、冪等キー、OpenAPI | 5〜6時間 |
| [第26章 アプリケーションの構成](ch26-app-structure/README.md) | ルート・サービス・データの3つの層、使うものを外から渡す、設定と環境変数、JSON のログ、ヘルスチェック、きれいに止める、フォルダの形 | 5〜6時間 |
| [第27章 リアルタイム通信](ch27-realtime/README.md) | ポーリング・ロングポーリング・SSE・WebSocket の仕組みと選び方、片付け、Origin・大きさ・心拍 | 5〜6時間 |
| [第28章 他のフレームワークの地図](ch28-framework-map/README.md) | Fastify・Hono・Koa・NestJS・Next.js の Route Handlers、Web 標準の Request と Response、契約のテスト | 4〜5時間 |
| [成果物 タスク管理 REST API](project-task-api/README.md) | 第23〜28章の部品で、ページ分け・ETag・冪等キー・SSE・設定・ログ・止め方のそろった API を作る。データはメモリ | 10〜15時間 |

## 準備

第5部のサンプルと練習問題は、外部のパッケージ（Express など）を使います。教材のフォルダ（OneDrive の中）に `node_modules` を作らないように、**第5部のフォルダを `~/dev/part05` にコピーし、そこで動かします**。

```sh
$ N=~/Library/CloudStorage/OneDrive-個人用/program/nodejs
$ bash $N/part05-express/setup-part05.sh        # ~/dev/part05 を作り、npm ci で入れる
$ cd ~/dev/part05/ch23-express-intro/samples
$ node hello-express.mjs
```

- [setup-part05.sh](setup-part05.sh) は、作成先（既定 `~/dev/part05`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（express 5.3.0、zod 4.6.7、pino 10.4.0、ws 8.22.1、cors 2.8.6、morgan 1.12.1、express-session 1.19.0、fastify 5.12.8、hono 4.13.16、@hono/node-server 2.1.6）。`npm ci` は、ロックファイルのとおりに入れます（第3部 第14章 9節）
- [lib/](lib/) には、第4部と第25章の模範解答のうち、この部で使うもののコピーがあります
- 教材のフォルダを読みながら、`~/dev/part05` で動かして書き換えます。`~/dev/part05` の中を書き換えても、教材のフォルダは変わりません
- 成果物は、別に `~/dev/task-api` を作ります（[project-task-api/README.md](project-task-api/README.md) の1節）

## 各章の使い方

第1〜4部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている |
| `samples/` | 本文で使うサンプル（`samples/README.md` に一覧・ポート・動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- 練習問題の多くは、**テスト**（`node --test ○○.test.mjs`）か**確認スクリプト**（`bash check-○○.sh`）で確かめます。最初はほとんど失敗し、すべて成功すれば完成です。模範解答は `MODULE=../solutions/○○.mjs node --test ○○.test.mjs` や `bash check-○○.sh ../solutions/○○.mjs` で確かめられます
- 後の章の練習問題は、前の章の模範解答を `import` して使うことがあります。自分の解答を使いたいときは、`import` のパスを書き換えてください
- サーバは `127.0.0.1` だけで待ち受けます。ポートは章ごとに分けています: 第23章 9300〜9309、第24章 9310〜9319、第25章 9320〜9329、第26章 9330〜9339、第27章 9340〜9349、第28章 9350〜9359、成果物 9360（テストは 9361・9362）。テストの多くは、空いている番号を OS に選んでもらいます
- 攻撃の仕組みにふれる練習問題（入力の確かめ、WebSocket の Origin、ログに秘密を書かない、など）は、どれも**自分の Mac の中で動かしているサーバ**だけを相手にし、「自分のサーバが正しく断るか」を確かめるものです
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしていて、執筆時点では 24 と 26 で動作を確かめています
- Flask と比べる説明では、まず Flask が何をしてくれていたのかを説明してから、Express で同じことを書きます

## 第5部を終えたときにできること

- Express のルーティング・ミドルウェア・エラーハンドラの動きを、第4部で自分で作ったものと対応づけて説明できる
- リソースと URL、メソッドとステータスコードを、理由をつけて決められる。エラーを problem+json にそろえられる
- 外から届く値（ボディ・クエリ・パス・ヘッダ・環境変数）を zod で確かめ、落とし穴（型の変換、知らない項目）を避けられる
- カーソルのページ分け、ETag と If-Match の楽観的ロック、冪等キーを、仕様どおりに書ける
- ルート・サービス・データの層に分け、使うものを外から渡して、テストしやすく、取り替えやすくできる
- 設定・JSON のログ・ヘルスチェック・きれいに止める、の本番で要るものを書ける
- ポーリング・SSE・WebSocket から選び、片付けを忘れずに書ける
- ほかのフレームワークの考え方の違いを説明し、外から HTTP で叩く契約のテストで、同じ約束を確かめられる

## 第5部で作るもの

- 予想の問題、Express のタスク API、405 と `Allow` を足す `resource`、ビューエンジン（第23章）
- Express の芯 `mini-express`、`rateLimit`、`accessLog`、express-session の正しい設定（第24章）
- `problemHandler`、カーソルの `paginate`、`parseListQuery`、`evaluatePreconditions`（第25章）
- `loadConfig`、層に分けた `createTaskService`、`requestLogger`、`createTasksRouter`、きれいに止まるサーバ（第26章）
- SSE を書く・読む `formatEvent`・`createEventStreamParser`、`createEventHub`・`sseRoute`、WebSocket のフレーム、直したチャット、ロングポーリング（第27章）
- Web 標準とつなぐアダプタ、Hono の API、Fastify のスキーマ、小さなルーター（第28章）
- タスク管理 REST API（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第4部 フレームワークなしで Web サーバを作る](../part04-raw-http-server/README.md) ／ 次: 第6部 データベース（準備中）
