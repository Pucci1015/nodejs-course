# 第37章 Node.js プロジェクトでの TypeScript

第35・36章では、1つ1つのファイルに型を付けました。この章では、**プロジェクト**として TypeScript を使います。TypeScript をどう動かすか（Node.js でそのまま・tsx・tsc でビルド）、外のパッケージ（Express・pg）の型はどこから来るのか、Express とデータの層にどう型を付けるか、tsc では見つからない間違いを ESLint でどう見つけるか、を学びます。
最後に、小さな API（`todo-api`）を作り、`npm run check` の1回で「型・ESLint・テスト」を全部確かめられるようにします。第7部の成果物は、この形でタスク管理 API を TypeScript にします。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜7時間 |
| 前提 | 第35・36章、第5部（Express）、第6部 第32章（`pg`） |
| この章のゴール | Node.js の型の除去・tsx・tsc のビルドの違いを説明し、使い分けられる / `.d.ts` と `@types` の役割を説明できる / Express のハンドラとエラーのミドルウェアに型を付けられる / データの層の形を `interface` で決め、メモリと PostgreSQL の実装をそろえられる / ESLint（typescript-eslint）で、待ち忘れた Promise などを見つけられる / `typecheck`・`lint`・`test` のスクリプトを用意できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`build-try/`・`todo-api/` を含む） |
| [exercises/](exercises/) | 練習問題（テストで型と ESLint も確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part07/ch37-ts-node/` で実行します。手を動かして作るファイルとフォルダ（`build-try/`・`todo-api/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part07/ch37-ts-node
>   ```
>
> - 4.3節の `pg-types.ts` は、第6部の PostgreSQL が動いていれば動かせます（`cd ~/dev/part06 && docker compose up -d --wait`）。動いていなくても、`npx tsc` で型を確かめるだけでかまいません。練習問題は PostgreSQL を使いません。
> - 5節で、ポート **9477** でサーバを動かします。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 動かし方の使い分け（1節） | 成果物（`node src/server.ts` で動かし、`tsc` で確かめる）、第12部（本番の Docker のイメージを作る） |
| `@types` と `.d.ts`（2節） | 第8部（React の型 `@types/react`）、外のパッケージを使うすべての場面 |
| データの層を `interface` で決める（4節） | 成果物（`TaskRepo`・`IdempotencyStore`）、第11部 第57章（テストで偽物に取り替える） |
| Express の型、宣言のマージ（5節） | 成果物（`req.id`・`req.log`）、第10部（`req.user`） |
| ESLint（6節） | 成果物、第8部（React のルール）、第11部（CI で自動で確かめる） |
| `npm run check`（7節） | 成果物、第11部 第59章（GitHub Actions で、プッシュのたびに動かす） |

---

## 1. TypeScript を動かす3つの方法

TypeScript を動かすには、どこかで型を取り除いて JavaScript にする必要があります。その方法は3つあります。

| 方法 | コマンド | 型を確かめるか | 何をするか |
| --- | --- | --- | --- |
| Node.js の型の除去 | `node src/server.ts` | しない | 型を空白に置き換えて、そのまま動かす（第35章 1.2節） |
| tsx | `npx tsx src/server.ts` | しない | esbuild という道具で、その場で JavaScript に変換して動かす |
| tsc でビルド | `npx tsc` → `node dist/server.js` | する | `.ts` から `.js` のファイルを作り、それを動かす |

どの方法でも、**型を確かめるのは tsc** です（`npx tsc`。ビルドしないなら `noEmit`）。

### 1.1 Node.js の型の除去の決まり（おさらい）

第35・36章で見たとおり、Node.js は「型を消すだけで JavaScript になる」書き方しか動かせません。

| 書き方 | Node.js | この教材 |
| --- | --- | --- |
| 型注釈・`type`・`interface`・`as`・`satisfies`・ジェネリクス | 動く（消す） | 使う |
| `enum` | 動かない | 使わない（リテラル型のユニオン。第35章 7.4節） |
| 引数のプロパティ（`constructor(private x: number)`） | 動かない | 使わない（第36章 8.2節） |
| 値を持つ `namespace` | 動かない | 使わない（オブジェクトやモジュールにする） |
| `import` に拡張子が無い、`.js` と書く | 動かない | `.ts` と書く（第35章 8.1節） |
| 型の import に `type` が無い | 動かない | `import { type Task }` |
| `tsconfig.json` の設定（`paths` など） | **読まない** | 頼らない |

最後の行が大事です。Node.js は `tsconfig.json` を読みません。tsconfig の設定で import のパスを短くする（`paths`）、といった機能は、Node.js では効きません。

ファイルを書き換えるたびに動かし直すには、`--watch` を付けます（第4部 第17章）。

```sh
$ node --watch src/server.ts
```

### 1.2 手を動かす: tsx

**tsx** は、TypeScript を変換しながら動かす道具です。enum なども動かせるので、Node.js の型の除去が使えない古いプロジェクトでよく使われます。`enum-demo.ts` を作ります。

```ts
enum Level {
  Low,
  High,
}

class Job {
  constructor(public name: string, public level: Level) {}
}

const job = new Job('洗濯', Level.High);
console.log(job.name, job.level, Level[job.level]);
```

```sh
$ node enum-demo.ts
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
$ npx tsx enum-demo.ts
洗濯 1 High
```

（`node` のエラーは、最後の1行だけを載せています。）

- `npx tsx ファイル` は、第7部のフォルダに入れた tsx（[package.json](../package.json) の `devDependencies`）を動かします。tsx も型は確かめません。
- この教材では、enum や引数のプロパティを使わないので、tsx は使いません。ほかの人のプロジェクトで `tsx watch src/server.ts` のようなスクリプトを見たら、「変換して動かしているだけ」と読めれば十分です。

確かめたら、`rm enum-demo.ts` で消してください（このフォルダの `npx tsc` がエラーにするため）。

### 1.3 手を動かす: tsc でビルドする

tsc は、型を確かめるだけでなく、`.ts` から `.js` のファイルを作る（**ビルド**する）こともできます。Node.js の型の除去が無かった頃は、これがふつうの方法でした。今でも、ライブラリを npm で配るとき（使う人が TypeScript でなくても使えるように）や、起動を少しでも速くしたいときに使います。

`build-try` というフォルダを作り、その中に `src/greet.ts`・`src/main.ts`・`tsconfig.json`・`package.json` を作ります。

```sh
$ mkdir -p build-try/src && cd build-try
```

`src/greet.ts`:

```ts
export type Lang = 'ja' | 'en';

export function greet(name: string, lang: Lang = 'ja'): string {
  if (name === '') throw new Error('名前が空です');
  return lang === 'ja' ? `こんにちは、${name}さん` : `Hello, ${name}`;
}
```

`src/main.ts`:

```ts
import { greet, type Lang } from './greet.ts';

const lang: Lang = 'en';
console.log(greet('alice'));
console.log(greet('bob', lang));
console.log(greet(''));
```

`tsconfig.json`（このフォルダは `~/dev/part07/ch37-ts-node/build-try` なので、共通の設定は2つ上のフォルダにあります）:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src",
    "rewriteRelativeImportExtensions": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

`package.json`:

```json
{
  "name": "build-try",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node --enable-source-maps dist/main.js"
  }
}
```

| 設定 | 意味 |
| --- | --- |
| `"noEmit": false` | 共通の設定の `noEmit: true` を打ち消して、`.js` を作る |
| `"outDir": "dist"` | 作った `.js` を `dist/` に置く |
| `"rootDir": "src"` | `src/` の中のフォルダの形を、そのまま `dist/` に写す（`src/a/b.ts` → `dist/a/b.js`） |
| `"rewriteRelativeImportExtensions": true` | `import './greet.ts'` を、`.js` では `import './greet.js'` に書き換える |
| `"sourceMap": true` | `.js.map`（**ソースマップ**。`.js` の何行目が `.ts` の何行目かの対応表）も作る |

```sh
$ npm run build

> build
> tsc

$ ls dist
greet.js	greet.js.map	main.js		main.js.map
$ cat dist/greet.js
export function greet(name, lang = 'ja') {
    if (name === '')
        throw new Error('名前が空です');
    return lang === 'ja' ? `こんにちは、${name}さん` : `Hello, ${name}`;
}
//# sourceMappingURL=greet.js.map
```

`dist/greet.js` には、型（`: string`・`type Lang`）がありません。tsc が、型を確かめてから、型を取り除いた JavaScript を書き出しました。`ls` は、フォルダの中のファイルを並べるコマンドです（第1部 第1章）。`cat` は、ファイルの中身を出すコマンドです。

`main.ts` の最後の行は、わざとエラーを投げます。`npm start`（`node --enable-source-maps dist/main.js`）で動かすと、エラーの場所が `.ts` の行で出ます。

```sh
$ npm start
（略）
こんにちは、aliceさん
Hello, bob
/Users/alice/dev/part07/ch37-ts-node/build-try/src/greet.ts:4
  if (name === '') throw new Error('名前が空です');
                         ^

Error: 名前が空です
    at greet (/Users/alice/dev/part07/ch37-ts-node/build-try/src/greet.ts:4:26)
    at <anonymous> (/Users/alice/dev/part07/ch37-ts-node/build-try/src/main.ts:6:13)
```

`--enable-source-maps` を付けずに `node dist/main.js` で動かすと、`dist/greet.js:3` のように、変換した後の `.js` の行で出ます。どこを直せばよいか分かりにくいので、ビルドしたものを動かすときは、ソースマップを使います。

```sh
$ cd ..
```

> **`dist/` は Git に入れない**: `dist/` は、`npm run build` でいつでも作り直せるので、`.gitignore`（第1部 第3章）に書いて、Git に入れないのがふつうです。

### 1.4 どれを使うか

| 場面 | この教材の方法 | 理由 |
| --- | --- | --- |
| 開発中に動かす | `node --watch src/server.ts` | 変換の道具が要らない。起動が速い |
| 型を確かめる | `npx tsc`（`noEmit`） | 動かす方法とは別に、必ず動かす（7節の `npm run typecheck`） |
| 本番で動かす | `node src/server.ts`（Node.js 24 以降） | ビルドの手順が要らない。第12部で、ビルドする方法と比べる |
| ライブラリを配る | `tsc` でビルド（`.js` と `.d.ts` を配る） | 使う人の環境を選ばない |

## 2. 型の定義と @types

### 2.1 手を動かす: 型はどこから来るのか

`express` や `pg` は JavaScript で書かれたパッケージです。それなのに、`import express from 'express'` と書くと、tsc は `express()` が何を返すかを知っています。型は、**型の定義のファイル**（`.d.ts`。型だけが書かれたファイル）から来ます。`.d.ts` の置き場所は2通りあります。

```sh
$ grep '"types"' ../node_modules/pino/package.json
  "types": "pino.d.ts",
$ ls ../node_modules/@types
body-parser  connect  esrecurse  estree  express  express-serve-static-core  http-errors  json-schema  node  pg  qs  range-parser  send  serve-static
$ npm ls @types/express
part07-typescript@1.0.0 /Users/alice/dev/part07
└── @types/express@5.0.6
```

- `grep 文字列 ファイル` は、ファイルの中から、その文字列を含む行を出すコマンドです（第1部 第1章）。
- `npm ls パッケージ` は、そのパッケージがどの版で入っているかを出すコマンドです。
- `ls` の出力の並び方は、Mac とこの教材の出力で少し違うことがあります。

| 置き場所 | 例 | 見分け方 |
| --- | --- | --- |
| パッケージの中に入っている | `zod`・`pino`・`typescript-eslint` | `package.json` に `"types"` がある。何も足さなくてよい |
| **DefinitelyTyped**（型だけを集めたリポジトリ）から、`@types/パッケージ名` として別に入れる | `@types/express`・`@types/pg`・`@types/node` | パッケージの中に型が無い。`npm install -D @types/express` で入れる |

`@types/express` を入れると、依存している `@types/express-serve-static-core`・`@types/qs` なども一緒に入ります（上の `ls` の出力）。`estree`・`esrecurse`・`json-schema` は ESLint が使う型です。`@types/node` は、Node.js 自身の API（`process`・`node:fs` など）の型です。

型のパッケージを入れるときの決まり:

| 決まり | 理由 |
| --- | --- |
| `devDependencies` に入れる（`npm install -D`。`-D` は `--save-dev` の短い形） | 型は動かすときには要らない。`typescript`・`eslint` も同じ |
| `@types/○○` の版は、`○○` の版に合わせる（`express` 5 なら `@types/express` 5） | 違う版の型だと、無い関数を使えてしまったり、ある関数がエラーになったりする |
| `@types/node` の大きい版の番号は、使う Node.js に合わせる（Node.js 24 なら 24） | 新しい Node.js の API の型が入っている |

第7部のフォルダの [package.json](../package.json) を見て、`dependencies` と `devDependencies` にどれが入っているかを確かめてください。

### 2.2 CommonJS のパッケージを import する

`pg` は、CommonJS（`require` と `module.exports`。第3部 第14章）で書かれたパッケージです。ES Modules から使うときは、まとめて import してから取り出します（第6部 第32章と同じ書き方です）。

```ts
import pg from 'pg';
const pool = new pg.Pool({ connectionString: '…' });
```

tsc も、この書き方を正しく読みます（`module: nodenext` の設定で、Node.js と同じ決まりで import を読むからです）。

## 3. Node.js の API の型

### 3.1 手を動かす: process.env と readFile

`env-and-files.ts` を作ります。

```ts
import { readFile } from 'node:fs/promises';

// 環境変数は、無いかもしれないので string | undefined
const portText = process.env.PORT;
const port = portText === undefined ? 9470 : Number(portText);
console.log('port:', port);

// 文字コードを渡すと string、渡さないと Buffer（バイトの並び）が返る。型も、それに合わせて変わる
const text = await readFile(import.meta.filename, 'utf8');
const bytes = await readFile(import.meta.filename);
console.log('行の数:', text.split('\n').length, 'バイト数:', bytes.length);

// process.argv は string[]。[2] は string | undefined
const name = process.argv[2] ?? '名無し';
console.log(`こんにちは、${name}さん`);
```

```sh
$ node env-and-files.ts
port: 9470
行の数: 16 バイト数: 728
こんにちは、名無しさん
$ PORT=9999 node env-and-files.ts alice
port: 9999
行の数: 16 バイト数: 728
こんにちは、aliceさん
```

（行の数とバイト数は、書いたファイルによって少し違います。）

| 値 | 型 | 気をつけること |
| --- | --- | --- |
| `process.env.PORT` | `string \| undefined` | 環境変数は、いつも文字列か、無い。数にするのは自分で |
| `process.env` | `NodeJS.ProcessEnv` | 「キーが文字列、値が `string \| undefined` のオブジェクト」の型。関数の引数の型に使える（練習問題2） |
| `readFile(path, 'utf8')` | `Promise<string>` | 文字コードを渡すと文字列 |
| `readFile(path)` | `Promise<Buffer>` | 渡さないとバイトの並び。渡した引数で戻り値の型が変わる（**オーバーロード**） |
| `process.argv[2]` | `string \| undefined` | `noUncheckedIndexedAccess`（第35章 5.2節） |
| `import.meta.filename`・`import.meta.dirname` | `string` | このファイルの場所（第3部 第15章） |

`PORT=9999 node …` のように、コマンドの前に `名前=値` を書くと、そのコマンドの間だけ環境変数を決められます（第4部 第17章）。

## 4. データの層の形を型で決める

ここから、小さな API `todo-api` を作っていきます。第6部の成果物で、データの層（リポジトリ）の形をそろえておけば、メモリの版と PostgreSQL の版を取り替えられることを学びました。TypeScript では、その「形」を **`interface`** で書き、tsc に確かめさせます。

### 4.1 手を動かす: todo-api のフォルダと、タスクの型

```sh
$ mkdir -p todo-api/src todo-api/test && cd todo-api
```

`package.json`（7節で使うスクリプトも、先に書いておきます）:

```json
{
  "name": "todo-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.ts",
    "start": "node src/server.ts",
    "typecheck": "tsc",
    "lint": "eslint .",
    "test": "node --test \"test/*.test.ts\"",
    "check": "npm run typecheck && npm run lint && npm test"
  }
}
```

`tsconfig.json`:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test"]
}
```

`src/task.ts`:

```ts
export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
  createdAt: string;
};

export type NewTask = Pick<Task, 'title'> & Partial<Pick<Task, 'status'>>;

/** データの層の形。メモリでも PostgreSQL でも、この形にそろえる */
export interface TaskRepo {
  list(filter?: { status?: Status }): Promise<Task[]>;
  get(id: number): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  remove(id: number): Promise<boolean>;
}
```

| 書き方 | 意味 |
| --- | --- |
| `interface TaskRepo { list(…): Promise<Task[]>; … }` | メソッドの名前・引数・戻り値の型を並べた「形」。中身（どう作るか）は書かない |
| `Pick<Task, 'title'> & Partial<Pick<Task, 'status'>>` | `&` は「両方の項目を持つ」（**交差型**、intersection type）。title は必須、status は無くてよい |
| `/** … */` | JSDoc のコメント。エディタで、メソッドにマウスを乗せると出る |

第36章 1節の注意のとおり、`type` でも書けます。この教材では、「いくつかの実装がそろえる形」を `interface` で書くことにします。

### 4.2 手を動かす: メモリで作る

`src/memory-repo.ts`:

```ts
import type { NewTask, Task, TaskRepo } from './task.ts';

export function createMemoryTaskRepo(now: () => Date = () => new Date()): TaskRepo {
  const tasks = new Map<number, Task>();
  let nextId = 1;

  return {
    async list(filter = {}) {
      const all = [...tasks.values()];
      return filter.status === undefined ? all : all.filter((t) => t.status === filter.status);
    },
    async get(id) {
      return tasks.get(id) ?? null;
    },
    async create(input: NewTask) {
      const task: Task = { id: nextId++, title: input.title, status: input.status ?? 'todo', createdAt: now().toISOString() };
      tasks.set(task.id, task);
      return task;
    },
    async remove(id) {
      return tasks.delete(id);
    },
  };
}
```

- 戻り値の型を `TaskRepo` と書いたので、返すオブジェクトに足りないメソッドがあったり、引数や戻り値の型が違ったりすると、tsc がエラーにします。
- `async list(filter = {})` の `filter` に型を書いていないのは、戻り値の型 `TaskRepo` の `list` の引数の型から推論されるからです。
- `async` を付けたメソッドの戻り値は、自動で Promise になります（`TaskRepo` の `Promise<Task[]>` に合う）。

わざと間違えてみます。`remove` のメソッドを丸ごと消して、`npx tsc` を動かします。

```sh
$ npx tsc
src/memory-repo.ts:7:3 - error TS2741: Property 'remove' is missing in type '{ list(filter?: { status?: Status | undefined; } | undefined): Promise<Task[]>; get(id: number): Promise<Task | null>; create(input: NewTask): Promise<...>; }' but required in type 'TaskRepo'.
…
```

確かめたら元に戻してください。

> **`class … implements TaskRepo`**: クラスで書くなら、`class MemoryTaskRepo implements TaskRepo { … }` と書きます（第36章 8節）。この教材では、第6部と同じく「オブジェクトを返す関数」で書きます。

### 4.3 PostgreSQL の版: 行に型を付ける

第6部 第32章の `pg` の `pool.query` は、`query<行の型>(…)` と書くと、`rows` の型が決まります。`pg-types.ts` を作ります（このファイルは `~/dev/part07/ch37-ts-node` の直下に作ります。`cd ..` で戻ってください）。

```ts
import pg from 'pg';

type Row = { n: number; at: Date; name: string };

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app',
});
try {
  // query<Row> で「行はこの形」と書く。tsc は信じるだけで、本当にこの形かは確かめない（第38章）
  const { rows } = await pool.query<Row>("SELECT 1 AS n, now() AS at, 'alice' AS name");
  const row = rows[0];
  if (row !== undefined) console.log(row.n + 1, row.at instanceof Date, row.name.toUpperCase());
} finally {
  await pool.end();
}
```

```sh
$ cd ..
$ node pg-types.ts
2 true ALICE
```

PostgreSQL が動いていなければ `ECONNREFUSED` で止まります（型を確かめるだけなら `npx tsc`）。

- `pool.query<Row>(…)` の `Row` は、tsc に「行はこの形」と**言っているだけ**で、本当にこの形かは確かめていません。SQL の列の名前を打ち間違えても、tsc は気づきません。第38章で、この「型と本当の値のずれ」を扱います。
- データの層の関数が、`pg.Pool` だけでなく、トランザクションの `client`（第32章 5節）でも動くように、引数の型を「`query` を持つもの」にしておくと便利です。練習問題6で、次の `Queryable` を使います。

```ts
export interface Queryable {
  query<R>(text: string, values?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}
```

`pg.Pool` も `pg.PoolClient` も、この形を満たしているので、そのまま渡せます（形で比べる。第35章 4.1節）。テストでは、この形の偽物を渡せます。

## 5. Express に型を付ける

### 5.1 手を動かす: ハンドラの型

`todo-api` に戻って（`cd todo-api`）、`src/app.ts` を作ります。

```ts
import crypto from 'node:crypto';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import type { Status, Task, TaskRepo } from './task.ts';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const STATUSES: readonly string[] = ['todo', 'doing', 'done'];
function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && STATUSES.includes(value);
}

/** パスの id を数にする。形が違えば 404 */
function parseId(text: string): number {
  if (!/^[1-9]\d{0,8}$/.test(text)) throw new HttpError(404, 'タスクが見つかりません');
  return Number(text);
}

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  app.use(express.json());

  // req.id は express.d.ts で足した項目
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  });

  // Request<パスの引数, 応答のボディ, リクエストのボディ, クエリ>
  app.get('/api/tasks', async (req: Request<object, Task[]>, res: Response<Task[]>) => {
    const status = req.query.status;
    if (status !== undefined && !isStatus(status)) throw new HttpError(400, 'status は todo・doing・done のどれかです');
    res.json(await repo.list(status === undefined ? {} : { status }));
  });

  app.get('/api/tasks/:id', async (req: Request<{ id: string }>, res: Response<Task>) => {
    const task = await repo.get(parseId(req.params.id));
    if (task === null) throw new HttpError(404, 'タスクが見つかりません');
    res.json(task);
  });

  app.post('/api/tasks', async (req, res: Response<Task>) => {
    // req.body は any。unknown として受け取って、確かめてから使う（第38章で Zod に替える）
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || !('title' in body) || typeof body.title !== 'string' || body.title.trim() === '') {
      throw new HttpError(422, 'title（空でない文字列）が要ります');
    }
    const task = await repo.create({ title: body.title.trim() });
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  app.delete('/api/tasks/:id', async (req: Request<{ id: string }>, res) => {
    if (!(await repo.remove(parseId(req.params.id)))) throw new HttpError(404, 'タスクが見つかりません');
    res.status(204).end();
  });

  // エラーのミドルウェアの型。err は unknown
  const onError: ErrorRequestHandler = (err: unknown, req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, requestId: req.id });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'サーバのエラーです', requestId: req.id });
  };
  app.use(onError);
  return app;
}
```

| 書き方 | 意味 |
| --- | --- |
| `import express, { type Request, type Response, type ErrorRequestHandler } from 'express'` | Express の関数（値）と、型をまとめて import する |
| `(req, res, next) => …` を `app.use` に渡す | 型を書かなくても、`app.use` の型から req・res・next の型が推論される |
| `Request<{ id: string }>` | パスの引数（`req.params`）の型。`:id` は、いつも文字列 |
| `Request<パスの引数, 応答のボディ, リクエストのボディ, クエリ>` | 4つの型の引数の順番 |
| `Response<Task>` | `res.json(…)` に渡せるものを Task に決める。違うものを渡すと tsc のエラー |
| `req.body` | **any**。`express.json()` が何を読むかは、送ってくる人しだいなので、型は付いていない。`unknown` の変数に入れて確かめてから使う（第38章で Zod にする） |
| `req.query.status` | `string \| ParsedQs \| (string \| ParsedQs)[] \| undefined`。`?status=a&status=b` なら配列になる。文字列だと思い込まない |
| `ErrorRequestHandler` | エラーのミドルウェアの型。引数が4つ（`err, req, res, next`）。`err` は unknown |
| `_next` | 使わないが、4つ書かないとエラーのミドルウェアにならない引数。`_` で始めると、ESLint が「使っていない」と言わない（6節の設定） |
| `express.Express` | `express()` が返すアプリの型 |

Express 5 では、async のハンドラが throw したエラー（reject した Promise）は、自動でエラーのミドルウェアに渡ります（第5部 第23章）。`throw new HttpError(404, …)` と書けば、`onError` が JSON にして返します。

### 5.2 手を動かす: Request に項目を足す（宣言のマージ）

`app.ts` の最初のミドルウェアは、`req.id = crypto.randomUUID()` と、Express の Request に無い項目を足しています。そのままでは tsc のエラーになるので、`src/express.d.ts` を作って、「このアプリの Request には id がある」と書き足します。

```ts
declare namespace Express {
  interface Request {
    /** requestId のミドルウェアが付ける、リクエストごとの ID */
    id: string;
  }
}
```

- `declare namespace Express { interface Request { … } }` は、`@types/express` の中の `Express.Request` という interface に、項目を**書き足し**ます。同じ名前の interface を2回書くと、1つにまとまる、という TypeScript の決まり（**宣言のマージ**、declaration merging）を使っています。type では、これができません。
- `.d.ts` のファイルは、型だけを書くファイルです。tsc は `tsconfig.json` の `include`（`src`）から見つけて読みます。Node.js は動かすときに読まないので、`import` する必要もありません。
- `declare` は「値はどこか別の所にある。ここでは型だけを書く」という意味です。namespace も、`declare` が付いていれば型だけなので、Node.js の型の除去の決まり（1.1節）に反しません。

`express.d.ts` を一時的に別の名前（`express.d.ts.bak`）にして `npx tsc` を動かすと、`req.id` の行がエラーになります。

```sh
$ mv src/express.d.ts src/express.d.ts.bak && npx tsc; mv src/express.d.ts.bak src/express.d.ts
src/app.ts:32:9 - error TS2339: Property 'id' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
…
```

`mv 元 先` は、ファイルの名前を変える（動かす）コマンドです（第1部 第1章）。`;` で区切ると、前のコマンドが失敗しても次のコマンドを動かします。

### 5.3 手を動かす: 動かす

`src/server.ts`:

```ts
import { createApp } from './app.ts';
import { createMemoryTaskRepo } from './memory-repo.ts';

const port = Number(process.env.PORT ?? 9477);
const repo = createMemoryTaskRepo();
await repo.create({ title: '牛乳を買う' });
await repo.create({ title: '本を返す', status: 'doing' });

const app = createApp(repo);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/api/tasks で待っています`);
});
```

```sh
$ node src/server.ts
http://127.0.0.1:9477/api/tasks で待っています
```

別のターミナルで:

```sh
$ curl -s http://127.0.0.1:9477/api/tasks/1
{"id":1,"title":"牛乳を買う","status":"todo","createdAt":"2026-11-11T10:54:57.877Z"}
$ curl -s 'http://127.0.0.1:9477/api/tasks?status=waiting'
{"error":"status は todo・doing・done のどれかです","requestId":"8eec8e3d-…"}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":""}' http://127.0.0.1:9477/api/tasks
{"error":"title（空でない文字列）が要ります","requestId":"647d2a93-…"}
```

`curl` のオプション（`-s` 進み具合を出さない、`-X` メソッド、`-H` ヘッダ、`-d` ボディ）は、第2部 第6章で学びました。URL に `?` を含むときは、zsh が `?` を特別な文字として読まないように、`'…'` で囲みます。確かめたら、サーバを `Ctrl` + `C` で止めてください。

## 6. ESLint: tsc では見つからない間違い

### 6.1 手を動かす: 待ち忘れた Promise

tsc は「型が合っているか」を確かめますが、**型は合っているのに、ほぼ間違いなくバグ**という書き方があります。第3部 第12章で、「`await` を忘れた Promise は、失敗しても誰も気づかない」と学びました。こうした書き方を見つけるのが **ESLint** と、その TypeScript 用の部品 **typescript-eslint** です。`~/dev/part07/ch37-ts-node` に戻って（`cd ..`）、`floating.ts` を作ります。

```ts
async function save(n: number): Promise<void> {
  if (n < 0) throw new Error(`負の数は保存できません: ${n}`);
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log('保存しました', n);
}

export function main(): void {
  save(1); // await も catch も無い（失敗しても誰も気づかない）
  [2, -3].forEach(async (n) => {
    await save(n); // forEach は Promise を待たない
  });
  const data: any = JSON.parse('{"n": 4}');
  console.log(data.m.toFixed());
}
```

```sh
$ npx tsc
$ npx eslint floating.ts

/Users/alice/dev/part07/ch37-ts-node/floating.ts
   8:3   error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises
   9:19  error  Promise returned in function argument where a void return was expected  @typescript-eslint/no-misused-promises
  12:9   error  Unsafe assignment of an `any` value  @typescript-eslint/no-unsafe-assignment
  12:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  13:15  error  Unsafe call of an `any` typed value  @typescript-eslint/no-unsafe-call
  13:20  error  Unsafe member access .m on an `any` value  @typescript-eslint/no-unsafe-member-access

✖ 6 problems (6 errors, 0 warnings)
```

tsc は何も言いませんでしたが、ESLint は6つのエラーを出しました。行の最後が、エラーを出した**ルール**の名前です。

| ルール | 見つけるもの | 直し方 |
| --- | --- | --- |
| `no-floating-promises` | `save(1);` のように、Promise を await も catch もしていない | `await save(1);`。待たないなら `save(1).catch((err) => …)` |
| `no-misused-promises` | Promise を返す関数を、Promise を待たない所に渡している（`forEach`・`setInterval`・`if` の条件） | `for … of` で await する、`() => { job().catch(…); }` で包む |
| `no-explicit-any` | `any` と書いた | `unknown` にして確かめる |
| `no-unsafe-*` | any の値を、確かめずに入れる・呼ぶ・項目を読む | 同じく `unknown` にする |
| `require-await` | await の無い async 関数（この教材の設定では無効。下の表） | |

`[2, -3].forEach(async (n) => …)` の何がまずいかは、練習問題7で確かめます（`forEach` は、渡した関数が返す Promise を待たないので、`-3` の失敗をだれも受け取りません）。

### 6.2 ESLint の設定を読む

ESLint は、lint するファイルのフォルダから上にたどって、`eslint.config.js` を探します。第7部の設定は、部のフォルダの [eslint.config.js](../eslint.config.js) です。

```js
// 第7部の ESLint の設定（第37章 6節で説明します）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // tsc が作った JavaScript（dist）は lint しない
  { ignores: ['**/dist/**'] },
  {
    files: ['**/*.ts'],
    // JavaScript の基本のルールと、型の情報を使う TypeScript のルール
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      // 型の情報を、それぞれのファイルにいちばん近い tsconfig.json から読む
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // node:test の test() は Promise を返すが、待たなくてよい（テストの道具が待つ）
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] }] },
      ],
      // _ で始まる引数は「使わないが、書く必要がある」（Express のエラーのミドルウェアの next など）
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // メモリのリポジトリのように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
    },
  },
);
```

| 部分 | 意味 |
| --- | --- |
| `defineConfig(…)` | 設定の配列を作る（並べた順に重ねる） |
| `{ ignores: ['**/dist/**'] }` | tsc が作った `dist/` は lint しない |
| `files: ['**/*.ts']` | `.ts` のファイルに、この設定を使う（`**` は「どの深さのフォルダでも」） |
| `js.configs.recommended` | JavaScript の基本のルール（使っていない変数、など） |
| `tseslint.configs.recommendedTypeChecked` | TypeScript のルールのうち、**型の情報を使う**もの（`no-floating-promises` など。「その式が Promise かどうか」は型を見ないと分からない） |
| `projectService: true` | 型の情報を、ファイルにいちばん近い `tsconfig.json` から読む |
| `rules` | ルールを調整する。`'off'` で無効、`['error', { … }]` でオプションを付ける |

この教材で調整した3つのルール:

| ルール | 調整 | 理由 |
| --- | --- | --- |
| `no-floating-promises` | `node:test` の `test()` は待たなくてよい | テストの道具が待つので、`test(…)` に await を書かないのがふつう |
| `no-unused-vars` | `_` で始まる引数は使わなくてよい | Express のエラーのミドルウェアは、4つ目の `next` を書く必要がある |
| `require-await` | 無効 | メモリのリポジトリのように、形をそろえるために await の無い async 関数を書くことがある |

> **ルールを1か所だけ無効にする**: `// eslint-disable-next-line ルール名` というコメントを書くと、次の行だけそのルールを無効にできます。テストの部品などで、理由があって any を使うときに使います（練習問題のテストの `readJson` がその例です）。ふだんのコードで、エラーを消すために使ってはいけません（第35章の `@ts-ignore` と同じです）。

## 7. まとめて確かめる: npm のスクリプトとテスト

### 7.1 手を動かす: npm run check

`todo-api/test/app.test.ts` を作ります。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createMemoryTaskRepo } from '../src/memory-repo.ts';

async function start(t: test.TestContext): Promise<string> {
  const repo = createMemoryTaskRepo(() => new Date('2026-11-11T00:00:00Z'));
  await repo.create({ title: '牛乳を買う' });
  const server = createApp(repo).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo; // listen(0) の後の address() は、いつも AddressInfo
  return `http://127.0.0.1:${port}/api/tasks`;
}

test('一覧と1件', async (t) => {
  const base = await start(t);
  const list = await fetch(base);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), [{ id: 1, title: '牛乳を買う', status: 'todo', createdAt: '2026-11-11T00:00:00.000Z' }]);
  assert.equal((await fetch(`${base}/1`)).status, 200);
  assert.equal((await fetch(`${base}/9`)).status, 404);
  assert.equal((await fetch(`${base}/abc`)).status, 404);
  assert.equal((await fetch(`${base}?status=waiting`)).status, 400);
});

test('作って消す', async (t) => {
  const base = await start(t);
  const res = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: ' 本を返す ' }) });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/api/tasks/2');
  assert.equal((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title": 1}' })).status, 422);
  assert.equal((await fetch(`${base}/2`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/2`, { method: 'DELETE' })).status, 404);
});
```

- テストは、第5部と同じく、サーバを起動して `fetch` で確かめます。ポートに `0` を渡すと、OS が空いているポートを選びます。テストを何本同時に動かしても、ぶつかりません。
- `server.address()` の型は `string | AddressInfo | null` です（Unix ドメインソケットのときは文字列、まだ listen していなければ null）。ここでは「TCP のポートで listen した後」なので、`as AddressInfo` で言い切っています。**自分の方が tsc より詳しいと言い切れる**、`as` の数少ない使い道です（第35章 6節）。
- `t: test.TestContext` は、`test` に渡す関数の引数 `t` の型です。

4.1節の `package.json` のスクリプトで、全部を確かめます。

```sh
$ cd todo-api
$ npm run check

> check
> npm run typecheck && npm run lint && npm test

> typecheck
> tsc

> lint
> eslint .

> test
> node --test "test/*.test.ts"

✔ 一覧と1件 (54.208727ms)
✔ 作って消す (22.401072ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

（空の行と、`ℹ` の行の一部を略しています。）

| スクリプト | すること |
| --- | --- |
| `dev` | `node --watch src/server.ts`。書き換えるたびに動かし直す |
| `start` | `node src/server.ts` |
| `typecheck` | `tsc`（tsconfig の `noEmit` で、確かめるだけ） |
| `lint` | `eslint .`（`.` は「このフォルダの中を全部」） |
| `test` | `node --test "test/*.test.ts"`。`"…"` で囲むのは、`*` を zsh ではなく Node.js に広げさせるため |
| `check` | 3つを順に動かす。`&&` は「前が成功したら次へ」なので、どこかで失敗したら、そこで止まる |

`npm run ○○` は、`package.json` の `scripts` の ○○ を動かします（第3部 第14章）。スクリプトの中の `tsc`・`eslint` は、上のフォルダの `node_modules/.bin` からも探されるので、`npx` を付けなくても動きます。

コミットする前（第11部では、GitHub にプッシュするたびに自動で）、`npm run check` を動かす習慣を付けます。**`node` で動かしただけでは、型のエラーは見つかりません**（1節の表）。

## 8. Python と比べる

| | Python（Flask） | Node.js（TypeScript） |
| --- | --- | --- |
| 型を確かめる | mypy・pyright | tsc |
| 書き方の間違いを見つける | ruff・flake8・pylint | ESLint（typescript-eslint） |
| 型を消して動かす | Python は型ヒントを読み飛ばす | Node.js の型の除去 |
| ライブラリの型 | パッケージに入っている（`py.typed`）か、`types-requests` のような別のパッケージ | パッケージに入っているか、`@types/○○` |
| 設定の場所 | `pyproject.toml` の `[tool.mypy]`・`[tool.ruff]` | `tsconfig.json`・`eslint.config.js` |
| Flask の `request.json` / Express の `req.body` | `Any` | `any` |

Flask の `request.json` も、Express の `req.body` も、型は Any です。外から来たデータは、どちらの言語でも、型を付けるだけでは守れません。Python では pydantic、TypeScript では Zod を使って確かめます（第38章）。

## まとめ

- TypeScript を動かす方法は、Node.js の型の除去・tsx・tsc のビルドの3つ。どれを使っても、型を確かめるのは tsc。この教材は `node` で動かし、`tsc` で確かめる。
- Node.js の型の除去は、`tsconfig.json` を読まない。enum・引数のプロパティ・値の namespace は動かない。
- ビルドするときは `outDir`・`rootDir`・`rewriteRelativeImportExtensions`・`sourceMap` を設定し、`node --enable-source-maps` で動かす。
- 型は `.d.ts` から来る。パッケージに入っているか、`@types/○○`（devDependencies）を入れる。
- データの層の形は `interface` で決める。`pool.query<Row>` の行の型は、tsc が信じるだけで確かめない。
- Express の `req.body` は any、`req.query` は文字列とは限らない。Request に項目を足すときは、`.d.ts` で宣言のマージを使う。
- ESLint（typescript-eslint）は、待ち忘れた Promise や any の使い方など、型は合っているがバグになる書き方を見つける。`npm run check` で、型・ESLint・テストをまとめて確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js 公式「Modules: TypeScript」: https://nodejs.org/api/typescript.html
- TypeScript 公式「TSConfig Reference」（`rewriteRelativeImportExtensions`・`erasableSyntaxOnly`・`outDir` など）: https://www.typescriptlang.org/tsconfig/
- TypeScript 公式 Handbook「Declaration Merging」: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
- DefinitelyTyped（`@types` のリポジトリ）: https://github.com/DefinitelyTyped/DefinitelyTyped
- tsx: https://tsx.is/
- typescript-eslint「Getting Started」「Linting with Type Information」: https://typescript-eslint.io/getting-started/
- typescript-eslint「no-floating-promises」: https://typescript-eslint.io/rules/no-floating-promises/
- ESLint「Configuration Files」: https://eslint.org/docs/latest/use/configure/configuration-files

---

前: [第36章 型の表現力](../ch36-ts-types/README.md) ／ 次: [第38章 型と実行時の境界](../ch38-ts-runtime/README.md) ／ 部の目次: [第7部 TypeScript](../README.md)
