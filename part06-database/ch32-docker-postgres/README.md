# 第32章 Docker と PostgreSQL

第29〜31章では、Node.js に入っている SQLite を使いました。SQLite は手軽ですが、Web のサービスでは、別のプロセス（サーバ）として動くデータベースを使うのがふつうです。この章では、その代表の **PostgreSQL** を、**Docker** を使って Mac の中で動かし、Node.js から `pg` というパッケージで使います。
第31章で作ったタスクの API を、データベースの所だけ取り替えて、PostgreSQL に保存するようにするのが、この章のゴールです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜7時間（Docker を入れる時間を含む） |
| 前提 | 第29〜31章（SQL、`?` で渡す、リポジトリ、トランザクションの関数、マイグレーション、制約のエラー）、第3部 第12章（async/await、`Promise.all`） |
| この章のゴール | Docker のイメージ・コンテナ・ボリュームを説明できる / Compose で PostgreSQL を動かし、止め、データを消せる / psql で表を見られる / `pg` の `Pool` で SQL を送り、`$1` で値を渡せる / PostgreSQL の型が JavaScript の何になるかを知り、日付の落とし穴を避けられる / 接続を借りて必ず返し、トランザクションとロックを使える / エラーコードで制約のエラーを見分けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形と部品（`db.mjs`・`schema.sql`・`first-pg.mjs`・`types.mjs`・`pool.mjs`・`with-transaction.mjs`・`pg-tx.mjs`・`lock.mjs`・`pg-errors.mjs`・`errors-try.mjs`・`migrate.mjs`・`migrations/`・`pg-task-repo.mjs`・`server.mjs`） |
| [exercises/](exercises/) | 練習問題（テストは PostgreSQL を使う） |
| [solutions/](solutions/) | 模範解答 |
| [../compose.yaml](../compose.yaml) | 第6部で使う PostgreSQL と Redis（第34章）を動かす設定。第6部のフォルダの直下にある |

> **読み方**
> - この章のコマンドは、`~/dev/part06/ch32-docker-postgres/` で実行します。`docker compose` のコマンドは、`compose.yaml` のある `~/dev/part06` でも、その中のフォルダでも動きます（今いるフォルダに無ければ、上のフォルダを探すため）。
>
>   ```sh
>   $ cd ~/dev/part06/ch32-docker-postgres
>   ```
>
> - 1節で Docker を入れます。数 GB のダウンロードがあるので、時間のあるときに始めてください。
> - 8節で、ポート **9437** でサーバを動かします。PostgreSQL は **5433**、Redis は **6380** で待ちます（Mac に別の PostgreSQL・Redis が入っていても、ぶつからない番号にしました）。
> - パスワード `dev-only-password` は、この Mac の中だけで使う、開発用の仮のものです。本番では使いません（第12部）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Docker・Compose（1・2節） | 第34章（同じ `compose.yaml` で Redis）、第12部 第61章（自分のアプリをコンテナにする） |
| `pg` の `Pool` と `$1`（4・5節） | 第33章（Drizzle は `pg` の上で動く）、成果物、第10部 |
| 型と日付の落とし穴（4.2節） | 成果物（締め切りの日付）、第8部（画面に日付を出す） |
| トランザクションとロック（6節） | 成果物、第12部 第64章（仕事の列、`SKIP LOCKED`） |
| エラーコード（7節） | 成果物（409・422） |
| SQL のファイルでマイグレーション（8.1節） | 第33章（drizzle-kit が作る SQL のファイル）、成果物 |

---

## 0. なぜ PostgreSQL か

| | SQLite（第29〜31章） | PostgreSQL（この章から） |
| --- | --- | --- |
| 動き方 | アプリの中に組み込む。データは1つのファイル | 別のプロセス（サーバ）。アプリはネットワークでつなぐ |
| 同時に書く | 書き込みは1つずつ | 何人もが同時に書ける（行ごとのロック） |
| 何台のアプリから | 同じ Mac の中から | 何台のサーバからでも（第12部で、アプリを複数台にする） |
| Node.js から | 同期（SQL の間、イベントループが止まる） | 非同期（`await`。待っている間、ほかのリクエストを扱える） |
| 型 | 少ない（真偽値・日時の型が無い） | 多い（`boolean`・`date`・`timestamptz`・`jsonb`・配列 など） |
| 向いている所 | スマホのアプリ、小さな道具、テスト | Web のサービスのデータベース |

SQL の大部分は、そのまま使えます。違いは、この章で1つずつ見ていきます。

## 1. Docker を入れる

PostgreSQL を Mac に直接入れることもできますが、この教材では **Docker** を使います。

### 1.1 イメージ・コンテナ・ボリューム

| 言葉 | 意味 | たとえ |
| --- | --- | --- |
| **イメージ** | あるソフト（PostgreSQL など）と、それが動くのに要るもの一式を、まとめて固めたもの。`postgres:18` のように「名前:版」で呼ぶ | アプリのインストーラ |
| **コンテナ** | イメージから作って動かしている、1つの小さな、閉じた環境。中のソフトは、Mac から切り離されて動く | インストールして動かしているアプリ |
| **ボリューム** | コンテナを消しても残る、データの置き場所 | アプリの書類フォルダ |
| **Compose** | 何個かのコンテナの設定を `compose.yaml` に書いておき、1つのコマンドで動かす・止める道具 | 起動の手順書 |

Docker を使うと、次のことがうれしくなります。

- PostgreSQL の版を、プロジェクトごとに決められます（`postgres:18`）。Mac に入っているほかのものと、ぶつかりません。
- いらなくなったら、コンテナとボリュームを消すだけで、Mac に何も残りません。
- 本番のサーバでも、同じイメージを使えます（第12部）。

Docker のコンテナは Linux の上で動くので、Mac では、Docker Desktop などのアプリが、裏で小さな Linux（仮想マシン）を動かしています。Apple Silicon の Mac では、Apple Silicon（arm64）用のイメージが選ばれます。この章で使う `postgres` と `redis` のイメージは、arm64 用もあります。

### 1.2 Docker Desktop を入れる

次のどちらか1つを入れます。迷ったら Docker Desktop にしてください。

| アプリ | 入れ方 | 備考 |
| --- | --- | --- |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ から「Download for Mac – Apple Silicon」を選び、`.dmg` を開いて、Docker のアイコンを「アプリケーション」フォルダにドラッグする | Docker の公式。個人・学習・小さな会社は無料（大きな会社で使うときは有料のプランが要る） |
| **OrbStack** | `brew install --cask orbstack`（Homebrew で入れる。第1部 第2章） | 軽くて速い。個人の利用は無料。`docker` のコマンドはそのまま使える |

入れたら、アプリケーションフォルダから起動します（メニューバーにクジラか OrbStack のアイコンが出ます）。最初の起動では、利用規約への同意や、設定の質問があります。アカウントの登録はしなくても使えます。

ターミナルで、使えるかを確かめます。

```sh
$ docker --version
Docker version 28.…（版の数字）
$ docker compose version
Docker Compose version v2.…（版の数字）
```

（数字は、入れた時期によって変わります。どちらも何かの版が出れば大丈夫です。）`command not found` と出たら、Docker Desktop が起動しているかを確かめ、ターミナルを開き直してください。

### 1.3 手を動かす: 最初のコンテナ

```sh
$ docker run --rm hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
…
Hello from Docker!
This message shows that your installation appears to be working correctly.
…
```

| 書いたもの | 意味 |
| --- | --- |
| `docker run イメージ` | イメージからコンテナを作って動かす。手元に無いイメージは、Docker Hub（イメージの置き場）からダウンロードする |
| `--rm` | 終わったら、コンテナを消す |

1回目は「手元に無いので、ダウンロードする（Pulling）」が出ます。もう一度動かすと、ダウンロードはせずに、すぐ動きます。

## 2. Compose で PostgreSQL と Redis を動かす

### 2.1 `compose.yaml` を読む

第6部のフォルダの直下に、[compose.yaml](../compose.yaml) があります。YAML（ヤムル）は、字下げで入れ子を表す、設定を書くための形式です。`#` から行の終わりはコメントです。

```yaml
# 第6部で使う PostgreSQL（第32章から）と Redis（第34章）。開発用です
# 使い方（part06 のフォルダで）:
#   docker compose up -d --wait    動かす（動き始めるまで待つ）
#   docker compose ps              様子を見る
#   docker compose stop            止める（データは残る）
#   docker compose down            止めて、コンテナを消す（データは残る）
#   docker compose down -v         止めて、データ（ボリューム）も消す。元に戻せない
# パスワードは、この PC の中だけで使う開発用の仮のものです。本番では使わないでください
name: nodejs-course-part06

services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: dev-only-password
      POSTGRES_DB: app
    ports:
      - "127.0.0.1:5433:5432" # この PC からだけ、5433 番でつなげる（Mac に別の PostgreSQL があっても、ぶつからない）
    volumes:
      - pgdata:/var/lib/postgresql # データを、コンテナを消しても残る場所（ボリューム）に置く
      - ./docker/postgres-init:/docker-entrypoint-initdb.d:ro # 最初に1回だけ動かす SQL
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 2s
      timeout: 3s
      retries: 15

  redis:
    image: redis:8
    ports:
      - "127.0.0.1:6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 15

volumes:
  pgdata:
```

| 書いたもの | 意味 |
| --- | --- |
| `name: nodejs-course-part06` | このまとまりの名前。コンテナやボリュームの名前の頭に付く |
| `services:` | 動かすコンテナの一覧。ここでは `postgres` と `redis` の2つ |
| `image: postgres:18` | PostgreSQL の 18 の版のイメージを使う |
| `environment:` | コンテナに渡す環境変数。`postgres` のイメージは、最初に起動したとき、これを見て、ユーザー `app`・パスワード・データベース `app` を作る |
| `ports: "127.0.0.1:5433:5432"` | Mac の 127.0.0.1 の 5433 番を、コンテナの 5432 番（PostgreSQL の決まった番号）につなぐ。`127.0.0.1:` を付けたので、ほかの PC からはつなげない |
| `volumes: pgdata:/var/lib/postgresql` | `pgdata` というボリュームを、コンテナの中のデータの場所につなぐ。コンテナを消しても、データは残る |
| `./docker/postgres-init:/docker-entrypoint-initdb.d:ro` | Mac のフォルダ `docker/postgres-init` を、コンテナの中に読み取り専用（`ro`）で見せる。ここに置いた SQL は、データが空のときに1回だけ動く（第33章・成果物用のデータベース `ch33`・`taskapi` を作る） |
| `healthcheck:` | コンテナの中で、2 秒ごとに `pg_isready`（PostgreSQL が受け付けているかを調べるコマンド）を動かす。動いていれば「healthy」 |
| `volumes: pgdata:`（最後） | ボリューム `pgdata` を作る、という宣言 |

### 2.2 手を動かす: 動かす・見る・止める

```sh
$ docker compose up -d --wait
[+] Running 4/4
 ✔ Network nodejs-course-part06_default       Created
 ✔ Volume "nodejs-course-part06_pgdata"       Created
 ✔ Container nodejs-course-part06-redis-1     Healthy
 ✔ Container nodejs-course-part06-postgres-1  Healthy
$ docker compose ps
NAME                              IMAGE         …   STATUS                    PORTS
nodejs-course-part06-postgres-1   postgres:18   …   Up 10 seconds (healthy)   127.0.0.1:5433->5432/tcp
nodejs-course-part06-redis-1      redis:8       …   Up 10 seconds (healthy)   127.0.0.1:6380->6379/tcp
```

1回目は、イメージのダウンロードで少し時間がかかります（表示は、Docker の版によって少し違います）。

| コマンド | 意味 |
| --- | --- |
| `docker compose up -d --wait` | `compose.yaml` のコンテナを作って動かす。`-d` は裏で動かす（ターミナルを返す）、`--wait` は healthy になるまで待つ |
| `docker compose ps` | コンテナの様子。`STATUS` が `Up … (healthy)` なら動いている |
| `docker compose logs postgres` | `postgres` のコンテナが出したログ。`-f` を付けると、出るたびに表示し続ける（Ctrl+C で抜ける） |
| `docker compose stop` | 止める。コンテナもデータも残る。`docker compose up -d` で、また動く |
| `docker compose down` | 止めて、コンテナを消す。**ボリューム（データ）は残る** |
| `docker compose down -v` | 止めて、コンテナと**ボリュームも消す**。データは元に戻せない。データベースを最初からやり直したいときに使う |

- Mac を再起動した後は、Docker Desktop を起動してから、`docker compose up -d --wait` で動かします。
- `docker/postgres-init` の SQL は、ボリュームが空のときにしか動きません。`ch33` のデータベースが無いと言われたら、`docker compose down -v` してから `up` し直します（データは消えます）。

## 3. psql で PostgreSQL に触る

**psql** は、PostgreSQL に SQL を打ち込むための、ターミナルの道具です。コンテナの中に入っているので、Mac に入れなくても使えます。

### 3.1 手を動かす: 表を作って見る

まず、タスクの表を作ります。[samples/schema.sql](samples/schema.sql) を psql に流し込みます。

```sh
$ docker compose exec -T postgres psql -U app -d app < samples/schema.sql
NOTICE:  table "tasks" does not exist, skipping
DROP TABLE
CREATE TABLE
CREATE INDEX
INSERT 0 5
```

| 書いたもの | 意味 |
| --- | --- |
| `docker compose exec postgres コマンド` | 動いている `postgres` のコンテナの中で、コマンドを動かす |
| `-T` | 端末（キーボードの入力）をつながない。`<` でファイルを流し込むときに付ける |
| `psql -U app -d app` | ユーザー `app` で、データベース `app` につなぐ |
| `< samples/schema.sql` | ファイルの中身を、コマンドの入力として流し込む（第1部 第1章のリダイレクト） |

中身は、第31章の `tasks` を PostgreSQL の型で書いたものです。

```sql
-- 第32章 3節で、psql に流し込んで、タスクのテーブルを作り直す SQL
-- 使い方（~/dev/part06 で）: docker compose exec -T postgres psql -U app -d app < ch32-docker-postgres/samples/schema.sql
-- 注意: tasks を消してから作るので、tasks に入れたデータは消える

DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text        NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  status       text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  version      integer     NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';

INSERT INTO tasks (title, status, due_date, created_at, updated_at, completed_at, version) VALUES
  ('牛乳を買う',       'done',  '2026-11-01', '2026-11-01T00:00:00Z', '2026-11-01T03:00:00Z', '2026-11-01T03:00:00Z', 2),
  ('本を返す',         'todo',  '2026-11-12', '2026-11-02T00:00:00Z', '2026-11-02T00:00:00Z', NULL, 1),
  ('部屋の掃除',       'doing', '2026-11-15', '2026-11-03T00:00:00Z', '2026-11-04T00:00:00Z', NULL, 2),
  ('Let''s ストレッチ', 'todo', NULL,         '2026-11-05T00:00:00Z', '2026-11-05T00:00:00Z', NULL, 1),
  ('報告書を書く',     'todo',  '2026-11-10', '2026-11-06T00:00:00Z', '2026-11-06T00:00:00Z', NULL, 1);
```

| PostgreSQL の書き方 | 意味 | SQLite では |
| --- | --- | --- |
| `integer GENERATED ALWAYS AS IDENTITY` | 1, 2, 3, … と自動で番号を付ける列。`ALWAYS` なので、自分で値を入れようとするとエラーになる | `INTEGER PRIMARY KEY` |
| `text` | 文字列（長さの上限なし） | `TEXT` |
| `date` | 日付（時刻なし） | 無い（`TEXT` で `'2026-11-12'`） |
| `timestamptz` | 時刻（タイムゾーンつき。中では UTC で持つ） | 無い（`TEXT` で ISO 8601） |
| `DEFAULT now()` | 書かなければ、今の時刻 | 無い（アプリで入れた） |
| `boolean` | 真偽値 `true`・`false` | 無い（0・1） |
| `'Let''s'` | 文字列の中の `'` は、2つ重ねる（SQLite も同じ） | 同じ |

続けて、psql の中に入って、表を見ます。

```sh
$ docker compose exec postgres psql -U app -d app
psql (18.…)
Type "help" for help.

app=# \dt
       List of tables
 Schema | Name  | Type  | Owner
--------+-------+-------+-------
 public | tasks | table | app
(1 row)

app=# SELECT id, title, status, due_date FROM tasks WHERE status <> 'done';
 id |      title       | status |  due_date
----+------------------+--------+------------
  2 | 本を返す         | todo   | 2026-11-12
  3 | 部屋の掃除       | doing  | 2026-11-15
  4 | Let's ストレッチ | todo   |
  5 | 報告書を書く     | todo   | 2026-11-10
(4 rows)

app=# \q
```

| psql のコマンド | 意味 |
| --- | --- |
| `\dt` | 表の一覧 |
| `\d tasks` | `tasks` の列・インデックス・制約 |
| `\l` | データベースの一覧（`app`・`ch33`・`taskapi` など） |
| `\q` | psql を終わる |
| `SELECT …;` | SQL は、最後の `;` で送られる。`;` を忘れると、続きの入力を待つ（`app-#` になる）ので、`;` を打って Enter |

`\` で始まるのは psql の道具のコマンドで、SQL ではありません。結果が長くて画面に収まらないときは、`less` と同じく、`q` で抜けます（第1部 第1章）。

## 4. Node.js から PostgreSQL を使う

Node.js から PostgreSQL を使うパッケージは **pg**（node-postgres）です。`setup-part06.sh` で、`~/dev/part06/node_modules` に入っています。

### 4.1 手を動かす: SQL を送る

まず、つなぎ方をまとめた部品 `db.mjs` を作ります（完成形は [samples/db.mjs](samples/db.mjs)）。

```js
import pg from 'pg';

// DATE 型（締め切りなど、時刻の無い日付）は、JavaScript の Date にせず、'2026-11-12' の文字列のまま受け取る（4.2節）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

// つなぎ先。環境変数 DATABASE_URL があればそれを、無ければ compose.yaml の PostgreSQL を使う
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app';

export function createPool(options = {}) {
  return new pg.Pool({ connectionString: DATABASE_URL, ...options });
}
```

`first-pg.mjs` を作ります（完成形は [samples/first-pg.mjs](samples/first-pg.mjs)）。

```js
import { createPool } from './db.mjs';

const pool = createPool();

const version = await pool.query('SELECT version()');
console.log(version.rows[0].version.split(' on ')[0]);

// 値は $1, $2, … で渡す（SQLite の ? と同じ役目。番号で、どの値かを指す）
const todo = await pool.query('SELECT id, title, due_date FROM tasks WHERE status = $1 ORDER BY id', ['todo']);
console.log(`todo は ${todo.rowCount} 件:`);
console.table(todo.rows);

const inserted = await pool.query(
  'INSERT INTO tasks (title, due_date) VALUES ($1, $2) RETURNING id, title, created_at',
  ['花に水をやる', '2026-12-01'],
);
console.log('足した行:', inserted.rows[0]);

const removed = await pool.query('DELETE FROM tasks WHERE id = $1', [inserted.rows[0].id]);
console.log('消した行の数:', removed.rowCount);

await pool.end(); // つなぎっぱなしの接続を閉じる。これが無いと、プログラムが終わらない
```

```sh
$ node first-pg.mjs
PostgreSQL 18.…（18 の後ろは、イメージをダウンロードした時期で変わる）
todo は 3 件:
┌─────────┬────┬────────────────────┬──────────────┐
│ (index) │ id │ title              │ due_date     │
├─────────┼────┼────────────────────┼──────────────┤
│ 0       │ 2  │ '本を返す'         │ '2026-11-12' │
│ 1       │ 4  │ "Let's ストレッチ" │ null         │
│ 2       │ 5  │ '報告書を書く'     │ '2026-11-10' │
└─────────┴────┴────────────────────┴──────────────┘
足した行: { id: 6, title: '花に水をやる', created_at: 2026-11-11T08:37:26.975Z }
消した行の数: 1
```

| 書いたもの | 意味 |
| --- | --- |
| `postgres://app:dev-only-password@127.0.0.1:5433/app` | つなぎ先の URL。`postgres://ユーザー:パスワード@ホスト:ポート/データベース` |
| `process.env.DATABASE_URL ?? …` | 環境変数があればそちら。本番では、パスワードをコードに書かず、環境変数で渡す（第5部 第26章） |
| `new pg.Pool({ connectionString })` | 接続のプール（5節）を作る。この時点では、まだつながない |
| `await pool.query(SQL, [値, …])` | SQL を送り、結果を待つ。`$1` には配列の1つ目、`$2` には2つ目が入る |
| `result.rows` | 結果の行の配列。行は、ふつうのオブジェクト（`null prototype` ではない） |
| `result.rowCount` | 返った行の数。UPDATE・DELETE では、変わった行の数（SQLite の `changes`） |
| `await pool.end()` | プールの接続を全部閉じる。開いた接続があると、Node.js のプログラムは終わらない |

- `$1`・`$2` は、SQLite の `?` と同じ役目です。値は SQL の文字列に書き込まず、配列で渡します（第31章 1節）。番号で指すので、同じ値を2回使うときは `$1` を2回書けます。
- 結果の列の名前は、`due_date` のままです。変換は、第31章と同じく、リポジトリの `toTask` でします（8.2節）。

### 4.2 手を動かす: 型が何になるか

`types.mjs` を作ります（完成形は [samples/types.mjs](samples/types.mjs)）。ここでは `db.mjs` を使わず、`pg` の元のままの動きを見ます。

```js
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app';
const sql = `
  SELECT count(*)            AS count_all,
         count(*)::int       AS count_int,
         now()               AS now,
         DATE '2026-11-12'   AS due,
         12.5::numeric       AS price,
         true                AS flag,
         '{"tags": ["家"]}'::jsonb AS meta
`;

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const row = (await client.query(sql)).rows[0];
for (const [name, value] of Object.entries(row)) {
  const kind = value !== null && typeof value === 'object' ? value.constructor.name : typeof value;
  console.log(name.padEnd(9), kind.padEnd(7), value);
}
console.log('due を JSON にすると:', JSON.stringify({ due: row.due }));

// DATE は、文字列のまま受け取るように変える（db.mjs と同じ設定）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
console.log('setTypeParser の後の due:', (await client.query(sql)).rows[0].due);

await client.end();
```

```sh
$ node types.mjs
count_all string  1
count_int number  1
now       Date    2026-11-11T08:37:37.727Z
due       Date    2026-11-11T15:00:00.000Z
price     string  12.5
flag      boolean true
meta      Object  { tags: [ '家' ] }
due を JSON にすると: {"due":"2026-11-11T15:00:00.000Z"}
setTypeParser の後の due: 2026-11-12
```

| PostgreSQL の型 | JavaScript では | 気を付けること |
| --- | --- | --- |
| `integer` | number | |
| `bigint`（`count(*)` の結果も） | **string** | JavaScript の number では、大きな整数を正しく表せないことがあるため。`count(*)::int` で `integer` にしてから受け取るか、`Number(…)` で直す |
| `numeric`（お金など、小数を正しく持つ型） | **string** | 同じ理由。計算するなら、気を付けて直す |
| `boolean` | boolean | |
| `timestamptz` | Date | JSON にすると `toISOString()` の形（UTC）になる |
| `date` | **Date（この PC の時刻の 0 時）** | 下の「日付の落とし穴」 |
| `jsonb` | オブジェクト・配列 | `JSON.parse` 済み |
| `text[]`（配列） | 配列 | 練習問題5の `array_agg` |

- `::int` は、PostgreSQL の「型を変える」書き方です（`CAST(count(*) AS integer)` と同じ）。

**日付の落とし穴**: `date` 型の `2026-11-12` を、`pg` は「この Mac の時刻で 2026-11-12 の 0 時」の Date にします。日本の 0 時は、UTC では前の日の 15 時です。そのまま JSON にすると `"2026-11-11T15:00:00.000Z"` になり、画面には **1日前の日付**が出てしまいます。サーバの時刻の設定が変わると、結果も変わります。
そこで、`db.mjs` では、`pg.types.setTypeParser` で「`date` は文字列のまま受け取る」と決めました。締め切りのような「時刻の無い日付」は、`'2026-11-12'` の文字列で扱うのが、いちばん間違えません。

| 書いたもの | 意味 |
| --- | --- |
| `pg.types.setTypeParser(型の番号, 関数)` | その型の値を、文字列から JavaScript の値に直す関数を決める。このプログラムの全部の接続に効く |
| `pg.types.builtins.DATE` | `date` 型の番号（1082） |

## 5. 接続のプール

### 5.1 なぜプールを使うか

PostgreSQL につなぐ（接続を1本作る）には、ネットワークのやり取りとパスワードの確認があり、数ミリ秒から数十ミリ秒かかります。リクエストのたびにつないでいては遅く、同時に1000 本つなぐと PostgreSQL の方が困ります（接続ごとにプロセスを1つ作るので）。
**プール**（Pool）は、接続を何本か作っておき、使い回す仕組みです。

```text
リクエスト A ─┐                ┌─ 接続 1 ─┐
リクエスト B ─┼─ pool.query ─→ ├─ 接続 2 ─┼─→ PostgreSQL
リクエスト C ─┤   （空いた接続を │ 接続 3 ─┘
リクエスト D ─┘    貸し、終われば └ 空くまで待つ: D
                   返してもらう）
```

### 5.2 手を動かす: プールの働きを見る

`pool.mjs` を作ります（完成形は [samples/pool.mjs](samples/pool.mjs)）。

```js
import { createPool } from './db.mjs';

const pool = createPool({ max: 3 }); // 同時に使う接続は 3 つまで
const show = (label) => console.log(`${label}: 接続 ${pool.totalCount} 本（空き ${pool.idleCount}）、待ち ${pool.waitingCount}`);

// 0.2 秒かかる SQL を、9 つ同時に送る
const start = performance.now();
const jobs = Array.from({ length: 9 }, (_, i) => pool.query('SELECT pg_sleep(0.2), $1::int AS n', [i]));
show('送った直後');
await Promise.all(jobs);
console.log(`9 つ終わるまで ${Math.round(performance.now() - start)} ms（3 本で 3 回に分けて動いた）`);
show('終わった後');

// 接続を1本借りて、同じ接続で続けて SQL を送る。使い終わったら、必ず返す（release）
const client = await pool.connect();
try {
  await client.query('SET application_name = $$pool-demo$$');
  const r = await client.query('SELECT pg_backend_pid() AS pid, current_setting($1) AS app', ['application_name']);
  console.log('借りた接続:', r.rows[0]);
  show('借りている間');
} finally {
  client.release();
}
show('返した後');

await pool.end();
```

```sh
$ node pool.mjs
送った直後: 接続 3 本（空き 0）、待ち 6
9 つ終わるまで 619 ms（3 本で 3 回に分けて動いた）
終わった後: 接続 3 本（空き 3）、待ち 0
借りた接続: { pid: 3828, app: 'pool-demo' }
借りている間: 接続 3 本（空き 2）、待ち 0
返した後: 接続 3 本（空き 3）、待ち 0
```

| 書いたもの | 意味 |
| --- | --- |
| `createPool({ max: 3 })` | 同時に使う接続を 3 本までにする（`pg` の既定は 10） |
| `pool.query(…)` | 空いた接続を借りて SQL を送り、終わったら自動で返す。1つの SQL なら、これで足りる |
| `pool.totalCount`・`idleCount`・`waitingCount` | 今ある接続の数・空いている数・空くのを待っている数 |
| `pg_sleep(0.2)` | 0.2 秒待つ、PostgreSQL の関数 |
| `const client = await pool.connect()` | 接続を1本借りる。同じ接続で、続けて何回も SQL を送りたいとき（トランザクション、`SET`）に使う |
| `client.release()` | 借りた接続を返す。**必ず `finally` で返す** |
| `$$pool-demo$$` | `'pool-demo'` と同じ文字列。`SET` は `$1` を使えないので、この書き方で値を書いた |

- `client.release()` を忘れると、その接続はずっと「使用中」のままです。何回か続くと、プールの接続が全部使用中になり、次の `pool.query` が、いつまでも待たされます（サーバが固まったように見えます）。`try { … } finally { client.release(); }` の形を崩さないでください。
- アプリ全体で、プールは1つだけ作ります。リクエストのたびに `new pg.Pool()` すると、プールの意味がありません。

## 6. トランザクションとロック

### 6.1 手を動かす: 接続を借りてトランザクション

`pool.query` は、呼ぶたびに、空いている**どれかの**接続を使います。`BEGIN` と `COMMIT` が別の接続に行ってしまうと、トランザクションになりません。トランザクションは、接続を1本借りて、その接続で全部を送ります。

`with-transaction.mjs` を作ります（完成形は [samples/with-transaction.mjs](samples/with-transaction.mjs)）。第31章 4節の `withTransaction` の、PostgreSQL 版です。

```js

// プールから接続を1本借り、その接続で BEGIN → fn(client) → COMMIT。fn が例外を投げたら ROLLBACK して投げ直す
// fn の中では、必ず渡された client を使う（pool.query は別の接続に行くので、トランザクションの外になる）
export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // 成功しても失敗しても、接続をプールに返す
  }
}
```

第30章のポイントの移動を、PostgreSQL でします。`pg-tx.mjs` を作ります（完成形は [samples/pg-tx.mjs](samples/pg-tx.mjs)）。

```js
import { createPool } from './db.mjs';
import { withTransaction } from './with-transaction.mjs';

const pool = createPool();
await pool.query(`
  DROP TABLE IF EXISTS points;
  CREATE TABLE points (
    name    text PRIMARY KEY,
    balance integer NOT NULL CHECK (balance >= 0)
  );
  INSERT INTO points (name, balance) VALUES ('alice', 100), ('bob', 0);
`);

async function transfer(from, to, amount) {
  try {
    await withTransaction(pool, async (client) => {
      await client.query('UPDATE points SET balance = balance + $1 WHERE name = $2', [amount, to]);
      await client.query('UPDATE points SET balance = balance - $1 WHERE name = $2', [amount, from]);
    });
    console.log(`OK  ${from} → ${to} ${amount}`);
  } catch (err) {
    console.log(`NG  ${from} → ${to} ${amount}: ${err.message}`);
  }
}

await transfer('alice', 'bob', 30);
await transfer('alice', 'bob', 500);
console.table((await pool.query('SELECT * FROM points ORDER BY name')).rows);
await pool.query('DROP TABLE points');
await pool.end();
```

```sh
$ node pg-tx.mjs
OK  alice → bob 30
NG  alice → bob 500: new row for relation "points" violates check constraint "points_balance_check"
┌─────────┬─────────┬─────────┐
│ (index) │ name    │ balance │
├─────────┼─────────┼─────────┤
│ 0       │ 'alice' │ 70      │
│ 1       │ 'bob'   │ 30      │
└─────────┴─────────┴─────────┘
```

- 第31章の SQLite 版と違い、`fn` は `async` の関数です。`DatabaseSync` と違い、ほかのリクエストの SQL は別の接続に行くので、`await` をはさんでも混ざりません。
- `fn` の中で `pool.query` を使うと、その SQL は別の接続で、トランザクションの**外**で動きます。ROLLBACK しても取り消されません。`fn` の中では、必ず渡された `client` を使います。
- `pool.query` に、`;` で区切った SQL をいくつも渡すと、まとめて動きます（`$1` を使わないときだけ）。`pg-tx.mjs` の最初の、表を作る所がそうです。

### 6.2 手を動かす: 同時に書くと、数が合わなくなる

PostgreSQL では、何本もの接続が、同時に同じ行を読み書きできます。そのときに何が起きるかを確かめます。`lock.mjs` を作ります（完成形は [samples/lock.mjs](samples/lock.mjs)）。

```js
import { createPool } from './db.mjs';
import { withTransaction } from './with-transaction.mjs';

const pool = createPool({ max: 10 });
const reset = () => pool.query(`DROP TABLE IF EXISTS counters; CREATE TABLE counters (name text PRIMARY KEY, n integer NOT NULL); INSERT INTO counters VALUES ('views', 0);`);
const views = async () => (await pool.query(`SELECT n FROM counters WHERE name = 'views'`)).rows[0].n;
const tenAtOnce = (fn) => Promise.all(Array.from({ length: 10 }, fn));

// 1. 読んでから、JavaScript で 1 足して書く
await reset();
await tenAtOnce(() =>
  withTransaction(pool, async (client) => {
    const { n } = (await client.query(`SELECT n FROM counters WHERE name = 'views'`)).rows[0];
    await client.query(`UPDATE counters SET n = $1 WHERE name = 'views'`, [n + 1]);
  }),
);
console.log('1. 読んでから書く:          ', await views());

// 2. 足すことを、データベースに1つの SQL で頼む
await reset();
await tenAtOnce(() => pool.query(`UPDATE counters SET n = n + 1 WHERE name = 'views'`));
console.log('2. n = n + 1:               ', await views());

// 3. 読むときに、行をロックする（FOR UPDATE）。ほかのトランザクションは、COMMIT まで待たされる
await reset();
await tenAtOnce(() =>
  withTransaction(pool, async (client) => {
    const { n } = (await client.query(`SELECT n FROM counters WHERE name = 'views' FOR UPDATE`)).rows[0];
    await client.query(`UPDATE counters SET n = $1 WHERE name = 'views'`, [n + 1]);
  }),
);
console.log('3. SELECT … FOR UPDATE:     ', await views());

await pool.query('DROP TABLE counters');
await pool.end();
```

```sh
$ node lock.mjs
1. 読んでから書く:           2
2. n = n + 1:                10
3. SELECT … FOR UPDATE:      10
```

（1. の数は、動かすたびに変わります。10 より小さくなります。）

1. は、10 本の接続が、ほぼ同時に `n` を読みます。みんな `0` を読み、`1` を書くので、10 回足したのに、数が合いません。トランザクションの中でも起きます（トランザクションは「全部か、何もしないか」を守りますが、「ほかの人が同じ行を読むこと」は止めません）。第30章 5節の「上書きの事故」と同じです。

| 防ぎ方 | 書き方 | 向いている所 |
| --- | --- | --- |
| 1つの SQL で頼む | `UPDATE … SET n = n + 1` | 足す・引くなど、SQL で書けること。いちばん簡単で速い |
| 読むときにロックする | `SELECT … FOR UPDATE`（トランザクションの中で） | 読んだ値を JavaScript で調べてから書きたいとき。ほかの人の `FOR UPDATE` や `UPDATE` は、COMMIT まで待たされる |
| version で確かめる | `UPDATE … WHERE version = $2`（第30章 5節） | 人が画面で編集するなど、読んでから書くまでが長いとき。待たせずに 409 で断る |

**`FOR UPDATE SKIP LOCKED`**: `FOR UPDATE` に `SKIP LOCKED` を付けると、ほかの人がロックしている行は、待たずに**飛ばして**次の行を選びます。何人もの作業者が「まだ誰も取っていない仕事を1つ取る」ときに使います（練習問題6、第12部 第64章）。

```sql
SELECT id FROM jobs WHERE status = 'waiting' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
```

## 7. エラーコードで見分ける

### 7.1 手を動かす: エラーの中身を見る

PostgreSQL のエラーには、5 文字の**エラーコード**（SQLSTATE）が `err.code` に入っています。SQLite の `errcode` と違い、データベースの種類をまたいで、ほぼ同じ番号です。読み替える部品 `pg-errors.mjs` を作ります（完成形は [samples/pg-errors.mjs](samples/pg-errors.mjs)）。

```js

// PostgreSQL のエラーには、5 文字のエラーコード（SQLSTATE）が err.code に入っている
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02', // '2026-13-45' を date に、'abc' を integer に、など
  INVALID_DATETIME_FORMAT: '22007',
  DATETIME_FIELD_OVERFLOW: '22008',
};

// 利用者が送った値のせいで起きたエラーなら、返すべきステータスコード。それ以外は null（500 にする）
export function statusForPgError(err) {
  switch (err?.code) {
    case PG.UNIQUE_VIOLATION:
      return 409;
    case PG.FOREIGN_KEY_VIOLATION:
    case PG.NOT_NULL_VIOLATION:
    case PG.CHECK_VIOLATION:
    case PG.INVALID_TEXT_REPRESENTATION:
    case PG.INVALID_DATETIME_FORMAT:
    case PG.DATETIME_FIELD_OVERFLOW:
      return 422;
    default:
      return null;
  }
}
```

試す `errors-try.mjs` を作ります（完成形は [samples/errors-try.mjs](samples/errors-try.mjs)）。3節の `schema.sql` で作った `tasks` を使います。

```js
import { createPool } from './db.mjs';
import { statusForPgError } from './pg-errors.mjs';

const pool = createPool();
const insert = 'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3)';
const tries = [
  ['本を返す', 'todo', null], // 終わっていない「本を返す」がもうある
  ['昼寝', 'sleeping', null], // 決まっていない status
  [null, 'todo', null], // 題名が無い
  ['昼寝', 'todo', '2026-13-45'], // ありえない日付
];
for (const params of tries) {
  try {
    await pool.query(insert, params);
    console.log('OK');
  } catch (err) {
    console.log(`${statusForPgError(err)}  code=${err.code}  constraint=${err.constraint}  column=${err.column}`);
    console.log(`     message: ${err.message}`);
  }
}
await pool.end();
```

```sh
$ node errors-try.mjs
409  code=23505  constraint=tasks_open_title  column=undefined
     message: duplicate key value violates unique constraint "tasks_open_title"
422  code=23514  constraint=tasks_status_check  column=undefined
     message: new row for relation "tasks" violates check constraint "tasks_status_check"
422  code=23502  constraint=undefined  column=title
     message: null value in column "title" of relation "tasks" violates not-null constraint
422  code=22008  constraint=undefined  column=undefined
     message: date/time field value out of range: "2026-13-45"
```

| 項目 | 意味 |
| --- | --- |
| `err.code` | エラーコード。`23` で始まるのは制約のエラー、`22` で始まるのは値の形のエラー |
| `err.constraint` | 断った制約の名前。名前を書かずに作った制約には、`表_列_check` のような名前が自動で付く（`\d tasks` で見られる） |
| `err.column` | NOT NULL で断られた列の名前 |
| `err.detail` | 詳しい説明。`Key (title)=(本を返す) already exists.` のように、**値が入っている**ので、利用者に見せない |

- SQLite と違い、PostgreSQL は `date` の列に `'2026-13-45'` や `'あした'` を入れようとすると、エラーにします（22008・22007）。`integer` の列に `'abc'` も断ります（22P02）。これらも、利用者が送った値のせいなので 422 です。
- 制約の名前で見分けられるので、「同じ題名」のような分かりやすい文を、確かに選べます（練習問題7）。

## 8. タスクの API を PostgreSQL に

第31章の `server.mjs` を、PostgreSQL に取り替えます。替えるのは、データベースにつながる所（プール）、マイグレーション、リポジトリ、エラーの読み替えの4つです。

### 8.1 手を動かす: SQL のファイルでマイグレーション

第31章では、手順を JavaScript の配列に書きました。ここでは、手順を1つずつ SQL のファイルにし、`migrations/` のフォルダに、名前の順に並べます。済んだファイルの名前は、`schema_migrations` という表に覚えます。

```text
samples/migrations/
├── 001_create_tasks.sql
├── 002_open_title_unique.sql
└── 003_add_completed_at.sql
```

`migrate.mjs` を作ります（完成形は [samples/migrate.mjs](samples/migrate.mjs)）。`migrations/` の3つのファイルは、[samples/migrations/](samples/migrations/) からコピーします（`cp -r samples/migrations .`。`-r` はフォルダごとコピーするオプション）。

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { withTransaction } from './with-transaction.mjs';

// dir の中の *.sql を名前の順に読み、まだ動かしていないものだけを、1つずつトランザクションの中で動かす
// 動かしたファイルの名前は、schema_migrations の表に覚えておく（SQLite の user_version の代わり）
export async function migrate(pool, dir) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    await withTransaction(pool, async (client) => {
      await client.query(sql); // PostgreSQL では、CREATE TABLE なども ROLLBACK で取り消せる
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    applied.push(file);
  }
  return applied;
}

// node samples/migrate.mjs で直接動かしたときだけ、ここを動かす（import されたときは動かない）
if (import.meta.main) {
  const { createPool } = await import('./db.mjs');
  const pool = createPool();
  const applied = await migrate(pool, path.join(import.meta.dirname, 'migrations'));
  console.log(applied.length === 0 ? 'もう最新です' : `動かしました: ${applied.join(', ')}`);
  await pool.end();
}
```

| 書いたもの | 意味 |
| --- | --- |
| `CREATE TABLE IF NOT EXISTS schema_migrations` | 済んだ手順の表。無ければ作る |
| `new Set(配列)` | 重なりの無い値の集まり。`has(値)` で、入っているかがすぐ分かる |
| `fs.readdir(dir)` | フォルダの中の名前の配列（第3部 第15章） |
| `.sort()` | 文字列の順に並べる。`001_`・`002_` と数を 0 で埋めておくと、`010_` でも順番が崩れない |
| `if (import.meta.main)` | このファイルを `node migrate.mjs` で直接動かしたときだけ `true`。ほかのファイルから `import` したときは `false` |
| `await import('./db.mjs')` | 必要になったときに、モジュールを読み込む |

3節で `schema.sql` から作った `tasks` は、マイグレーションと関係なく作ったものなので、消してから動かします。

```sh
$ docker compose exec postgres psql -U app -d app -c 'DROP TABLE tasks'
DROP TABLE
$ node migrate.mjs
動かしました: 001_create_tasks.sql, 002_open_title_unique.sql, 003_add_completed_at.sql
$ node migrate.mjs
もう最新です
```

（`psql -c 'SQL'` は、SQL を1つ動かして、すぐ終わります。）

- PostgreSQL では、`CREATE TABLE`・`ALTER TABLE` もトランザクションの中で動き、失敗すれば取り消されます。手順の途中で失敗しても、「半分だけ作った表」は残りません。
- サーバを2台同時に起動すると、2台が同時に `migrate` を動かし、同じファイルを2回動かそうとしてエラーになることがあります。PostgreSQL の**アドバイザリロック**（`SELECT pg_advisory_lock(番号)`。自分で決めた番号でかける、表とは関係の無いロック）を使うと、「`migrate` を動かせるのは、同時に1つだけ」にできます（練習問題8）。

### 8.2 手を動かす: リポジトリの PostgreSQL 版

`pg-task-repo.mjs` を作ります（完成形は [samples/pg-task-repo.mjs](samples/pg-task-repo.mjs)）。第31章の `task-repo.mjs` と見比べてください。

```js

const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
};

function column(key) {
  if (!Object.hasOwn(COLUMNS, key)) throw new Error(`知らない項目です: ${key}`);
  return COLUMNS[key];
}

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする。date は db.mjs の設定で文字列のまま来る
const iso = (d) => (d === null ? null : d.toISOString());

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    completedAt: iso(row.completed_at),
    version: row.version,
  };
}

// db には pool か、withTransaction が渡す client のどちらを渡してもよい（どちらも query を持っている）
export function createPgTaskRepo(db) {
  return {
    async list() {
      return (await db.query('SELECT * FROM tasks ORDER BY id')).rows.map(toTask);
    },

    async get(id) {
      return toTask((await db.query('SELECT * FROM tasks WHERE id = $1', [id])).rows[0]);
    },

    async insert(fields) {
      const keys = Object.keys(fields);
      const cols = keys.map(column).join(', ');
      const marks = keys.map((_, i) => `$${i + 1}`).join(', '); // 項目が3つなら '$1, $2, $3'
      const { rows } = await db.query(
        `INSERT INTO tasks (${cols}) VALUES (${marks}) RETURNING *`,
        keys.map((k) => fields[k]),
      );
      return toTask(rows[0]);
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields).filter((k) => k !== 'id');
      if (keys.length === 0) return this.get(id);
      const values = keys.map((k) => fields[k]);
      const sets = keys.map((k, i) => `${column(k)} = $${i + 1}`).join(', ');
      values.push(id);
      let sql = `UPDATE tasks SET ${sets} WHERE id = $${values.length}`;
      if (expectedVersion !== undefined) {
        values.push(expectedVersion);
        sql += ` AND version = $${values.length}`;
      }
      const { rows } = await db.query(`${sql} RETURNING *`, values);
      return toTask(rows[0]);
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? await db.query('DELETE FROM tasks WHERE id = $1', [id])
          : await db.query('DELETE FROM tasks WHERE id = $1 AND version = $2', [id, expectedVersion]);
      return r.rowCount > 0;
    },
  };
}
```

第31章の SQLite 版から変わった所は、次の4つだけです。

| 変わった所 | SQLite 版 | PostgreSQL 版 |
| --- | --- | --- |
| 値の印 | `?` | `$1`・`$2`…。`keys.map((_, i) => \`$${i + 1}\`)` で番号を付ける |
| 呼び方 | `stmt.get(…)`（同期） | `await db.query(…)` |
| 結果 | `get()` の行、`run()` の `changes` | `rows[0]`、`rowCount` |
| 日時 | 文字列で入れて、文字列で出る | `timestamptz` は Date で出るので、`toISOString()` で文字列に |

- `` `$${i + 1}` `` は、テンプレート文字列の中で、`$` という文字の後に `${i + 1}` の値を続けたものです。`i` が 0 なら `$1` になります。
- `createPgTaskRepo(db)` の `db` には、プールでも、`withTransaction` が渡す `client` でも渡せます。どちらも `query` を持っているからです。トランザクションの中でリポジトリを使いたいときは、`createPgTaskRepo(client)` と、その場で作ります。

### 8.3 手を動かす: PostgreSQL に保存するタスクの API

`server.mjs` を作ります（完成形は [samples/server.mjs](samples/server.mjs)）。第31章の `server.mjs` と、ほとんど同じです。

```js
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createPool } from './db.mjs';
import { migrate } from './migrate.mjs';
import { createPgTaskRepo } from './pg-task-repo.mjs';
import { statusForPgError } from './pg-errors.mjs';

const PORT = 9437;
const pool = createPool({ max: 10 });
const applied = await migrate(pool, path.join(import.meta.dirname, 'migrations'));
if (applied.length > 0) console.log(`マイグレーションを動かしました: ${applied.join(', ')}`);
const repo = createPgTaskRepo(pool);

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

function mustBeString(value, name, { nullable = false } = {}) {
  if (typeof value === 'string' || (nullable && value === null)) return value;
  throw new HttpError(422, `${name} は文字列で送ってください`);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  res.json(await repo.list());
});

app.get('/api/tasks/:id', async (req, res) => {
  const task = await repo.get(parseId(req.params.id));
  if (!task) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.json(task);
});

app.post('/api/tasks', async (req, res) => {
  const title = mustBeString(req.body?.title, 'title');
  const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
  // created_at・updated_at・status・version は、テーブルの DEFAULT に任せる
  const task = await repo.insert({ title, dueDate });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { version, title, status } = req.body ?? {};
  if (!Number.isInteger(version)) throw new HttpError(400, 'version（読んだときの版）を送ってください');
  const now = new Date();
  const fields = { updatedAt: now, version: version + 1 }; // pg は Date を timestamptz として渡せる
  if (title !== undefined) fields.title = mustBeString(title, 'title');
  if (status !== undefined) {
    fields.status = mustBeString(status, 'status');
    fields.completedAt = status === 'done' ? now : null;
  }
  const task = await repo.update(id, fields, { expectedVersion: version });
  if (task) return res.json(task);
  if (!(await repo.get(id))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  throw new HttpError(409, 'ほかの人が先に変えました。読み直してください');
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!(await repo.remove(parseId(req.params.id)))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.sendStatus(204);
});

const DB_DETAIL = {
  409: 'ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）',
  422: '送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done、dueDate は YYYY-MM-DD）',
};
app.use((err, req, res, next) => {
  const dbStatus = statusForPgError(err);
  const known = err instanceof HttpError || err.expose === true;
  const status = known ? err.status : (dbStatus ?? 500);
  if (status === 500) console.error(err);
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: http.STATUS_CODES[status],
    status,
    detail: known ? err.message : (DB_DETAIL[dbStatus] ?? 'サーバの中でエラーが起きました'),
  });
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/tasks で待っています（Ctrl+C で止める）`));

// Ctrl+C で止めるときに、受け付けをやめ、プールの接続を全部閉じてから終わる
process.on('SIGINT', () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
```

```sh
$ node server.mjs
http://127.0.0.1:9437/api/tasks で待っています（Ctrl+C で止める）
```

別のターミナルで試します（`cd ~/dev/part06/ch32-docker-postgres` してから）。

```sh
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"牛乳を買う","dueDate":"2026-11-20"}' http://127.0.0.1:9437/api/tasks
{"id":1,"title":"牛乳を買う","status":"todo","dueDate":"2026-11-20","createdAt":"2026-11-11T08:39:16.668Z",…,"version":1}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"牛乳を買う"}' http://127.0.0.1:9437/api/tasks
{"type":"about:blank","title":"Conflict","status":409,"detail":"ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）"}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"x","dueDate":"2026-13-45"}' http://127.0.0.1:9437/api/tasks
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"送られた値が決まりに合いません（…、dueDate は YYYY-MM-DD）"}
$ curl -s -X PATCH -H 'content-type: application/json' -d '{"version":1,"status":"done"}' http://127.0.0.1:9437/api/tasks/1
{"id":1,"title":"牛乳を買う","status":"done",…,"completedAt":"2026-11-11T08:39:16.713Z","version":2}
```

psql でも、入ったことを確かめられます。

```sh
$ docker compose exec postgres psql -U app -d app -c 'SELECT id, title, status, version FROM tasks'
```

第31章の版との違い:

- `insert` に渡す項目が、`title` と `dueDate` だけになりました。`created_at`・`status`・`version` は、テーブルの `DEFAULT` が入れます。
- PATCH の `updatedAt` に、`Date` をそのまま渡しています。`pg` は `Date` を `timestamptz` として正しく渡します（SQLite と違います）。
- 止めるときは、`pool.end()` で、プールの接続を全部閉じます。

## 9. Flask との対応

| やりたいこと | Flask（Python） | この章 |
| --- | --- | --- |
| PostgreSQL のドライバ | psycopg（`psycopg.connect(url)`） | pg（`new pg.Pool({ connectionString })`） |
| 値を渡す | `cur.execute('… WHERE id = %s', (id,))` | `pool.query('… WHERE id = $1', [id])` |
| 接続のプール | Flask-SQLAlchemy の `SQLALCHEMY_ENGINE_OPTIONS = {'pool_size': 5}`（SQLAlchemy が持つ） | `new pg.Pool({ max: 5 })` |
| つなぎ先 | `SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg://…'` | `DATABASE_URL = 'postgres://…'` |
| トランザクション | `with conn.transaction():`・`db.session.commit()` | `withTransaction(pool, async (client) => …)` |
| 制約のエラー | `psycopg.errors.UniqueViolation`（エラーコード 23505 のクラス） | `err.code === '23505'` |
| ローカルで動かす | `docker compose up`（同じ） | `docker compose up -d --wait` |

psycopg は `%s` で値を渡しますが、`%` で文字列を組み立てているわけではなく、`?`・`$1` と同じく、値を別に渡しています。

## まとめ

- Docker のイメージ（固めたもの）からコンテナ（動いているもの）を作り、データはボリュームに置く。`docker compose up -d --wait` で動かし、`down` で消す（`-v` を付けるとデータも消える）。
- psql は `docker compose exec postgres psql -U app -d app` で使う。`\dt`・`\d 表`・`\q`。
- `pg` の `Pool` を1つ作り、`pool.query(SQL, [値])` で送る。値は `$1`・`$2` で渡す。
- `count(*)`・`bigint`・`numeric` は文字列で来る。`date` は文字列で受け取る設定にする（1日ずれる落とし穴を避ける）。`timestamptz` は Date。
- 同じ接続で続けて送るときは `pool.connect()` で借り、`finally` で必ず `release()` する。トランザクションは、借りた `client` で行う。
- 同時に同じ行を書くときは、`n = n + 1` の1つの SQL、`FOR UPDATE`、version のどれかで守る。仕事を取り合うときは `FOR UPDATE SKIP LOCKED`。
- エラーは `err.code`（23505 → 409、23514・23502・23503・22P02 など → 422）と `err.constraint` で見分ける。`err.detail` は見せない。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用3問・発展2問）。テストは PostgreSQL を使うので、先に `docker compose up -d --wait` で動かしておきます。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Docker 公式「Install Docker Desktop on Mac」: https://docs.docker.com/desktop/setup/install/mac-install/
- Docker 公式「Docker Compose」: https://docs.docker.com/compose/
- OrbStack: https://orbstack.dev/
- Docker Hub「postgres」（環境変数・初期化の SQL）: https://hub.docker.com/_/postgres
- node-postgres 公式: https://node-postgres.com/ （「Pooling」「Transactions」「Data Types」）
- PostgreSQL 公式ドキュメント（日本語）「データ型」: https://www.postgresql.jp/docs/current/datatype.html
- PostgreSQL 公式ドキュメント（日本語）「エラーコード」: https://www.postgresql.jp/docs/current/errcodes-appendix.html
- PostgreSQL 公式ドキュメント（日本語）「明示的ロック」: https://www.postgresql.jp/docs/current/explicit-locking.html

---

前: [第31章 Node.js からデータベースを使う](../ch31-node-db/README.md) ／ 次: [第33章 ORM とマイグレーション](../ch33-orm-drizzle/README.md) ／ 部の目次: [第6部 データベース](../README.md)
