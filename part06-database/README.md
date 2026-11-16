# 第6部 データベース

第5部のタスク管理 API は、データをメモリに置いていたので、サーバを止めると消えました。この部では、データを**データベース**に置きます。まず Node.js に入っている SQLite で SQL を一通り学び、次に Docker で PostgreSQL を動かして、Web のサービスで使う形にします。最後に、ORM（Drizzle）とキャッシュ（Redis）にも触れ、成果物で API のデータの層を PostgreSQL に取り替えます。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第29章 リレーショナルデータベースと SQL](ch29-sql-basics/README.md) | 表・行・列、`SELECT`・`INSERT`・`UPDATE`・`DELETE`、制約、主キーと外部キー、正規化。`node:sqlite` と `sqlite3` で手を動かす | 5〜6時間 |
| [第30章 SQL の実践](ch30-sql-practice/README.md) | JOIN と LEFT JOIN、GROUP BY と HAVING、インデックスと EXPLAIN、トランザクション、version による同時の書き換えの防ぎ方、カーソルのページ分け | 5〜6時間 |
| [第31章 Node.js からデータベースを使う](ch31-node-db/README.md) | 値は `?` で渡す（SQL インジェクションを防ぐ）、行とオブジェクトの変換、リポジトリ、トランザクションの関数、マイグレーション、制約のエラーを 409・422 に | 5〜6時間 |
| [第32章 Docker と PostgreSQL](ch32-docker-postgres/README.md) | Docker と Compose、psql、`pg` の `Pool` と `$1`、型と日付の落とし穴、接続を借りて返す、ロック、エラーコード、SQL のファイルでマイグレーション | 6〜7時間 |
| [第33章 ORM とマイグレーション](ch33-orm-drizzle/README.md) | Drizzle のスキーマとクエリビルダ、drizzle-kit、`toSQL()`、N+1、トランザクションと `err.cause`、ORM を使うか SQL を書くか | 5〜6時間 |
| [第34章 キャッシュと Redis 入門](ch34-redis/README.md) | redis-cli、TTL、cache-aside、`INCR` と回数の制限、セッションを Redis に、Pub/Sub、Redis に置くもの・置かないもの | 4〜5時間 |
| [成果物 タスク管理 API を PostgreSQL で](project-task-api/README.md) | 第5部の API のデータの層を PostgreSQL に替える。起動のときのマイグレーション、1つの SQL のページ分け、同時に来ても正しい、止めても残る | 6〜10時間 |

## 準備

第6部のサンプルと練習問題は、外部のパッケージ（pg・drizzle-orm・redis など）を使います。第5部と同じく、**第6部のフォルダを `~/dev/part06` にコピーし、そこで動かします**。第29章の最初に、次を1回だけ実行します。

```sh
$ bash （ここに Finder から part06-database フォルダの中の setup-part06.sh をドラッグ）
```

- `~/dev/part06` が作られ、`npm ci` でパッケージが入ります。終わったら `cd ~/dev/part06/ch29-sql-basics` で第29章のフォルダに移ります
- [setup-part06.sh](setup-part06.sh) は、作成先（既定 `~/dev/part06`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（pg 8.23.1、drizzle-orm 0.45.4、drizzle-kit 0.31.11、redis 6.3.1、express 5.3.0、zod 4.6.7、pino 10.4.0）
- 第29〜31章は、Node.js に入っている SQLite（`node:sqlite`）を使うので、Docker は要りません。第32章で Docker を入れ、[compose.yaml](compose.yaml) で PostgreSQL と Redis を動かします（第32〜34章と成果物で使います）
- 成果物は、第5部で作った `~/dev/task-api` で、新しいブランチを作って進めます（[project-task-api/README.md](project-task-api/README.md) の1節）

## 各章の使い方

第1〜5部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている。「手を動かす」の節で、ファイルを自分で書いて動かす |
| `samples/` | 「手を動かす」で書くプログラムの完成形（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- 練習問題の多くは、**テスト**（`node --test ○○.test.mjs`）で確かめます。最初はほとんど失敗し、すべて成功すれば完成です。模範解答は `MODULE=../solutions/○○.mjs node --test ○○.test.mjs` で確かめられます
- 第32〜34章の練習問題のテストは、PostgreSQL や Redis を使います。テストは、テストごとに別の箱（PostgreSQL のスキーマ、Redis のキーの頭）を作り、終わったら消すので、本文で作ったデータには触りません
- サーバは `127.0.0.1` だけで待ち受けます。ポートは章ごとに分けています: 第31章 9420〜9429、第32章 9430〜9439、第33章 9440〜9449、第34章 9450〜9459、成果物 9460（テストは 9461・9462）。PostgreSQL は **5433**、Redis は **6380** です（Mac に別の PostgreSQL・Redis があっても、ぶつからない番号にしました）
- パスワード `dev-only-password` は、この Mac の中だけで使う開発用の仮のものです。本番では使いません（第12部 第60章）
- SQL インジェクションのような攻撃の仕組みにふれる所は、どれも**自分の Mac の中のデータベースとサーバ**だけを相手にし、「自分のプログラムが正しく防げるか」を確かめるものです
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしています
- Flask と比べる説明では、まず Flask（SQLAlchemy・Flask-Migrate など）が何をしてくれていたのかを説明してから、Node.js で同じことを書きます

## 第6部を終えたときにできること

- 表を設計し、制約（`NOT NULL`・`CHECK`・`UNIQUE`・外部キー）で、データの決まりをデータベースに守らせられる
- JOIN・GROUP BY・インデックス・トランザクションを使い、`EXPLAIN` で遅い SQL に気づける
- 値を `?`・`$1` で渡して、SQL インジェクションを防げる。リポジトリに SQL を閉じ込め、形をそろえて取り替えられるようにできる
- Docker と Compose で PostgreSQL を動かし、`pg` のプール・トランザクション・ロック・エラーコードを正しく使える
- マイグレーションで、表の形の変更を順番に、安全に当てられる
- ORM の良い所と気をつける所を知り、送る SQL を確かめながら使える。N+1 に気づいて直せる
- Redis にキャッシュ・回数・セッション・知らせを置き、サーバが何台でも正しく動くようにできる
- 同時に来たリクエストでも、データが壊れないように作れる

## 第6部で作るもの

- 選ぶ・変える SQL、制約のある表、本を足す・探す関数、外部キーでつないだタスクの表、タスクを SQLite に保存する CLI（第29章）
- JOIN と集計の SQL、記録を残すトランザクション、カーソルのページ分け、上書きと二重作成を防ぐ関数（第30章）
- `?` で探す関数、並べ方の許可リスト、リポジトリ、マイグレーション、まとめて「全部か、何もしないか」、エラーを分かる文にする関数、ETag と If-Match で守る API（第31章）
- PostgreSQL のタグ付け、`SKIP LOCKED` の仕事の列、同時に起動しても安全なマイグレーション（第32章）
- Drizzle のスキーマ、条件を組み立てる一覧、N+1 を直したレポート、drizzle-kit のマイグレーション（第33章）
- cache-aside、窓の回数の制限、延びるセッション、キャッシュをかぶせたリポジトリ、Pub/Sub の部品、Redis の回数の制限のミドルウェア（第34章）
- タスク管理 API の PostgreSQL 版（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第5部 Express とサーバサイドの設計](../part05-express/README.md) ／ 次: [第7部 TypeScript](../part07-typescript/README.md)
