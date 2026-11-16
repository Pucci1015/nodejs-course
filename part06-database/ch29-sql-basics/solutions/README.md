# 第29章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch29-sql-basics/exercises` で実行） |
| --- | --- | --- |
| 1 | [select-queries.mjs](select-queries.mjs) | `MODULE=../solutions/select-queries.mjs node --test select-queries.test.mjs` |
| 2 | [change-queries.mjs](change-queries.mjs) | `MODULE=../solutions/change-queries.mjs node --test change-queries.test.mjs` |
| 3 | [create-table.mjs](create-table.mjs) | `MODULE=../solutions/create-table.mjs node --test create-table.test.mjs` |
| 4 | このページ | — |
| 5 | [book-store.mjs](book-store.mjs) | `MODULE=../solutions/book-store.mjs node --test book-store.test.mjs` |
| 6 | [schema.mjs](schema.mjs) | `MODULE=../solutions/schema.mjs node --test schema.test.mjs` |
| 7 | [todo-db.mjs](todo-db.mjs) | `MODULE=../solutions/todo-db.mjs node --test todo-db.test.mjs` |
| 8 | [report.mjs](report.mjs) | `MODULE=../solutions/report.mjs node --test buggy-report.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 SELECT で選ぶ

```js
export const unread = `
  SELECT title FROM books
  WHERE read_at IS NULL
  ORDER BY title
`;

export const recent = `
  SELECT title, year FROM books
  WHERE year >= 2020
  ORDER BY year DESC
  LIMIT 3
`;

export const aboutSql = `
  SELECT id, title FROM books
  WHERE title LIKE '%SQL%'
  ORDER BY id
`;

export const thickTech = `
  SELECT title, pages FROM books
  WHERE genre = 'tech' AND pages >= 300
  ORDER BY pages DESC
`;
```

- `unread` の結果は `Node.js 入門`・`SQL の練習帳`・`Web の仕組み`・`パンの教科書`・`海の地図` の順です。英字が先、かなが次、漢字が後になるのは、文字の番号の順に並べているからです（本文3.1節）。
- `recent` で `LIMIT 3` を `ORDER BY` より前に書くと、エラーになります。SQL の句の順番は `SELECT … FROM … WHERE … ORDER BY … LIMIT …` と決まっています。
- `LIKE` は、SQLite では英字の大文字と小文字を区別しません（`'%sql%'` でも同じ結果）。PostgreSQL の `LIKE` は区別します（区別しないのは `ILIKE`）。

## 問題2 INSERT・UPDATE・DELETE で変える

```js
export const addBook = `
  INSERT INTO books (title, author, year, pages, genre)
  VALUES ('庭づくり', 'eve', 2026, 150, 'hobby')
`;

export const markRead = `
  UPDATE books SET read_at = '2026-11-01'
  WHERE id = 2
`;

export const rateRead = `
  UPDATE books SET rating = 3
  WHERE read_at IS NOT NULL AND rating IS NULL
`;

export const removeOld = `
  DELETE FROM books
  WHERE year < 1990
`;
```

- `addBook` で `id` を書かないと、今いちばん大きい id（10）の次の 11 が付きます。
- `rateRead` で `WHERE` を書き忘れると、すでに評価のある本（id 1 の 4 など）まで 3 になります。変える前に `SELECT id FROM books WHERE read_at IS NOT NULL AND rating IS NULL` で、変わる行（id 5 だけ）を確かめるのが安全です。

## 問題3 制約のあるテーブルを作る

```js
export const createMembers = `
  CREATE TABLE members (
    id    INTEGER PRIMARY KEY,
    email TEXT    NOT NULL UNIQUE,
    name  TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
    age   INTEGER CHECK (age >= 0),
    plan  TEXT    NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
  )
`;
```

- `plan` に `DEFAULT 'free'` があっても、`NULL` をわざわざ渡すと、`NOT NULL` で断られます。`DEFAULT` が使われるのは、「列を書かなかった」ときだけです。
- `length` は文字の数を数えます。`あ` も 1 文字です（バイトの数ではありません）。

## 問題4 1つの表を分ける

1. alice の行は3行あるので、3行とも直す必要があります。1行だけ直し忘れると、同じ alice に2つのメールアドレスがある状態になり、どちらが正しいか分からなくなります。
2. 直してはいけません。過去の注文は、そのときの値段（2400 円）で売ったので、直すと売り上げの記録が変わってしまいます。「本の今の値段」と「注文したときの値段」は、別のものです。
3. 書けません。この表の1行は「注文の中の1冊」なので、注文が無いお客さんや、売れていない本の行は作れません。
4. 例えば次のように分けます（→ は外部キー）。

| テーブル | 列 |
| --- | --- |
| `customers` | `id`（主キー）、`name`、`email`（UNIQUE） |
| `books` | `id`（主キー）、`title`、`price`（今の値段） |
| `orders` | `id`（主キー）、`customer_id`（→ `customers.id`）、`ordered_at` |
| `order_items` | `order_id`（→ `orders.id`）、`book_id`（→ `books.id`）、`quantity`、`unit_price`（注文したときの値段）。主キーは `(order_id, book_id)` の組 |

- お客さんのメールは `customers` に1回だけ書くので、1か所直せば済みます。
- `order_items` は、注文と本の多対多をつなぐテーブル（本文6.3節）で、そこに「何冊」と「そのときの値段」を持たせます。値段を `books` にしか持たないと、2. の問題が起きます。このように、「同じに見えるが、意味が違うもの」は、正規化しても別々に持ちます。

## 問題5 `?` を使って本を足す・探す関数

```js
export function addBook(db, { title, author, year, pages, genre }) {
  const r = db
    .prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)')
    .run(title, author, year, pages, genre);
  return Number(r.lastInsertRowid);
}

export function findByAuthor(db, author) {
  return db
    .prepare('SELECT id, title, year FROM books WHERE author = ? ORDER BY year')
    .all(author)
    .map((row) => ({ ...row }));
}

export function markRead(db, id, date) {
  const r = db.prepare('UPDATE books SET read_at = ? WHERE id = ?').run(date, id);
  return r.changes === 1;
}

export function countUnread(db) {
  const { n } = db.prepare('SELECT count(*) AS n FROM books WHERE read_at IS NULL').get();
  return n;
}
```

- `markRead` は、まず探して、あれば変える、と2回に分けずに、`UPDATE` の `changes` で「あったか」を見ています。1回で済むうえ、「探した後、変える前に消された」という食い違いも起きません。
- `` `… WHERE author = '${author}'` `` と書くと、`eve's garden` のような値で SQL が壊れます。値はいつも `?` で渡します（本文4.2節、第31章）。
- `const { n } = …get()` は、受け取った行から `n` だけを取り出す書き方（分割代入。第3部 第11章）です。

## 問題6 タスク管理のテーブルを外部キーでつなぐ

```js
export const schema = `
  CREATE TABLE users (
    id    INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
  );

  CREATE TABLE tasks (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title   TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
    status  TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done'))
  );

  CREATE TABLE tags (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );
`;
```

- user を消すと、`tasks` の行が CASCADE で消え、その `tasks` を指す `task_tags` の行も、続けて CASCADE で消えます。消すことが、鎖のように伝わります。
- `ON DELETE CASCADE` は便利ですが、「消したつもりのないものまで消える」こともあります。成果物では、消してよいものにだけ付けます。付けなければ、指されている行を消そうとしたときにエラーになり、うっかりを防げます。
- このテーブルの形は、第30章で JOIN を学ぶときと、第33章で Drizzle のスキーマにするときにも使います。

## 問題7 タスクを SQLite に保存する CLI

```js
import { DatabaseSync } from 'node:sqlite';

const dbFile = process.env.TODO_DB ?? 'todo.db';
const [command, arg] = process.argv.slice(2);
const USAGE = '使い方: node todo-db.mjs add 題名 | list | done 番号 | rm 番号';

function main() {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id    INTEGER PRIMARY KEY,
        title TEXT    NOT NULL,
        done  INTEGER NOT NULL DEFAULT 0
      )
    `);

    if (command === 'add') {
      if (!arg) return usage();
      const r = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(arg);
      console.log(`追加しました: ${r.lastInsertRowid} ${arg}`);
      return 0;
    }
    if (command === 'list') {
      const rows = db.prepare('SELECT id, title, done FROM tasks ORDER BY id').all();
      if (rows.length === 0) console.log('タスクはありません');
      for (const t of rows) console.log(`${t.done ? '[x]' : '[ ]'} ${t.id} ${t.title}`);
      return 0;
    }
    if (command === 'done' || command === 'rm') {
      if (!arg) return usage();
      const sql = command === 'done' ? 'UPDATE tasks SET done = 1 WHERE id = ?' : 'DELETE FROM tasks WHERE id = ?';
      const r = db.prepare(sql).run(arg);
      if (r.changes === 0) {
        console.error(`タスク ${arg} はありません`);
        return 1;
      }
      console.log(`${command === 'done' ? '完了にしました' : '消しました'}: ${arg}`);
      return 0;
    }
    return usage();
  } finally {
    db.close();
  }
}

function usage() {
  console.error(USAGE);
  return 2;
}

process.exitCode = main();
```

- `main` が終了コードを返し、最後に `process.exitCode` に入れます。`process.exit()` をあちこちで呼ぶと、`finally` の `db.close()` が動かないことがあります。
- `done 1` の `'1'` は文字列ですが、SQLite は `INTEGER` の列と比べるときに数に直すので、`WHERE id = ?` に合います。PostgreSQL では、型が合わないとエラーになることがあるので、第31章からは `Number(…)` で数にしてから渡します。
- 第3部の成果物（メモの CLI）は、メモを Markdown のファイルに書きました。ここでは保存先がデータベースになり、「1件だけ変える」「番号で消す」が SQL の1文で済んでいます。

## 問題8 一覧と更新の関数のバグを直す

直したものは [report.mjs](report.mjs) です。直した所には `// 修正:` のコメントがあります。

| 関数 | バグ | 直し方 |
| --- | --- | --- |
| `unreadTitles` | `read_at = NULL` は、どの行でも「分からない」になり、1冊も選ばれない | `read_at IS NULL` |
| `newestFirst` | `ORDER BY year` は古い順。同じ年の本の順も決まっていない | `ORDER BY year DESC, id` |
| `techOrScience` | `a OR b AND c` は `a OR (b AND c)` と読まれ、tech の本はページ数に関係なく選ばれる | `(genre = 'tech' OR genre = 'science') AND pages >= ?` |
| `page` | `OFFSET n * size` だと、1 ページ目で `size` 冊飛ばしてしまう | `OFFSET (n - 1) * size` |
| `addBook` | `?` の順（year, pages）と、渡す値の順（pages, year）が逆 | `run(title, author, year, pages, genre)` |
| `markAuthorRead` | `WHERE` が無く、全部の本の `read_at` が変わる | `WHERE author = ? AND read_at IS NULL` |

- どれも、SQL としては正しいので、エラーになりません。動いているように見えて、違う結果を返します。だからこそ、結果を確かめるテストが大事です。
- `addBook` の取り違えは、`year` に 150、`pages` に 2026 が入ります。問題3のように `CHECK (year BETWEEN 1000 AND 2100)` のような制約があれば、データベースが気づいて断ってくれます。
- `page` の `OFFSET` を使うページ分けは、後ろのページほど遅くなり、途中で行が増えると重なりや抜けが出ます。第30章で、第25章のカーソルのページ分けを SQL で書きます。
