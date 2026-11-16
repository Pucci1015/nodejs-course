# 第6部の成果物 タスク管理 API を PostgreSQL で

第5部で作ったタスク管理 API（`~/dev/task-api`）は、データをメモリに置いていたので、サーバを止めると消えました。第6部のまとめとして、**データの層を PostgreSQL に取り替えます**。

第29〜34章で学んだことを組み合わせます。表の設計と制約（第29章）、キーセットのページ分けと version（第30章）、リポジトリの形をそろえる・制約のエラーを読み替える（第31章）、`pg` のプール・マイグレーション・アドバイザリロック（第32章）です。第5部の 25 個のテストがそのまま通り、さらに「同時に来ても正しい」「止めても残る」を確かめる 5 個のテストが通れば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜10時間 |
| 前提 | 第5部の成果物（`~/dev/task-api`）、第29〜32章（特に、第32章の練習問題8の模範解答） |
| 作るもの | `~/dev/task-api` の新しいブランチ。`npm start` で、PostgreSQL に保存する API が `http://127.0.0.1:9460/api/tasks` に立ち上がるもの |
| 確かめ方 | 完成例のテスト（[solutions/test/api.test.mjs](solutions/test/api.test.mjs)、30 個）を、自分の API に対して動かす |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`task-api` パッケージ）。外から HTTP で確かめるテスト付き |

> **読み方**
> - 作業は、第5部で作った `~/dev/task-api` で行います。1節で、Git のブランチを作ってから始めます。
> - PostgreSQL は、第6部の `compose.yaml` のものを使います（`~/dev/part06` で `docker compose up -d --wait`）。データベース `taskapi` は、最初に作ってあります。
> - 第33章の Drizzle は使いません。第32章の `pg` で、SQL を自分で書きます（SQL を読み書きできることを優先するため。第33章 8節）。
> - 一度に全部を替えようとせず、3.2節の順番で1つずつ替えて、そのつどテストを動かしてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| データの層だけを取り替える（形をそろえておく効き目） | 第7部（TypeScript で、データの層の型を決める）、第11部 第57章（テストで偽物に取り替える） |
| 起動のときのマイグレーションと、止めるときの `pool.end()` | 第12部（Docker・PaaS で本番に出す。マネージドの PostgreSQL） |
| 同時に来たときの正しさを、データベースで守る | 第10部（ログインした人ごとのデータ）、第12部（サーバを複数台にする） |
| テストごとにスキーマを分ける | 第11部 第57章（データベースを使うテスト） |

---

## 1. 準備

### 1.1 ブランチを作る

第5部の完成した形を残しておくため、新しいブランチで作業します（第1部 第3章）。

```sh
$ cd ~/dev/task-api
$ git status                     # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch -c part06-postgres  # 新しいブランチを作って、そこに移る
$ npm install --save-exact pg@8.23.1
$ mkdir -p src/db migrations
```

- `git switch -c 名前` は、今のコミットから新しいブランチを作って、そちらに移るコマンドです。うまくいかなくなったら、`git switch main`（第5部の最後の形）に戻れます。
- `pg` は、第32章で使ったものと同じバージョンです。

`package.json` の `scripts` に、マイグレーションだけを動かす `migrate` を足します。

```json
"migrate": "node --env-file-if-exists=.env src/db/migrate.mjs",
```

### 1.2 PostgreSQL を動かす

```sh
$ cd ~/dev/part06 && docker compose up -d --wait && cd ~/dev/task-api
$ (cd ~/dev/part06 && docker compose exec postgres psql -U app -d taskapi -c 'SELECT 1')
```

（`( … )` で囲むと、中の `cd` は、その中だけで効きます。終わった後も `~/dev/task-api` にいます。）

### 1.3 部品を持ってくる

第32章の部品を、コピーします。`N=~/dev/part06` としておくと、短く書けます。

```sh
$ N=~/dev/part06
$ cp $N/ch32-docker-postgres/solutions/safe-migrate.mjs src/db/migrate.mjs     # 練習問題8の模範解答
$ cp $N/ch32-docker-postgres/samples/pg-task-repo.mjs src/repositories/pg-tasks.mjs
```

コピーしたものは、そのままでは要件に足りません。何を足すかは、2節の要件と3節のヒントで考えてください。完成例では、第6部で足した所に `// 追加（第6部）:`、変えた所に `// 変更（第6部）:` のコメントを付けてあります。

## 2. 要件

第5部の成果物の要件（[../../part05-express/project-task-api/README.md](../../part05-express/project-task-api/README.md) の2節）は、**全部そのまま**です。URL・タスクの形・エラー・ETag・Idempotency-Key・SSE・止め方は変わりません。次のことを足します。

### 2.1 データを PostgreSQL に置く

- タスクは、PostgreSQL の表 `tasks` に置きます。サーバを止めて起動し直しても、残っています。
- Idempotency-Key で覚えた応答も、表に置きます。サーバを止めて起動し直しても、送り直しを見分けます。
- 書き換えの回数の上限（第24章）と、SSE のハブ（第27章）は、メモリのままでかまいません。

### 2.2 マイグレーション

- 表は、`migrations/` の SQL のファイル（`001_create_tasks.sql` など）で作ります。サーバの起動のとき、`listen` の前に、まだのものを動かします。`npm run migrate` でも動かせます。
- 2台のサーバが同時に起動しても、同じファイルを2回動かしません（アドバイザリロック。第32章 練習問題8）。
- 動かした後で書き換えられたファイルがあれば、何も動かさずに、起動をやめます（終了コード 1）。

### 2.3 同時に来ても正しい

| 場面 | 結果 |
| --- | --- |
| 同じ `If-Match` の PATCH が同時に3つ | 1つだけ 200、ほかは 412。version は1つだけ上がる |
| 同じ題名の POST が同時に5つ | 1つだけ 201、ほかは 409（problem+json） |
| 同じデータベースを使う2台のサーバに、同じ Idempotency-Key の POST が同時に | タスクは1つだけできる（ほかは、1回目と同じ 201 か、処理中の 409） |

### 2.4 設定

| 環境変数 | 意味 | 無いとき |
| --- | --- | --- |
| `DATABASE_URL` | つなぎ先（`postgres://ユーザー:パスワード@ホスト:ポート/データベース`） | 開発とテストでは `postgres://app:dev-only-password@127.0.0.1:5433/taskapi`。**本番（`NODE_ENV=production`）では起動しない** |
| `DATABASE_SCHEMA` | テーブルを置くスキーマ（英小文字・数字・`_`）。テストが使う | `public` |
| `DATABASE_POOL_MAX` | プールの接続の数（1〜100） | `10` |
| `PORT` | 待つポート | `9460`（第5部は 9360） |

- データベースにつなげないときは、ログに理由を書いて、終了コード 1 で止まります。ログに書く URL のパスワードは `***` に隠します。

### 2.5 止め方

- SIGTERM で止めるとき、第5部の手順の最後（リクエストが全部終わった後）に、`pool.end()` でプールの接続を閉じます。

## 3. 作り方のヒント

### 3.1 ファイルの分け方

第5部の形に、`db/` と `migrations/` が増えます。

```text
task-api/
├── migrations/
│   ├── 001_create_tasks.sql            表 tasks・部分ユニークインデックス・並べ方の索引
│   └── 002_create_idempotency_keys.sql 表 idempotency_keys
└── src/
    ├── config.mjs                      DATABASE_URL などを足す
    ├── server.mjs                      プール → migrate → repo。止めるときに pool.end()
    ├── db/
    │   ├── pool.mjs                    createPool（date を文字列で）・redactUrl
    │   └── migrate.mjs                 第32章 練習問題8
    ├── repositories/
    │   ├── pg-tasks.mjs                memory-tasks.mjs の代わり
    │   └── pg-idempotency.mjs          冪等キーの store
    ├── middleware/idempotency.mjs      store を async に
    ├── services/tasks.mjs              データの層への頼み方を少し変える
    ├── routes/tasks.mjs                一覧を listPage に
    └── lib/cursor.mjs                  作る・読むだけに
```

### 3.2 進める順番

1. `migrations/001_create_tasks.sql` を書く。第5部のタスクの形（`id`・`title`・`status`・`dueDate`・`createdAt`・`updatedAt`・`completedAt`・`version`）を列にし、題名の長さと status は `CHECK`、終わっていないタスクの題名は部分ユニークインデックスにする（第31章 0・6節、第32章 8.1節）。
2. `src/db/pool.mjs` と `src/db/migrate.mjs` を書き、`npm run migrate` で表ができることを psql で確かめる。
3. `config.mjs` に 2.4節の設定を足す。
4. `src/repositories/pg-tasks.mjs` を、`memory-tasks.mjs` と同じ形（`list`・`get`・`insert`・`update`・`remove`）で書き、`server.mjs` で取り替える。**ここで `npm test` を動かす**（テストの準備は4節）。第5部の 25 個のうち、ほとんどが通るはずです。
5. サービスの「全部を読んで探す」所（題名の重なり、作業中の数、一覧）を、データの層の問い合わせに替える（3.3節）。
6. 一覧のページ分けを SQL にする（3.4節）。
7. 冪等キーを表に置く（3.5節）。
8. 止めるときの `pool.end()`、つなげないときの終了コード 1（パスワードを隠す）。

### 3.3 サービスは「全部を読む」をやめる

第5部のサービスは、`repo.list()` で全部を読んでから、JavaScript で探していました。タスクが1万個あると、POST のたびに1万行を読むことになります。データの層に、目的ごとの問い合わせを足します。

| 第5部 | 第6部 |
| --- | --- |
| `(await repo.list()).some((x) => … x.title === title)` | `repo.findOpenByTitle(title, exceptId)`（`WHERE status <> 'done' AND title = $1`） |
| `(await repo.list()).filter((t) => t.status === 'doing').length` | `repo.countByStatus('doing')`（`SELECT count(*)::int …`） |
| `service.list()` → ルートの `paginate` | `service.listPage(…)` → `repo.listPage(…)`（3.4節） |

それでも、同じ題名の POST が**同時に**来ると、2つとも「重なっていない」と確かめてから INSERT することがあります。そのときは、部分ユニークインデックスが2つ目の INSERT を 23505 で止めます。データの層で、制約の名前（`err.constraint === 'tasks_open_title'`）を見て、サービスの言葉の `ConflictError` に読み替えると、ルートはそのまま 409 にします（第31章 6節、第32章 7節）。

### 3.4 一覧を1つの SQL に

第5部の `paginate`（`lib/cursor.mjs`）は、全部を並べ替えてから、カーソルの後ろを切り出していました。これを、第30章 6節のキーセットの SQL にします。

```sql
SELECT * FROM tasks
WHERE status = ANY($1::text[])                                -- ?status=todo,doing（あれば）
  AND due_date < $2                                           -- ?due_before=…（あれば）
  AND (created_at > $3 OR (created_at = $3 AND id > $4))      -- カーソル（前のページの最後）より後ろ（あれば）
ORDER BY created_at ASC, id ASC
LIMIT $5                                                      -- limit + 1
```

- `status = ANY($1::text[])` は、「配列 `$1` の中のどれか」です。`pg` は、JavaScript の配列を PostgreSQL の配列として渡します。
- 並べる列は、利用者の文字列をそのまま SQL に入れず、`{ createdAt: 'created_at', … }` のように自分で書いた表から選びます（第31章 練習問題2）。
- `-createdAt`（大きい順）なら、`>` を `<` に、`ASC` を `DESC` にします。
- **締め切り（`due_date`）には `NULL` がある**ので、カーソルの条件に気をつけます。PostgreSQL は、`ORDER BY due_date ASC` では `NULL` を最後に、`DESC` では最初に並べます（第5部の `cmp` と同じ並べ方です）。前のページの最後が `NULL` のときと、そうでないときで、条件が変わります。テスト 16 は、`NULL` を含む並べ方で、カーソルで最後まで重なりも抜けもなく読めるかを確かめます。
- `title` で並べるときは、`title COLLATE "C"` にします。データベースの決まりの並べ方は、言語ごとの辞書の順なので、テストが JavaScript の `sort()` で作る順と変わることがあります。`COLLATE "C"` は、文字の番号の順です。
- `lib/cursor.mjs` には、カーソルを作る（`encodeCursor`）と読む（`decodeCursor`）だけが残ります。

### 3.5 冪等キーを表に置く

第5部の `idempotency` ミドルウェアは、`store.get(key)` で探して、無ければ `store.set(key, running)` していました。データベースに置くと、2台のサーバが同時に `get` して、両方が「無い」と思うことがあります。「無ければ自分のものにする」を、1つの SQL にします。

```sql
INSERT INTO idempotency_keys (key, fingerprint, status, expires_at)
VALUES ($1, $2, 'running', now() + interval '24 hours')
ON CONFLICT (key) DO NOTHING
RETURNING key
```

1行返れば自分のもの、返らなければ、もうだれかのものです（`SELECT` で読んで、第5部と同じく 422・409・送り直しを決めます）。データベースの store のメソッドは `async` になるので、ミドルウェアも `await` で呼ぶように変えます。期限の切れたものは、ときどき `DELETE … WHERE expires_at <= now()` で消します。

### 3.6 server.mjs の順番

```text
loadConfig → logger → createPool → migrate（失敗したら pool.end() して終了コード 1）
  → createPgTaskRepo・createPgIdempotencyStore → hub → service → app → listen
SIGTERM → … → server.close → pool.end()
```

- `pool.on('error', …)` を付けます。使っていない接続が、データベースの再起動などで切れたときのエラーで、受け取らないとプロセスが落ちます。
- ログに URL を書くときは、`url.replace(/:[^:@/]*@/, ':***@')` でパスワードを隠します。

## 4. 確かめ方

完成例のテストをコピーして、自分の API に対して動かします。テストは、サーバを起動するたびに、データベース `taskapi` の中に新しいスキーマを作り、`DATABASE_SCHEMA` で渡します。自分のサーバは、`DATABASE_SCHEMA` を受け取って、プールの `options: '-c search_path=スキーマ'` に渡し、起動のときにマイグレーションを動かせば、テストのたびに空の表から始まります（第32章の練習問題のテストと同じ仕組みです）。

```sh
$ cp ~/dev/part06/project-task-api/solutions/test/api.test.mjs test/
$ npm test
```

完成例は 30 個のテストがすべて通ります。1〜25 は第5部と同じ、26〜30 は 2節で足した要件です。終わったら、コミットします。

```sh
$ git add -A
$ git commit -m "データを PostgreSQL に置く"
```

ブランチを `main` に入れるかどうかは、自分で決めてください（GitHub を使っているなら、プルリクエストにして見比べると、変えた所がよく分かります）。

## 5. もっとやるなら

- 作業中（`doing`）の数の上限は、同時に変えられると超えることがあります（サービスが数えてから変えるまでの間に、ほかの人も変えられる）。トランザクションの中で `SELECT … FOR UPDATE` するか、アドバイザリロックをかけて、1つずつにしてみる（第32章 6節）
- 書き換えの回数の上限を、Redis に数える（第34章 練習問題8）。2台のサーバで、合わせて数えられるようになる
- SSE のハブを、Redis の Pub/Sub でサーバの間につなぐ（第34章 練習問題7）。2台目で変えたタスクも、1台目につながっている画面に届くようになる
- `GET /api/tasks/:id` に Redis のキャッシュをかぶせる（第34章 練習問題6）。まず、遅いかどうかを測ってから
- `/readyz` で、データベースにつながるか（`SELECT 1`）も確かめる。つながらない間は、ロードバランサがリクエストを送らないようにできる（第12部）
- 第33章の Drizzle で、データの層をもう1つ書いてみる。`createPgTaskRepo` と同じ形にすれば、`server.mjs` の1行で取り替えられる

## 6. Flask で作るなら

| この成果物 | Flask |
| --- | --- |
| `pg` の `Pool` | Flask-SQLAlchemy の `db`（中で SQLAlchemy の接続のプールを持つ） |
| `migrations/*.sql` と `migrate.mjs` | Flask-Migrate（Alembic）の `flask db upgrade` |
| `createPgTaskRepo`（SQL を自分で書く） | `db.session.execute(db.select(Task).where(…))`、か `text('SELECT …')` |
| `UPDATE … WHERE version = $n` | SQLAlchemy の `version_id_col`（版の確かめを ORM がする） |
| `INSERT … ON CONFLICT DO NOTHING` | `sqlalchemy.dialects.postgresql.insert(…).on_conflict_do_nothing()` |
| テストごとのスキーマ | pytest のフィクスチャで、テストごとにトランザクションを始めて、最後に ROLLBACK する、が多い |

## 7. 次の部へ

- 第7部: TypeScript にします。データの層の形（`listPage`・`get`・`insert` …）を、型（`interface TaskRepo`）として書きます。SQL の結果の行にも型を付けます
- 第8部: React の画面から、この API を使います。データが残るので、画面を作り直しても、前のタスクが見えます
- 第10部: ログインを足し、タスクを「だれのものか」で分けます（表に `user_id` を足すマイグレーション）

---

前の章: [第34章 キャッシュと Redis 入門](../ch34-redis/README.md) ／ 第6部の目次: [../README.md](../README.md) ／ 次: [第35章 TypeScript の基礎](../../part07-typescript/ch35-ts-basics/README.md)
