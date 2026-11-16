# 第29章 リレーショナル DB と SQL

第5部のタスク API は、データをメモリに置いていたので、サーバを止めると全部消えました。第4部の掲示板は JSON のファイルに保存しましたが、書き込みを1つずつ順に並べる工夫が要り、「未読だけ」「新しい順に 20 件」のような探し方も、全部を読んでから JavaScript で絞っていました。
この章では、そうした仕事を引き受ける**リレーショナルデータベース**（RDB）と、それに話しかける言葉 **SQL** を学びます。道具は、Node.js 24 に入っている **SQLite**（`node:sqlite`）です。インストールも Docker も要らず、すぐに試せます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第5部（特に第26章の「データの層」）、第4部の成果物（JSON のファイルに保存した掲示板）、第3部 第15章（`process.argv`・終了コード） |
| この章のゴール | テーブル・行・列・主キーを説明できる / SELECT で選び、並べ、数を絞れる / INSERT・UPDATE・DELETE で変えられ、`WHERE` の付け忘れの怖さを説明できる / NOT NULL・UNIQUE・CHECK・DEFAULT で、間違ったデータを断れる / テーブルを分けて外部キーでつなぎ、多対多を表せる / Node.js から `?` を使って値を渡せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`first-db.mjs`・`file-db.mjs`・`select.mjs`・`change.mjs`・`constraints.mjs`・`foreign-key.mjs`）と、本のテーブルを作る部品 `books.mjs` |
| [exercises/](exercises/) | 練習問題。SQL を試す道具 `run-query.mjs` 付き |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第6部の実習は `~/dev/part06/` で行います（教材のフォルダは見本として残しておくため）。第6部は npm のパッケージ（第32章からの PostgreSQL のクライアントなど）を使うので、コピーと `npm ci` をまとめてする `setup-part06.sh` を、**この章の最初に1回だけ**動かします。
>
>   ```sh
>   $ bash （ここに Finder から part06-database フォルダの中の setup-part06.sh をドラッグ）
>   $ cd ~/dev/part06/ch29-sql-basics
>   ```
>
>   ターミナルに `bash ` と打ってから、Finder で `setup-part06.sh` をターミナルの窓にドラッグすると、ファイルの場所が入ります。そのまま Enter を押します。`setup-part06.sh` は、第6部のフォルダを `~/dev/part06` にコピーし、そこで `npm ci`（ロックファイルのとおりにパッケージを入れる。第3部 第14章）をします。`~/dev/part06` が既にあれば、何もせずに終わります。
> - この章のコマンドは、すべて `~/dev/part06/ch29-sql-basics/` で実行します。この章では、サーバは動かしません。
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。
> - この章では npm のパッケージを使いません。`node:sqlite` は Node.js に入っています（Node.js 22.13 から。執筆時点の Node.js 24 では「リリース候補」の段階で、細かい所が変わることがあります）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| SELECT・INSERT・UPDATE・DELETE（3・4節） | 第6部のすべての章、成果物のタスク API |
| `?` で値を渡す（4節） | 第31章（SQL インジェクションを防ぐ）、第32章（PostgreSQL の `$1`） |
| 制約（5節） | 第31章（制約の失敗を 409・422 にする）、成果物 |
| テーブルを分けて外部キーでつなぐ（6節） | 第30章（JOIN でつないで読む）、第33章（Drizzle のスキーマ）、第10部（ユーザーとタスク） |

---

## 1. データベースが引き受けてくれること

第4部の掲示板では、投稿を JSON のファイルに保存しました。小さなうちはそれで十分ですが、大きくなると、次のことを全部自分で書くことになります。

| したいこと | JSON のファイル | データベース |
| --- | --- | --- |
| 「未読だけ」「新しい順に 20 件」 | 全部を読んでから、JavaScript で `filter`・`sort` | SQL で頼むと、要る行だけが返ってくる |
| 1件だけ変える | 全部を読んで、変えて、全部を書き直す | その行だけを変える |
| 2人が同時に書く | 書き込みを1つずつ並べる工夫（第4部の成果物） | データベースが順番を守る（第30章） |
| 間違ったデータを入れない | 書く前に、自分のコードで確かめる | テーブルに決まり（制約）を書いておくと、データベースが断る |
| 途中で落ちても壊れない | 一時ファイルに書いてから名前を変える（第3部の `atomic.mjs`） | データベースが引き受ける（第30章のトランザクション） |

**リレーショナルデータベース**は、データを**テーブル**（表）に入れます。表の1行が1つのもの（1冊の本、1つのタスク）、1列が1つの項目（題名、ページ数）です。表に話しかける言葉が **SQL** です。SQLite・PostgreSQL・MySQL など、データベースの製品が違っても、SQL の大部分は同じです。

Flask では、Python に入っている `sqlite3` モジュールで SQLite を使うか、**SQLAlchemy**（Python のクラスとテーブルを対応させるライブラリ。Flask-SQLAlchemy はそれを Flask から使いやすくしたもの）を使うことが多いと思います。SQLAlchemy は、`Task.query.filter_by(done=False)` のような Python のコードを、裏で SQL に直してデータベースに送っています。この章では、その「裏で送っている SQL」を、自分で書きます。SQLAlchemy のような道具（ORM）は第33章で扱います。

## 2. SQLite と `node:sqlite`

**SQLite** は、データベースを1つのファイル（か、メモリの中）に持つ、小さなデータベースです。PostgreSQL のように別のプロセス（サーバ）を動かす必要がなく、プログラムの中に組み込んで使います。iPhone や Mac のアプリ、ブラウザの中でも使われています。Node.js 24 には、SQLite を使うための `node:sqlite` が入っています。

### 2.1 手を動かす: 最初のデータベース

`first-db.mjs` を作ります（完成形は [samples/first-db.mjs](samples/first-db.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:'); // メモリの中だけのデータベース（終わると消える）

// テーブルを作る: 列の名前と型を決める
db.exec(`
  CREATE TABLE tasks (
    id    INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// 行を足す
db.exec(`INSERT INTO tasks (title) VALUES ('牛乳を買う')`);
db.exec(`INSERT INTO tasks (title, done) VALUES ('本を返す', 1)`);

// 行を読む
const rows = db.prepare('SELECT * FROM tasks').all();
console.log(rows);

db.close();
```

```sh
$ node first-db.mjs
[
  [Object: null prototype] { id: 1, title: '牛乳を買う', done: 0 },
  [Object: null prototype] { id: 2, title: '本を返す', done: 1 }
]
```

| 書いたもの | 意味 |
| --- | --- |
| `new DatabaseSync(':memory:')` | データベースを開く。`':memory:'` はメモリの中だけのデータベースで、プログラムが終わると消える |
| `CREATE TABLE tasks (…)` | `tasks` というテーブルを作る。かっこの中は「列の名前 型 決まり」の並び |
| `INTEGER`・`TEXT` | 列の型。整数と文字列 |
| `PRIMARY KEY` | **主キー**。行を1つに決める列。`INTEGER PRIMARY KEY` にすると、値を渡さなければ 1, 2, 3, … と自動で付く |
| `NOT NULL` | 値が無い（`NULL`）ことを許さない |
| `DEFAULT 0` | 値を渡さなかったときに入る値 |
| `INSERT INTO tasks (title) VALUES ('牛乳を買う')` | 行を足す。`(列, …)` の順に `VALUES (値, …)` を入れる。SQL の文字列は `'…'` で囲む |
| `db.exec(SQL)` | SQL を実行する。結果は受け取らない |
| `db.prepare(SQL).all()` | SQL を準備して実行し、結果の行を全部、オブジェクトの配列で受け取る |

- SQL のキーワード（`CREATE TABLE`・`SELECT` など）は、大文字でも小文字でも同じです。この教材では、キーワードを大文字、自分で付けた名前（テーブル・列）を小文字にして、見分けやすくしています。
- `[Object: null prototype]` は、「`toString` などを持たない、素のオブジェクト」という印です。ふつうのオブジェクトと同じように `row.title` で読めます。
- `done` が `0` と `1` なのは、SQLite に「真偽値」の型が無いからです。0 を false、1 を true として使います（PostgreSQL には `BOOLEAN` があります。第32章）。
- JavaScript の `` `…` ``（テンプレート文字列）は、改行を含められるので、長い SQL を読みやすく書けます。

### 2.2 手を動かす: ファイルに保存する

`':memory:'` の代わりにファイルの名前を渡すと、データがファイルに残ります。`file-db.mjs` を作り、何回か動かします（完成形は [samples/file-db.mjs](samples/file-db.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('visits.db'); // 今いるフォルダの visits.db（無ければ作る）

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY,
    at TEXT NOT NULL
  )
`);

db.prepare('INSERT INTO visits (at) VALUES (?)').run(new Date().toISOString());

const { n } = db.prepare('SELECT count(*) AS n FROM visits').get();
console.log(`${n} 回目の実行です`);

db.close();
```

```sh
$ node file-db.mjs
1 回目の実行です
$ node file-db.mjs
2 回目の実行です
$ ls
file-db.mjs    first-db.mjs    visits.db    …
```

- `CREATE TABLE IF NOT EXISTS` は、「無ければ作る。あれば何もしない」です。2回目の実行では、もうテーブルがあるので作りません。
- `visits.db` が、データベースのファイルです。消せば、データも消えます。
- `INSERT … VALUES (?)` の `?` には、`run(…)` に渡した値が入ります（4節）。
- `count(*)` は行の数を数えます。`AS n` で、結果の列に `n` という名前を付けています。`get()` は、最初の1行だけを受け取ります。

## 3. SELECT で選ぶ

ここからは、本のテーブルを使います。[samples/books.mjs](samples/books.mjs) の `createBooksDb()` が、メモリの中に 10 冊の `books` テーブルを作ります（中身は読まなくてよいですが、表の形は次のとおりです）。

| id | title | author | year | pages | genre | read_at | rating |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | はじめての SQL | alice | 2019 | 280 | tech | 2026-01-10 | 4 |
| 2 | Node.js 入門 | bob | 2023 | 350 | tech | NULL | NULL |
| 3 | ねこと暮らす | carol | 2015 | 160 | hobby | 2025-12-24 | 5 |
| 4 | 海の地図 | dave | 1988 | 420 | novel | NULL | NULL |
| 5 | やさしい統計 | alice | 2021 | 310 | tech | 2026-03-02 | NULL |
| 6 | パンの教科書 | eve | 2020 | 190 | hobby | NULL | NULL |
| 7 | 星の図鑑 | carol | 2008 | 240 | science | 2025-08-15 | 3 |
| 8 | SQL の練習帳 | bob | 2024 | 260 | tech | NULL | NULL |
| 9 | 山歩きの本 | dave | 1979 | 200 | hobby | 2024-05-05 | 4 |
| 10 | Web の仕組み | eve | 2022 | 330 | tech | NULL | NULL |

`read_at`（読み終わった日）と `rating`（評価）は、無いときは **NULL**（値が無い）です。

### 3.1 手を動かす: 選んで、並べて、絞る

`select.mjs` を作ります（完成形は [samples/select.mjs](samples/select.mjs)）。`import` するので、`books.mjs` を `samples/` から今のフォルダにコピーしておきます（`cp` はファイルをコピーするコマンドで、最後の `.` は「今いるフォルダへ」です）。

```sh
$ cp samples/books.mjs .
```

```js
import { createBooksDb } from './books.mjs';

const db = createBooksDb();

console.log('--- tech の本を、新しい順に');
console.table(db.prepare(`
  SELECT title, year FROM books
  WHERE genre = 'tech'
  ORDER BY year DESC
`).all());

console.log('--- まだ読んでいない本（read_at が NULL）を、ページの少ない順に 3 冊');
console.table(db.prepare(`
  SELECT title, pages FROM books
  WHERE read_at IS NULL
  ORDER BY pages
  LIMIT 3
`).all());

console.log('--- 題名に SQL を含む本');
console.table(db.prepare(`SELECT id, title FROM books WHERE title LIKE '%SQL%'`).all());

db.close();
```

```sh
$ node select.mjs
--- tech の本を、新しい順に
┌─────────┬──────────────────┬──────┐
│ (index) │ title            │ year │
├─────────┼──────────────────┼──────┤
│ 0       │ 'SQL の練習帳'   │ 2024 │
│ 1       │ 'Node.js 入門'   │ 2023 │
│ 2       │ 'Web の仕組み'   │ 2022 │
│ 3       │ 'やさしい統計'   │ 2021 │
│ 4       │ 'はじめての SQL' │ 2019 │
└─────────┴──────────────────┴──────┘
--- まだ読んでいない本（read_at が NULL）を、ページの少ない順に 3 冊
┌─────────┬────────────────┬───────┐
│ (index) │ title          │ pages │
├─────────┼────────────────┼───────┤
│ 0       │ 'パンの教科書' │ 190   │
│ 1       │ 'SQL の練習帳' │ 260   │
│ 2       │ 'Web の仕組み' │ 330   │
└─────────┴────────────────┴───────┘
--- 題名に SQL を含む本
┌─────────┬────┬──────────────────┐
│ (index) │ id │ title            │
├─────────┼────┼──────────────────┤
│ 0       │ 1  │ 'はじめての SQL' │
│ 1       │ 8  │ 'SQL の練習帳'   │
└─────────┴────┴──────────────────┘
```

`console.table(配列)` は、オブジェクトの配列を表にして出します。

| 書き方 | 意味 |
| --- | --- |
| `SELECT title, year FROM books` | `books` から、`title` と `year` の列を取り出す。全部の列なら `SELECT *` |
| `WHERE genre = 'tech'` | 条件に合う行だけにする。等しいは `=`（1つ）、等しくないは `<>`、ほかに `<`・`<=`・`>`・`>=` |
| `WHERE a AND b`・`WHERE a OR b` | 両方・どちらか。**`AND` は `OR` より先に結びつく**ので、混ぜるときはかっこで囲む |
| `WHERE read_at IS NULL` | 値が無い行。`IS NOT NULL` は値がある行 |
| `WHERE title LIKE '%SQL%'` | 文字列の一部が合う行。`%` は「何文字でもよい」、`_` は「1文字」 |
| `ORDER BY year DESC` | 並べる。`DESC` は大きい順、書かなければ（`ASC`）小さい順。`ORDER BY year DESC, id` のように、同じ値のときの順も書ける |
| `LIMIT 3` | 先頭の 3 行だけ。`LIMIT 3 OFFSET 6` は「6 行飛ばして 3 行」 |

- **`NULL` は `=` で比べられません。** `read_at = NULL` は、どの行でも「分からない」になり、1行も選ばれません。必ず `IS NULL` を使います。
- 文字列の `ORDER BY` は、文字の番号の順です。英数字、ひらがな、カタカナ、漢字の順になり、五十音順ではありません。
- 行の順番は、`ORDER BY` を書かない限り決まっていません。たまたま id の順に見えても、それに頼らないでください。

### 3.2 試す道具 `run-query.mjs`

練習問題のフォルダには、SQL を `books` に投げて結果を表で見る道具 [exercises/run-query.mjs](exercises/run-query.mjs) があります。SQL は `"…"` で囲んで、1つの引数として渡します。

```sh
$ node exercises/run-query.mjs "SELECT title FROM books WHERE year < 2000"
┌─────────┬──────────────┐
│ (index) │ title        │
├─────────┼──────────────┤
│ 0       │ '海の地図'   │
│ 1       │ '山歩きの本' │
└─────────┴──────────────┘
```

何度でも試せます（毎回、元の 10 冊から始まります）。いろいろな `WHERE` や `ORDER BY` を試してみてください。

## 4. INSERT・UPDATE・DELETE と `?`

### 4.1 手を動かす: 行を足す・変える・消す

`change.mjs` を作ります（完成形は [samples/change.mjs](samples/change.mjs)）。

```js
import { createBooksDb } from './books.mjs';

const db = createBooksDb();

// ? の所に、run の引数が順に入る
const insert = db.prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)');
const r1 = insert.run('新しい本', 'eve', 2026, 120, 'hobby');
console.log('INSERT', r1);

const r2 = db.prepare('UPDATE books SET read_at = ? WHERE id = ?').run('2026-11-11', 2);
console.log('UPDATE', r2);

const r3 = db.prepare('DELETE FROM books WHERE year < ?').run(1990);
console.log('DELETE', r3);

const { n } = db.prepare('SELECT count(*) AS n FROM books').get();
console.log(`残りは ${n} 冊`);

db.close();
```

```sh
$ node change.mjs
INSERT { changes: 1, lastInsertRowid: 11 }
UPDATE { changes: 1, lastInsertRowid: 11 }
DELETE { changes: 2, lastInsertRowid: 11 }
残りは 9 冊
```

| 書き方 | 意味 |
| --- | --- |
| `INSERT INTO books (列, …) VALUES (値, …)` | 行を足す。書かなかった列は `DEFAULT` の値か `NULL` |
| `UPDATE books SET read_at = … WHERE id = 2` | `WHERE` に合う行の列を変える。`SET a = 1, b = 2` で2つ以上も変えられる |
| `DELETE FROM books WHERE year < 1990` | `WHERE` に合う行を消す |
| `?` | 値の入る場所。`run(…)`・`all(…)`・`get(…)` に渡した値が、前から順に入る |
| `run(…)` の結果 | `changes` は変わった行の数、`lastInsertRowid` は最後に足した行の id |

- **`UPDATE` と `DELETE` で `WHERE` を忘れると、全部の行が変わり（消え）ます。** 元には戻せません。書いたら、先に同じ `WHERE` で `SELECT` して、変わる行を確かめる癖をつけてください。
- `changes` は、「本当に変わったか」を確かめるのに使います。`UPDATE … WHERE id = 99` で、99 番が無ければ `changes` は 0 です。
- `lastInsertRowid` は、数が大きいときのために `BigInt` で返ることがあります（ここでは数）。id として使うときは `Number(…)` で数にしておくと安全です。

### 4.2 値は `?` で渡す

値を `'…'` で囲んで SQL の文字列に書き込む（`` `… WHERE author = '${author}'` ``）と、値に `'` が入っていたとき（`eve's garden` など）に、SQL の区切りがずれて動かなくなります。悪い入力なら、別の SQL として動いてしまうこともあります（**SQL インジェクション**。第31章で詳しく扱います）。

`?` を使うと、SQL の形と値が別々にデータベースへ渡るので、値に何が入っていても、値のまま扱われます。**SQL に値を入れるときは、いつも `?` を使う**、と決めてしまいましょう。

## 5. 制約で、間違ったデータを断る

### 5.1 手を動かす: 決まりを書いたテーブル

`constraints.mjs` を作ります（完成形は [samples/constraints.mjs](samples/constraints.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE users (
    id    INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
    plan  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
  )
`);

const insert = db.prepare('INSERT INTO users (email, name, plan) VALUES (?, ?, ?)');

function tryInsert(email, name, plan = 'free') {
  try {
    insert.run(email, name, plan);
    console.log('OK  ', email, name, plan);
  } catch (err) {
    console.log('NG  ', email, name, plan, '→', err.message);
  }
}

tryInsert('alice@example.com', 'alice');
tryInsert('alice@example.com', 'alice2'); // 同じメール
tryInsert('bob@example.com', null); // 名前が無い
tryInsert('carol@example.com', ''); // 名前が空
tryInsert('dave@example.com', 'dave', 'gold'); // 決まっていないプラン

console.table(db.prepare('SELECT * FROM users').all());
db.close();
```

```sh
$ node constraints.mjs
OK   alice@example.com alice free
NG   alice@example.com alice2 free → UNIQUE constraint failed: users.email
NG   bob@example.com null free → NOT NULL constraint failed: users.name
NG   carol@example.com  free → CHECK constraint failed: length(name) BETWEEN 1 AND 20
NG   dave@example.com dave gold → CHECK constraint failed: plan IN ('free', 'pro')
┌─────────┬────┬─────────────────────┬─────────┬────────┐
│ (index) │ id │ email               │ name    │ plan   │
├─────────┼────┼─────────────────────┼─────────┼────────┤
│ 0       │ 1  │ 'alice@example.com' │ 'alice' │ 'free' │
└─────────┴────┴─────────────────────┴─────────┴────────┘
```

| 制約 | 意味 |
| --- | --- |
| `NOT NULL` | 値が必ずある |
| `UNIQUE` | 同じ値の行を2つ作れない |
| `CHECK (条件)` | 条件に合う値だけ。`length(name)` は文字数、`BETWEEN 1 AND 20` は 1 以上 20 以下、`IN ('free', 'pro')` はどれか |
| `DEFAULT 値` | 値を渡さなかったときの値 |
| `PRIMARY KEY` | `NOT NULL` と `UNIQUE` を合わせたもの。行を1つに決める |

- 制約に合わない SQL は、エラー（例外）になり、行は入りません。`try { … } catch (err) { … }` で受け止め、`err.message` で理由が読めます。
- 第25章では、zod で入力を確かめました。それでも制約を書くのは、データベースが「最後の守り」だからです。コードのバグや、別のプログラム（管理用のスクリプトなど）からの書き込みでも、間違ったデータが入りません。特に `UNIQUE` は、2人が同時に同じメールで登録したときに、コードの確かめだけでは防げません（「確かめる」と「入れる」の間に、ほかの人が入れるため）。
- SQLite は、型について緩やかです。`INTEGER` の列に文字列を入れても、断らずに入ることがあります。厳しくしたいときは、テーブルの最後に `STRICT` を付けます（`CREATE TABLE … (…) STRICT`）。PostgreSQL は、はじめから型に厳しいです（第32章）。

## 6. テーブルを分けて、つなぐ

### 6.1 同じことを2回書かない（正規化）

タスクを「だれのものか」と一緒に、1つの表に入れるとします。

| task_id | title | user_name | user_email |
| --- | --- | --- | --- |
| 1 | 牛乳を買う | alice | alice@example.com |
| 2 | 本を返す | alice | alice@example.com |
| 3 | 部屋の掃除 | bob | bob@example.com |

alice のメールが変わったら、2行を直す必要があります。1行だけ直し忘れると、alice のメールが2つになります。タスクが無い人は、どこにも書けません。

そこで、「人」と「タスク」を別のテーブルにし、タスクには人の id だけを書きます。同じことを2回書かないように表を分けることを、**正規化**と呼びます。

```text
users                     tasks
id | name  | email        id | user_id | title
1  | alice | alice@…      1  | 1       | 牛乳を買う
2  | bob   | bob@…        2  | 1       | 本を返す
                          3  | 2       | 部屋の掃除
```

`tasks.user_id` のように、ほかのテーブルの主キーを指す列を**外部キー**（foreign key）と呼びます。

### 6.2 手を動かす: 外部キー

`foreign-key.mjs` を作ります（完成形は [samples/foreign-key.mjs](samples/foreign-key.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON'); // SQLite では、外部キーの確かめを毎回オンにする
db.exec(`
  CREATE TABLE users (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE tasks (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title   TEXT NOT NULL
  );
  INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob');
  INSERT INTO tasks (user_id, title) VALUES (1, '牛乳を買う'), (1, '本を返す'), (2, '部屋の掃除');
`);

try {
  db.exec(`INSERT INTO tasks (user_id, title) VALUES (99, 'だれのタスク？')`);
} catch (err) {
  console.log('いない人のタスク →', err.message);
}

db.exec('DELETE FROM users WHERE id = 1'); // alice を消すと、alice のタスクも消える（CASCADE）
console.table(db.prepare('SELECT * FROM tasks').all());
db.close();
```

```sh
$ node foreign-key.mjs
いない人のタスク → FOREIGN KEY constraint failed
┌─────────┬────┬─────────┬──────────────┐
│ (index) │ id │ user_id │ title        │
├─────────┼────┼─────────┼──────────────┤
│ 0       │ 3  │ 2       │ '部屋の掃除' │
└─────────┴────┴─────────┴──────────────┘
```

| 書き方 | 意味 |
| --- | --- |
| `REFERENCES users (id)` | この列は `users` の `id` を指す。いない人の id は入れられない |
| `ON DELETE CASCADE` | 指している先（人）が消えたら、この行（タスク）も消す。書かなければ、タスクが残っている人は消せない |
| `PRAGMA foreign_keys = ON` | SQLite で外部キーを確かめる設定。**データベースを開くたびに**実行する（昔のアプリとの互換のため、既定ではオフ） |
| `INSERT … VALUES (…), (…)` | 1回の INSERT で、何行も足す |
| `db.exec` に SQL をいくつも | `;` で区切ると、まとめて実行する |

### 6.3 多対多は、間にテーブルを置く

1つのタスクに、タグ（「買い物」「家」）をいくつも付けたいとします。1つのタグも、いくつものタスクに付きます。これを**多対多**と呼び、間に「組」だけを入れるテーブルを置いて表します。

```text
tasks              task_tags            tags
id | title         task_id | tag_id     id | name
1  | 牛乳を買う    1       | 1          1  | 買い物
3  | 部屋の掃除    1       | 2          2  | 家
                   3       | 2
```

`task_tags` の主キーは `(task_id, tag_id)` の組にします（`PRIMARY KEY (task_id, tag_id)` のように、列を2つ書けます）。同じ組を2回入れられなくなります。分けたテーブルをつないで読む方法（`JOIN`）は、第30章で学びます。

## 7. Flask との対応

| やりたいこと | Flask（sqlite3 / SQLAlchemy） | この章 |
| --- | --- | --- |
| データベースを開く | `sqlite3.connect('app.db')` / `SQLAlchemy(app)` | `new DatabaseSync('app.db')` |
| テーブルを作る | `CREATE TABLE …` / `class Task(db.Model)` と `db.create_all()` | `db.exec('CREATE TABLE …')` |
| 値を渡す | `cur.execute('… WHERE id = ?', (id,))` / `Task.query.get(id)` | `db.prepare('… WHERE id = ?').get(id)` |
| 全部の行を受け取る | `cur.fetchall()` | `stmt.all()` |
| 変わった行の数 | `cur.rowcount` | `run()` の `changes` |

Python の `sqlite3` も、値は `?` で渡します。SQLAlchemy を使っていたなら、裏で同じ形の SQL が送られていました。

## まとめ

- リレーショナルデータベースは、データをテーブル（行と列）に入れ、SQL で選ぶ・変える・決まりを守る、を引き受ける。
- `SELECT 列 FROM 表 WHERE 条件 ORDER BY 列 LIMIT 数` で、要る行だけを、決めた順に受け取る。`NULL` は `IS NULL` で比べる。
- `INSERT`・`UPDATE`・`DELETE` で変える。`UPDATE` と `DELETE` の `WHERE` を忘れると全部の行が変わるので、先に `SELECT` で確かめる。
- 値は `?` で渡す。SQL の文字列に値を書き込まない。
- `NOT NULL`・`UNIQUE`・`CHECK`・`DEFAULT` で、データベースに最後の守りをさせる。
- 同じことを2回書かないようにテーブルを分け（正規化）、外部キーでつなぐ。多対多は、間に組のテーブルを置く。SQLite では `PRAGMA foreign_keys = ON` を忘れない。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用2問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js 公式「SQLite」: https://nodejs.org/api/sqlite.html
- SQLite 公式「SQL As Understood By SQLite」: https://www.sqlite.org/lang.html
- SQLite 公式「Foreign Key Support」: https://www.sqlite.org/foreignkeys.html
- SQLite 公式「STRICT Tables」: https://www.sqlite.org/stricttables.html
- PostgreSQL 公式ドキュメント（日本語）「チュートリアル」: https://www.postgresql.jp/docs/current/tutorial.html

---

前: [第5部の成果物 タスク管理 REST API](../../part05-express/project-task-api/README.md) ／ 次: [第30章 SQL の実践](../ch30-sql-practice/README.md) ／ 部の目次: [第6部 データベース](../README.md)
