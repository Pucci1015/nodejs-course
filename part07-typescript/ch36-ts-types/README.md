# 第36章 型の表現力

第35章では、`string`・`number`・オブジェクトの形・リテラル型といった、型の基本を学びました。この章では、型を**組み合わせて**、もっと多くのことを表します。「A か B のどちらか」を見分ける、「どんな型の配列にも使える関数」を書く、今ある型から別の型を作る、失敗を戻り値の型で表す、といったことです。
どれも、第7部の成果物で、タスク管理 API のデータの層・イベント・エラーに型を付けるときに使います。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第35章 |
| この章のゴール | `typeof`・`in`・`instanceof` などで型を絞り込める / 判別できるユニオンと `never` で、場合分けの書き忘れを tsc に見つけさせられる / 型ガード（`value is T`）を書ける / ジェネリクスで、型を引数として受け取る関数と型を書ける / ユーティリティ型で、今ある型から別の型を作れる / Result 型で失敗を表せる / `as const`・`keyof typeof`・`satisfies` で、値から型を作れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで型も確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part07/ch36-ts-types/` で実行します。手を動かして作るファイルは、このフォルダの直下に置きます。
>
>   ```sh
>   $ cd ~/dev/part07/ch36-ts-types
>   ```
>
> - 第35章と同じく、`node ファイル.ts` で動かし、`npx tsc` で確かめます。わざとエラーを出した所は、確かめたら元に戻してください。
> - 7節（`satisfies` など）と 8節（クラス）は、急ぐなら後回しにしてかまいません。練習問題は 7節を使いません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 絞り込みと型ガード（1・3節） | 第38章（外から来たデータを確かめる。Zod は型ガードを作ってくれる道具）、成果物（エラーの種類で 404・409・422 に分ける） |
| 判別できるユニオンと `never`（2節） | 成果物（冪等キーの「処理中」と「済み」の型 `IdempotencyRecord`）、第8部（画面の状態「読み込み中・成功・失敗」） |
| ジェネリクス（4節） | 第37章（`pool.query<Row>()`、Express の `Request<…>`）、成果物（`Page<Task>`） |
| ユーティリティ型（5節） | 成果物（`NewTask`・`TaskPatch` を `Task` から作る）、第38章（Zod の `pick`・`partial`） |
| Result 型（6節） | 第38章（Zod の `safeParse` の戻り値が、この形） |
| クラスと型（8節） | 成果物（エラーのクラス `NotFoundError` など） |

---

## 1. 絞り込み（narrowing）

第35章 5節で、`if (found === undefined) … else …` の `else` では、found の型が `Task` になることを見ました。tsc は `if` や `switch` を読んで、その中での型を細かくします。これを**絞り込み**（narrowing）と言います。

### 1.1 手を動かす: いろいろな確かめ方

`narrow.ts` を作ります。

```ts
function show(value: string | number | string[] | null): string {
  if (value === null) return '（なし）'; // ここから下では、value は null ではない
  if (typeof value === 'string') return `文字列 ${value.toUpperCase()}`;
  if (typeof value === 'number') return `数 ${value.toFixed(1)}`;
  // 残りは string[] だけ
  return `配列 ${value.join('・')}`;
}

console.log(show('todo'));
console.log(show(3));
console.log(show(['家', '急ぎ']));
console.log(show(null));

// in: その項目があるかどうかで絞り込む
type Cat = { name: string; meow: () => string };
type Dog = { name: string; bark: () => string };

function speak(animal: Cat | Dog): string {
  if ('meow' in animal) return animal.meow(); // ここでは Cat
  return animal.bark(); // ここでは Dog
}
console.log(speak({ name: 'たま', meow: () => 'にゃー' }));

// instanceof: クラスで作ったものかどうか
function toText(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
console.log(toText(new Date('2026-11-11T00:00:00Z')), toText('2026-11-12'));
```

```sh
$ node narrow.ts
文字列 TODO
数 3.0
配列 家・急ぎ
（なし）
にゃー
2026-11-11 2026-11-12
```

| 確かめ方 | 絞り込める型 | 例 |
| --- | --- | --- |
| `=== null`、`=== undefined`、`=== 'todo'` | その値そのもの | `if (value === null) return …` の後では、value は null ではない |
| `typeof value === 'string'` | `string`・`number`・`boolean`・`function` など | `'object'` は null と配列も含むので注意（3節） |
| `Array.isArray(value)` | 配列 | |
| `'meow' in animal` | その項目を持つ形 | ユニオンの中で、その項目があるものだけに |
| `value instanceof Date` | そのクラスで作ったもの | `Date`・`Error`・自分で作ったクラス（8節） |
| `if (value)` | null・undefined・`false`・`0`・`''` ではないもの | **0 と空の文字列も外れる**ので、数や文字列には使わない |

`if` の中で `return` すると、その後ろの行では、`return` した場合が除かれます（`show` の最後の行で、value は `string[]` だけになっています）。

### 1.2 手を動かす: 絞り込まずに使う

`narrow.ts` の最後に足して、`npx tsc` を動かします。

```ts
function bad(value: string | number) {
  return value.toUpperCase();
}
```

```sh
$ npx tsc
narrow.ts:30:16 - error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  Property 'toUpperCase' does not exist on type 'number'.
```

ユニオン型の値には、**全部の型に共通する**ことしかできません。`toUpperCase` は string にしか無いので、`typeof value === 'string'` で絞り込んでから使います。確かめたら、足した行を消してください。

## 2. 判別できるユニオン

### 2.1 手を動かす: type の値で形を見分ける

タスクの「作った」「題名を変えた」「消した」というイベントは、それぞれ持っている項目が違います。こうしたものは、**どれにもある項目（ここでは `type`）の値で見分けられる**ユニオンにします。`events.ts` を作ります。

```ts
type Task = { id: number; title: string };

type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'renamed'; id: number; from: string; to: string }
  | { type: 'deleted'; id: number };

function describe(e: TaskEvent): string {
  switch (e.type) {
    case 'created':
      return `作成: #${e.task.id} ${e.task.title}`; // ここでは e は created の形
    case 'renamed':
      return `題名の変更: #${e.id} ${e.from} → ${e.to}`;
    case 'deleted':
      return `削除: #${e.id}`;
    default:
      return assertNever(e); // ここに来ることは無い（来たら tsc がエラーにする）
  }
}

// never: 「値が1つも無い型」。全部の case を書いていれば、default の e は never になる
function assertNever(x: never): never {
  throw new Error(`知らないイベントです: ${JSON.stringify(x)}`);
}

const events: TaskEvent[] = [
  { type: 'created', task: { id: 1, title: '牛乳を買う' } },
  { type: 'renamed', id: 1, from: '牛乳を買う', to: '豆乳を買う' },
  { type: 'deleted', id: 1 },
];
for (const e of events) console.log(describe(e));
```

```sh
$ node events.ts
作成: #1 牛乳を買う
題名の変更: #1 牛乳を買う → 豆乳を買う
削除: #1
```

| 書き方 | 意味 |
| --- | --- |
| `\| { type: 'created'; task: Task } \| …` | 3つの形のどれか。先頭の `\|` は、並べて書くと読みやすいので付けてよい |
| `switch (e.type)` の `case 'created':` | その中では、e は created の形。`e.task` が使える（renamed の形には task が無いので、絞り込まずに `e.task` と書くとエラー） |
| `never` | 「値が1つも無い型」。`never` の引数には、何も渡せない |
| `default: return assertNever(e);` | 全部の case を書いていれば、ここに来る e は無い（never）。書き忘れた case があると、e がその形になり、never に渡せないのでエラーになる |

こうした形を**判別できるユニオン**（discriminated union）と言い、見分けるための項目（`type`）を**判別子**と言います。第5部 第27章で SSE で送ったイベント（`event: task-created` など）も、この形で型を付けられます。

### 2.2 手を動かす: case を書き忘れる

`events.ts` の `case 'deleted':` と、その次の `return` の2行を消して、`npx tsc` を動かします。

```sh
$ npx tsc
events.ts:15:26 - error TS2345: Argument of type '{ type: "deleted"; id: number; }' is not assignable to parameter of type 'never'.
```

「deleted の形が、never の所に来てしまう」と言っています。イベントの種類を後から足したときも、この `assertNever` がある `switch` が全部エラーになるので、直し忘れを防げます。確かめたら元に戻してください。

> **第35章の TS2366 との違い**: 第35章 7.2節では、戻り値の型が string の関数で case を書き忘れると、「最後に return が無い」というエラーになりました。`assertNever` を使うと、戻り値が無い関数（`void`）や、`switch` の後に処理が続く関数でも、書き忘れを見つけられます。また、型を無視して変な値が来たとき（JavaScript から呼ばれた、など）に、実行時にも分かりやすいエラーで止まります。

## 3. 型ガード

### 3.1 手を動かす: 確かめる関数を作る

第35章 6節では、`unknown` の値の title を読むために、`typeof u === 'object' && u !== null && 'title' in u && …` と長く書きました。何度も使う確かめは、関数にします。`guards.ts` を作ります。

```ts
type Task = { id: number; title: string; done: boolean };

// 戻り値の型 value is Task: true を返したら、value は Task だと tsc に教える
function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'id' in value && typeof value.id === 'number' &&
    'title' in value && typeof value.title === 'string' &&
    'done' in value && typeof value.done === 'boolean'
  );
}

// asserts value is Task: 戻ってきたら value は Task。違えば投げる
function assertTask(value: unknown): asserts value is Task {
  if (!isTask(value)) throw new TypeError(`タスクの形ではありません: ${JSON.stringify(value)}`);
}

const data: unknown = JSON.parse('[{"id":1,"title":"牛乳を買う","done":false},{"id":"2","title":"本を返す"}]');
if (Array.isArray(data)) {
  const tasks = data.filter(isTask); // filter に型ガードを渡すと、結果は Task[] になる
  console.log(tasks.map((t) => t.title));
}

const one: unknown = JSON.parse('{"id":3,"title":"掃除","done":true}');
assertTask(one);
console.log(one.title, one.done); // ここでは one は Task

try {
  assertTask({ id: 4 });
} catch (err) {
  if (err instanceof Error) console.log(err.message);
}
```

```sh
$ node guards.ts
[ '牛乳を買う' ]
掃除 true
タスクの形ではありません: {"id":4}
```

| 書き方 | 意味 |
| --- | --- |
| `(value: unknown): value is Task` | 戻り値は boolean。true を返したら「value は Task」と tsc に教える（**型ガード**、type guard） |
| `(value: unknown): asserts value is Task` | 何も返さない。戻ってきたら value は Task。違うときは throw する（**アサーション関数**） |
| `'id' in value && typeof value.id === 'number'` | `'id' in value` の後では、`value.id` が読める（型は unknown）。続けて typeof で確かめる |
| `data.filter(isTask)` | filter に型ガードを渡すと、結果の配列の型が `Task[]` になる |
| `catch (err)` の `err` | 型は `unknown`（何が throw されるか分からないので）。`instanceof Error` で絞り込んでから使う |

**型ガードの中身が正しいかどうかは、tsc は確かめません**。`isTask` が `return true;` だけでも、tsc は信じます。型ガードは「`as` を、確かめる処理と一緒に1か所にまとめたもの」と考え、テストで確かめます。これを手で書くのは大変なので、第38章で Zod という道具に作らせます。

> **typeof の 'object'**: `typeof null` も `typeof []` も `'object'` です。オブジェクトかどうかを確かめるときは、`typeof value === 'object' && value !== null` と書き、配列を除きたいなら `!Array.isArray(value)` も足します。

## 4. ジェネリクス

### 4.1 手を動かす: 型を引数として受け取る

「配列の最初の要素を返す」関数は、文字列の配列にも数の配列にも使いたいものです。`(items: unknown[]): unknown` と書くと、戻り値が unknown になって使いにくくなります。`generics.ts` を作ります。

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const s = first(['牛乳', '本']); // string | undefined
const n = first([10, 20]); // number | undefined
console.log(s, n);

// K extends keyof T: K は T の項目の名前のどれか（keyof T は、項目の名前のユニオン）
// T[K] は「T の K の項目の型」
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

type Task = { id: number; title: string; done: boolean };
const tasks: Task[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '本を返す', done: true },
];
const titles = pluck(tasks, 'title'); // string[]
const ids = pluck(tasks, 'id'); // number[]
console.log(titles, ids);

// 型にも引数を付けられる。Page<Task> は「Task のページ」
type Page<T> = { items: T[]; nextCursor: string | null };
const page: Page<Task> = { items: tasks, nextCursor: null };
console.log(page.items.length);

// extends で「こういう形のものだけ」と制限する
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
console.log(longest('ねこ', 'いぬねこ'), longest([1, 2], [3]));
```

```sh
$ node generics.ts
牛乳 10
[ '牛乳を買う', '本を返す' ] [ 1, 2 ]
2
いぬねこ [ 1, 2 ]
```

| 書き方 | 意味 |
| --- | --- |
| `function first<T>(items: T[]): T \| undefined` | `T` は**型の引数**（型パラメータ）。呼ぶときに、渡した値から決まる。`first(['牛乳'])` なら T は string |
| `first<number>([])` | 型の引数を自分で書くこともできる（推論できないとき） |
| `keyof T` | T の項目の名前のユニオン。`keyof Task` は `'id' \| 'title' \| 'done'` |
| `K extends keyof T` | 「K は T の項目の名前のどれか」という制限 |
| `T[K]` | 「T の K の項目の型」。`Task['title']` は string |
| `type Page<T> = { … }` | 型にも型の引数を付けられる。`Page<Task>` |
| `T extends { length: number }` | 「length を持つものだけ」という制限。文字列と配列は渡せるが、数は渡せない |

このような「型を引数として受け取る」書き方を**ジェネリクス**（generics）と言います。すでに使っているものでは、`Array<string>`（`string[]` と同じ）、`Promise<Task>`、`Map<string, number>` がジェネリクスです。

```ts
const counts = new Map<string, number>(); // 空の Map は、キーと値の型を <…> で書く
counts.set('todo', 2);
const n = counts.get('todo'); // number | undefined（無いキーもあるので）
```

### 4.2 手を動かす: 無い項目の名前を渡す

`generics.ts` の最後に `pluck(tasks, 'titel');` を足して、`npx tsc` を動かします。

```sh
$ npx tsc
generics.ts:34:14 - error TS2345: Argument of type '"titel"' is not assignable to parameter of type 'keyof Task'.
```

`'titel'` は Task の項目の名前ではないので、渡せません。文字列で項目の名前を渡す関数でも、打ち間違いを見つけられます。確かめたら、足した行を消してください。

## 5. ユーティリティ型

### 5.1 手を動かす: 今ある型から別の型を作る

タスク管理 API では、「保存されているタスク」「作るときに送ってくるもの」「変えるときに送ってくるもの」が少しずつ違います。全部を別々に書くと、項目を足したときに直し忘れます。TypeScript に最初から入っている**ユーティリティ型**で、1つの型から作ります。`utility.ts` を作ります。

```ts
type Task = {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
  createdAt: string;
};

// 作るときに客が送ってくるもの: id と createdAt はサーバが付けるので除く
type NewTask = Omit<Task, 'id' | 'createdAt'>;
// 変えるときに送ってくるもの: 3つのうち、変えたいものだけ
type TaskPatch = Partial<Pick<Task, 'title' | 'status' | 'dueDate'>>;
// 状態ごとの数
type Counts = Record<Task['status'], number>;

function applyPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...patch };
}

const task: Task = { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, createdAt: '2026-11-11T09:00:00.000Z' };
const draft: NewTask = { title: '本を返す', status: 'todo', dueDate: '2026-11-20' };
const counts: Counts = { todo: 2, doing: 0, done: 1 };
console.log(applyPatch(task, { status: 'doing' }));
console.log(draft, counts);

// 関数の型から取り出す
async function loadTask(id: number): Promise<Task> {
  return { ...task, id };
}
type Loaded = Awaited<ReturnType<typeof loadTask>>; // Task（Promise を外したもの）
const loaded: Loaded = await loadTask(2);
console.log(loaded.id);

// Readonly: 全部の項目を readonly に
const frozen: Readonly<Task> = task;
console.log(frozen.title);
```

```sh
$ node utility.ts
{
  id: 1,
  title: '牛乳を買う',
  status: 'doing',
  dueDate: null,
  createdAt: '2026-11-11T09:00:00.000Z'
}
{ title: '本を返す', status: 'todo', dueDate: '2026-11-20' } { todo: 2, doing: 0, done: 1 }
2
牛乳を買う
```

| ユーティリティ型 | 作る型 | 例 |
| --- | --- | --- |
| `Partial<T>` | 全部の項目を「無くてよい」に | `Partial<Task>` |
| `Required<T>` | 全部の項目を「必ずある」に | |
| `Readonly<T>` | 全部の項目を readonly に | |
| `Pick<T, K>` | K の項目だけ | `Pick<Task, 'id' \| 'title'>` |
| `Omit<T, K>` | K の項目を除いたもの | `Omit<Task, 'id'>` |
| `Record<K, V>` | キーが K、値が V のオブジェクト | `Record<'todo' \| 'doing' \| 'done', number>` |
| `ReturnType<F>`・`Parameters<F>` | 関数の戻り値・引数の型 | 第35章 9節 |
| `Awaited<T>` | Promise を外した型 | `Awaited<Promise<Task>>` は Task |
| `NonNullable<T>` | null と undefined を除いた型 | `NonNullable<string \| null>` は string |

`Task['status']` は、4節の `T[K]` と同じで「Task の status の項目の型」（`'todo' | 'doing' | 'done'`）です。状態を足したら、`Counts` も自動で変わります。

### 5.2 Partial はどう作られているか（マップ型）

`Partial` は、TypeScript の中で次のように定義されています。

```ts
type Partial<T> = { [K in keyof T]?: T[K] };
```

「T の項目の名前 K の1つずつについて、`K?: T[K]` という項目を作る」という意味です。このように、項目ごとに型を作る書き方を**マップ型**（mapped type）と言います。自分で書くことは多くありませんが、練習問題8の解答で使います。

### 5.3 手を動かす: 作った型に合わない値

`utility.ts` の最後に足して、`npx tsc` を動かします。

```ts
applyPatch(task, { status: 'waiting' });
applyPatch(task, { id: 9 });
```

```sh
$ npx tsc
utility.ts:37:20 - error TS2322: Type '"waiting"' is not assignable to type '"done" | "todo" | "doing" | undefined'.
utility.ts:38:20 - error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Partial<Pick<Task, "title" | "status" | "dueDate">>'.
```

`TaskPatch` には id が無いので、id を変えようとするとエラーになります。確かめたら、足した行を消してください。

## 6. Result 型: 失敗を戻り値で表す

### 6.1 手を動かす: throw せずに失敗を返す

`throw` したエラーは、型に出てきません（どの関数が何を投げるかを、tsc は知りません）。入力の確かめのように「失敗するのがふつう」の処理は、**成功と失敗のどちらかを返す**形にすると、呼んだ側が失敗を扱い忘れません。`result.ts` を作ります。

```ts
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parseLimit(text: string | undefined): Result<number> {
  if (text === undefined) return { ok: true, value: 20 };
  const n = Number(text);
  if (!Number.isInteger(n)) return { ok: false, error: 'limit は整数です' };
  if (n < 1 || n > 100) return { ok: false, error: 'limit は 1〜100 です' };
  return { ok: true, value: n };
}

for (const text of [undefined, '50', 'abc', '500']) {
  const r = parseLimit(text);
  // ok で絞り込むと、value か error のどちらかだけが使える
  if (r.ok) console.log(`${text} → ${r.value}`);
  else console.log(`${text} → エラー: ${r.error}`);
}
```

```sh
$ node result.ts
undefined → 20
50 → 50
abc → エラー: limit は整数です
500 → エラー: limit は 1〜100 です
```

| 書き方 | 意味 |
| --- | --- |
| `type Result<T, E = string>` | 成功なら `{ ok: true; value: T }`、失敗なら `{ ok: false; error: E }`。`E = string` は、型の引数の決まりの値 |
| `if (r.ok)` | `ok` が判別子（2節）。true の中では `r.value`、そうでなければ `r.error` が使える |

`result.ts` の最後に足して、`npx tsc` を動かすと、確かめずに value を読めないことが分かります。

```ts
const r2 = parseLimit('5');
console.log(r2.value);
```

```sh
$ npx tsc
result.ts:18:16 - error TS2339: Property 'value' does not exist on type 'Result<number, string>'.
  Property 'value' does not exist on type '{ ok: false; error: string; }'.
```

確かめたら、足した行を消してください。第38章の Zod の `safeParse` も、`{ success: true, data }` か `{ success: false, error }` を返す、この形です。

| | throw する | Result を返す |
| --- | --- | --- |
| 呼んだ側が失敗を忘れると | 上へ上へと伝わり、最後はサーバのエラー（500）や、プロセスが止まる | tsc がエラーにする（value を読めない） |
| 向いている場面 | めったに起きない失敗（データベースにつながらない、など） | よく起きる失敗（入力が間違っている、見つからない） |

## 7. 値から型を作る: as const・keyof typeof・satisfies

### 7.1 手を動かす: 一覧を1か所に書く

状態の一覧（`['todo', 'doing', 'done']`）は、型（`Status`）だけでなく、値としても要ります（入力が正しいか確かめる、画面に選ぶ肢を出す）。両方を書くとずれるので、**値を書いて、型はそこから取り出します**。`satisfies.ts` を作ります。

```ts
const STATUSES = ['todo', 'doing', 'done'] as const;
type Status = (typeof STATUSES)[number]; // 'todo' | 'doing' | 'done'

// satisfies: 「この型に合っているか確かめる。でも、推論された細かい型はそのまま残す」
const LABELS = {
  todo: '未着手',
  doing: '作業中',
  done: '完了',
} satisfies Record<Status, string>;

type LabelKey = keyof typeof LABELS; // 'todo' | 'doing' | 'done'
const key: LabelKey = 'doing';
console.log(LABELS[key], STATUSES.length);

// テンプレートリテラル型: 文字列の形を型にする
type CacheKey = `task:${number}`;
const k1: CacheKey = 'task:42';
console.log(k1);

function isStatus(text: string): text is Status {
  return (STATUSES as readonly string[]).includes(text);
}
console.log(isStatus('done'), isStatus('waiting'));
```

```sh
$ node satisfies.ts
作業中 3
task:42
true false
```

| 書き方 | 意味 |
| --- | --- |
| `['todo', 'doing', 'done'] as const` | 型は `readonly ['todo', 'doing', 'done']`（`as const` が無いと `string[]`） |
| `(typeof STATUSES)[number]` | 型の所の `typeof` は「値の型」。`[number]` は「配列の要素の型」。合わせて `'todo' \| 'doing' \| 'done'` |
| `{ … } satisfies Record<Status, string>` | 「Status の全部のキーがあり、値が string か」を確かめる。足りないキーや、余分なキーがあるとエラー。変数の型は、推論された細かい型のまま |
| `keyof typeof LABELS` | LABELS のキーのユニオン |
| `` `task:${number}` `` | **テンプレートリテラル型**。`'task:42'` は合うが、`'task:abc'` は合わない |
| `(STATUSES as readonly string[]).includes(text)` | `includes` に string を渡すために、一覧を広い型として見る。広くする向きの `as` は安全 |

`satisfies` と `: 型` の違い: `const LABELS: Record<Status, string> = { … }` と書いても確かめられますが、変数の型が `Record<Status, string>` になってしまい、`keyof typeof LABELS` が `Status` に、値も `string` になります。`satisfies` は、確かめるだけで、細かい型を残します。

## 8. クラスと型

### 8.1 手を動かす: #private・implements・エラーのクラス

第3部 第11章で学んだクラスにも、型を付けられます。成果物のエラー（`NotFoundError` など）はクラスです。`classes.ts` を作ります。

```ts
interface Counter {
  increment(): number;
  readonly value: number;
}

class MemoryCounter implements Counter {
  #count = 0; // # で始まる項目は、クラスの外から読めない（JavaScript の機能）

  increment(): number {
    this.#count += 1;
    return this.#count;
  }

  get value(): number {
    return this.#count;
  }
}

const c = new MemoryCounter();
c.increment();
c.increment();
console.log(c.value);

// エラーのクラス。項目の型を書き、constructor で入れる
class NotFoundError extends Error {
  readonly status = 404;
  readonly resource: string;

  constructor(resource: string, options?: ErrorOptions) {
    super(`${resource} が見つかりません`, options);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

try {
  throw new NotFoundError('タスク 9', { cause: new Error('行がありません') });
} catch (err) {
  // catch の err は unknown。instanceof で絞り込んでから使う
  if (err instanceof NotFoundError) console.log(err.status, err.message, err.resource, err.cause instanceof Error);
}
```

```sh
$ node classes.ts
2
404 タスク 9 が見つかりません タスク 9 true
```

| 書き方 | 意味 |
| --- | --- |
| `class MemoryCounter implements Counter` | 「Counter の形を満たしている」ことを tsc に確かめさせる。足りないメソッドがあるとエラー |
| `#count = 0` | 外から読めない項目（JavaScript の機能）。初めの値から型が推論される |
| `readonly resource: string;` | 項目の型を、クラスの中に書く。constructor で入れる |
| `options?: ErrorOptions` | `{ cause }` を受け取るための型（`@types/node` と、標準の型に入っている） |
| `err instanceof NotFoundError` | 自分のクラスでも、instanceof で絞り込める |

### 8.2 手を動かす: 引数のプロパティは使わない

TypeScript には、`constructor(private label: string) {}` と書くと、引数をそのまま項目にしてくれる書き方（**引数のプロパティ**、parameter property）があります。これも enum（第35章 7.4節）と同じで、型を消すだけでは JavaScript にならないので、Node.js では動きません。`classes.ts` の最後に足して確かめます。

```ts
class Box {
  constructor(private label: string) {}
}
```

```sh
$ node classes.ts
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript parameter property is not supported in strip-only mode
$ npx tsc
classes.ts:43:15 - error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

項目を宣言して constructor で入れる、8.1節の書き方にします。確かめたら、足した行を消してください。

> **`private` と `#`**: TypeScript の `private label: string;` も「外から読めない」を表しますが、確かめるのは tsc だけで、動かすときは読めてしまいます。`#label` は JavaScript そのものの機能なので、動かすときも読めません。この教材では `#` を使います。

## 9. 型の確かめ用のファイルで使う書き方

練習問題の `○○.check.ts` には、次の書き方も出てきます。読めれば十分です。

| 書き方 | 意味 |
| --- | --- |
| `declare const tasks: Task[];` | 「tasks という Task[] の値がある」と tsc に教えるだけで、値は作らない。型を確かめるためだけに使う |
| `typeof ok<number>` | 型の引数を決めた関数の型（`ok` を T = number で呼んだときの型） |
| `Parameters<Emitter<E>['emit']>[0]` | Emitter の emit メソッドの、1つ目の引数の型 |

## 10. Python と比べる

| | Python（mypy） | TypeScript |
| --- | --- | --- |
| 絞り込み | `isinstance(x, str)`、`x is None` | `typeof x === 'string'`、`x === null` |
| 型ガード | `def is_task(x: object) -> TypeGuard[Task]:` | `function isTask(x: unknown): x is Task` |
| 判別できるユニオン | `Literal` の項目を持つ TypedDict のユニオン | `{ type: 'a'; … } \| { type: 'b'; … }` |
| 書き忘れの確かめ | `assert_never(x)`（`typing`） | `assertNever(x)`（自分で書く） |
| ジェネリクス | `def first[T](items: list[T]) -> T \| None:`（3.12 から） | `function first<T>(items: T[]): T \| undefined` |
| 形で比べる | `Protocol` | `type`・`interface`（いつも形で比べる） |

Python の `class` は、名前で比べる（`isinstance` は「そのクラスから作ったか」を見る）のがふつうです。TypeScript は、`type` も `interface` もクラスも、**形で比べる**のがふつうです（`implements` を書かなくても、形が合えば渡せます）。

## まとめ

- `if`・`switch` で確かめると、その中で型が絞り込まれる。`typeof`・`=== null`・`Array.isArray`・`in`・`instanceof`。`if (value)` は 0 と `''` も外すので注意。
- 判別子（`type`）を持つユニオンは、`switch` で見分ける。`default` で `assertNever(e)` を呼ぶと、case の書き忘れを tsc が見つける。
- 型ガード（`value is T`）とアサーション関数（`asserts value is T`）で、確かめを関数にまとめる。中身が正しいかは tsc は確かめないので、テストする。
- ジェネリクス（`<T>`）で、型を引数として受け取る。`keyof T` と `T[K]` で、項目の名前とその型を結び付ける。
- `Partial`・`Pick`・`Omit`・`Record` などで、1つの型から別の型を作る。
- よく起きる失敗は、Result 型（`{ ok: true; value } | { ok: false; error }`）で返すと、扱い忘れを tsc が見つける。
- 値を書いて、型はそこから取り出す（`as const`・`typeof`・`satisfies`）。enum と引数のプロパティは使わない。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- TypeScript 公式 Handbook「Narrowing」: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript 公式 Handbook「Generics」: https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript 公式 Handbook「Keyof Type Operator」「Indexed Access Types」「Mapped Types」: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
- TypeScript 公式「Utility Types」: https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript 4.9 のリリースノート（`satisfies`）: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- MDN「Private properties」（`#`）: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Classes/Private_properties

---

前: [第35章 TypeScript の基礎](../ch35-ts-basics/README.md) ／ 次: [第37章 Node.js プロジェクトでの TypeScript](../ch37-ts-node/README.md) ／ 部の目次: [第7部 TypeScript](../README.md)
