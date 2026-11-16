# 第35章 TypeScript の基礎

第6部までは、JavaScript でタスク管理 API を書いてきました。JavaScript では、項目の名前の打ち間違いや、数のつもりで文字列を渡す間違いに、**動かすまで**気づけません。しかも、動かしても止まらずに `undefined` や変な値のまま進んでしまうことがあります。
この章では、JavaScript に**型**（「この変数には数が入る」「このオブジェクトには title がある」という決まり）を書き足した言語、**TypeScript** を学びます。型を書くと、`tsc` という道具が、動かす前に間違いを見つけてくれます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第3部（JavaScript の関数・オブジェクト・配列・モジュール）、第6部までの成果物を作ったこと |
| この章のゴール | TypeScript が何をして、何をしないかを説明できる / `node` で `.ts` を動かし、`tsc` で型を確かめられる / 変数・関数・オブジェクトに型を付けられる / `undefined`・`null` かもしれない値を正しく扱える / `any`・`unknown`・`as` の違いを説明できる / リテラル型で「決まった文字列のどれか」を表せる / `tsconfig.json` の設定を読める |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで型も確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第7部の最初の章です。1節で、第7部のフォルダを `~/dev/part07` にコピーし、TypeScript などのパッケージを入れます（1回だけ）。
> - この章のコマンドは、`~/dev/part07/ch35-ts-basics/` で実行します。手を動かして作るファイルは、このフォルダの直下に置きます。
>
>   ```sh
>   $ cd ~/dev/part07/ch35-ts-basics
>   ```
>
> - 型のエラーを見るために、わざと間違えたコードを書く所があります。エラーを確かめたら、本文のとおりに直してから次に進んでください（直さないと、次の `npx tsc` にも同じエラーが出続けます）。
> - 10節（Python との比べ）は、Python の型ヒントを使ったことが無ければ、飛ばしてかまいません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `node` で `.ts` を動かし、`tsc` で確かめる（1節） | 第7部のすべての章と成果物、第8部（React の画面も TypeScript で書く） |
| 関数とオブジェクトの型（3・4節） | 第36章（型を組み合わせる）、第37章（Express とデータの層に型を付ける） |
| `undefined`・`null` を扱う（5節） | 第7部の成果物（「無ければ 404」を型で忘れないようにする）、第8部（画面のデータがまだ無いとき） |
| `any`・`unknown`・`as`（6節） | 第38章（外から来たデータは型では守れない。Zod で確かめる） |
| リテラル型とユニオン（7節） | 第36章（判別できるユニオン）、成果物（タスクの状態 `'todo' \| 'doing' \| 'done'`） |
| `tsconfig.json`（8節） | 第37章（ビルドの設定）、第8部（Vite の設定） |

---

## 0. TypeScript は何をしてくれるのか

JavaScript で書いた次のプログラムには、間違いが2つあります。

```js
const task = { id: 1, title: '牛乳を買う', done: false };

function label(t) {
  return `${t.id}: ${t.titel}`; // titel は title の打ち間違い
}

function addDays(dateText, days) {
  const d = new Date(dateText);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log(label(task));
console.log(addDays('2026-11-11', '3')); // 3 ではなく '3'（文字列）を渡した
```

```sh
$ node samples/bug.mjs
1: undefined
2027-02-21
```

- `t.titel` は `title` の打ち間違いですが、JavaScript は「無い項目」を `undefined` として読むので、止まりません。
- `addDays('2026-11-11', '3')` は、3日後（2026-11-14）のつもりでした。ところが `d.getDate() + '3'` が、数の足し算ではなく文字列をつなげる `'11' + '3'` = `'113'` になり、113日後の日付が出ました。

どちらも、動かしても**エラーにならない**ので、気づくのが遅れます。同じコードに型を付けたのが `samples/bug.ts` です。

```ts
type Task = { id: number; title: string; done: boolean };

const task: Task = { id: 1, title: '牛乳を買う', done: false };

function label(t: Task): string {
  return `${t.id}: ${t.titel}`; // titel は title の打ち間違い
}

function addDays(dateText: string, days: number): string {
  const d = new Date(dateText);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log(label(task));
console.log(addDays('2026-11-11', '3')); // 3 ではなく '3'（文字列）を渡した
```

TypeScript のファイルは、拡張子が `.ts` です。`: Task` や `: number` が**型注釈**（type annotation）で、「この引数には Task の形のオブジェクトが来る」「この引数は数」という決まりを書いています。`tsc`（TypeScript のコンパイラ）に確かめさせると、動かす前に2つとも見つかります。

```sh
$ cd samples && npx tsc; cd ..
bug.ts:7:24 - error TS2551: Property 'titel' does not exist on type 'Task'. Did you mean 'title'?

7   return `${t.id}: ${t.titel}`; // titel は title の打ち間違い
                         ~~~~~

  bug.ts:2:27
    2 type Task = { id: number; title: string; done: boolean };
                                ~~~~~
    'title' is declared here.

bug.ts:17:35 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

17 console.log(addDays('2026-11-11', '3')); // 3 ではなく '3'（文字列）を渡した
                                     ~~~


Found 2 errors in the same file, starting at: bug.ts:7
```

TypeScript について、最初に押さえておくことは3つです。

| | 説明 |
| --- | --- |
| TypeScript = JavaScript + 型 | 型の部分を取り除くと、そのまま JavaScript になる。書き方を新しく覚えるのは、型の部分だけ |
| 型は**動かす前**に確かめる | 確かめるのは `tsc`（と、エディタ）。動かすとき（実行時）には、型はもう無い |
| 型は**動かしたときの値を変えない** | 型を付けても、プログラムの動きは変わらない。間違いを教えてくれるだけ |

3つ目が大事です。`node samples/bug.ts` と打つと、型のエラーがあっても、`bug.mjs` と同じように動いてしまいます（1.2節で確かめます）。

## 1. 準備

### 1.1 手を動かす: 第7部のフォルダを作る

第7部のサンプルと練習問題は、TypeScript などの外部のパッケージを使います。第5・6部と同じく、**第7部のフォルダを `~/dev/part07` にコピーし、そこで動かします**。次を1回だけ実行します。

```sh
$ bash （ここに Finder から part07-typescript フォルダの中の setup-part07.sh をドラッグ）
（npm ci の出力）
作りました: /Users/alice/dev/part07
  次は: cd /Users/alice/dev/part07/ch35-ts-basics
$ cd ~/dev/part07/ch35-ts-basics
$ npx tsc -v
Version 6.0.3
```

- `setup-part07.sh` は、教材の `part07-typescript` フォルダを `~/dev/part07` にコピーし、`npm ci` で [package.json](../package.json) に書いたパッケージを入れます（第3部 第14章 9節）。`~/dev/part07` が既にあれば、何もしません。
- `npx tsc` は、「このフォルダ（か、その上のフォルダ）の `node_modules` に入っている `tsc` を動かす」という意味です。`npx` は npm に付いてくるコマンドで、`node_modules/.bin/` の中のコマンドを探して動かします。`-v` は版（version）を出すオプションです。

入るパッケージのうち、この章で使うのは次の2つです。

| パッケージ | 中身 |
| --- | --- |
| `typescript` 6.0.3 | `tsc` コマンド。型を確かめる（と、JavaScript に変換する。第37章） |
| `@types/node` | Node.js の関数（`process`・`node:fs` など）の型。8節 |

> **TypeScript 7 について**: 執筆時点（2026年11月）では、TypeScript 7（`tsc` を Go という言語で書き直し、10倍ほど速くしたもの）も出ています。ただ、第37章で使う ESLint の TypeScript 用の部品（typescript-eslint）が、まだ 7 に対応していないので、この教材は 6.0.3 を使います。書くコードと `tsc` の使い方は、7 でも同じです。新しい版の様子は、公式の https://www.typescriptlang.org/ で確かめてください。

### 1.2 手を動かす: 初めての TypeScript

`~/dev/part07/ch35-ts-basics/hello.ts` を作ります（エディタで新しいファイルを作り、`hello.ts` という名前で保存します）。

```ts
const greeting: string = 'こんにちは';
const count: number = 3;

console.log(greeting.repeat(count));
```

```sh
$ node hello.ts
こんにちはこんにちはこんにちは
$ npx tsc
$
```

- `node hello.ts`: Node.js 24 は、`.ts` のファイルを、**型の部分を消してから**（空白に置き換えてから）そのまま動かします。これを**型の除去**（type stripping）と言います。
- `npx tsc`: このフォルダの [tsconfig.json](tsconfig.json)（8節）の設定で、このフォルダの直下の `.ts` を全部確かめます。何も出なければ、型のエラーはありません。

次に、`count` の行を、わざと間違えます。

```ts
const count: number = '3';
```

```sh
$ node hello.ts
こんにちはこんにちはこんにちは
$ npx tsc
hello.ts:2:7 - error TS2322: Type 'string' is not assignable to type 'number'.

2 const count: number = '3';
        ~~~~~


Found 1 error in hello.ts:2
```

`node` は、型が合わなくても、何も言わずに動かしました（`'こんにちは'.repeat('3')` は、たまたま `'3'` を 3 と読んでくれます）。**`node` は型を確かめません。確かめるのは `tsc` です**。この章では、次の2つを使い分けます。

| コマンド | すること | 型のエラーがあると |
| --- | --- | --- |
| `node ファイル.ts` | 型を消して動かす | 気にせず動かす |
| `npx tsc` | 型を確かめる（動かさない） | エラーを出し、終了ステータス 2 で終わる |

エラーの読み方:

| 部分 | 意味 |
| --- | --- |
| `hello.ts:2:7` | `hello.ts` の 2 行目の 7 文字目 |
| `TS2322` | エラーの番号。同じ種類のエラーは同じ番号になる。番号で検索すると説明が見つかる |
| `Type 'string' is not assignable to type 'number'.` | 「string の型の値は、number の型の所に入れられ（assign でき）ない」 |
| `~~~~~` | どこが悪いかの印 |

確かめたら、`'3'` を `3` に戻してください。

> **エディタ**: VS Code（第1部 第4章）で `~/dev/part07` を開くと、`tsc` と同じエラーが、打っている間に赤い波線で出ます。変数にマウスを乗せると、その型が見えます。この章では `npx tsc` の出力で説明しますが、ふだんはエディタで見るほうが早いです。

## 2. 基本の型と推論

### 2.1 手を動かす: 型を書かなくても型は決まる

`first-types.ts` を作ります。

```ts
const title = '牛乳を買う'; // string
let done = false; // boolean
const tags = ['買い物', '急ぎ']; // string[]（string の配列）
const scores: number[] = []; // 空の配列は、中身の型が分からないので書く
const task = { id: 1, title, done }; // { id: number; title: string; done: boolean }

done = true; // boolean に boolean を入れるのは OK
tags.push('家');
scores.push(80);

console.log(title, done, tags, scores, task);
console.log(typeof title, typeof done, Array.isArray(tags));
```

```sh
$ node first-types.ts
牛乳を買う true [ '買い物', '急ぎ', '家' ] [ 80 ] { id: 1, title: '牛乳を買う', done: false }
string boolean true
$ npx tsc
$
```

`title` や `tags` には型を書いていませんが、tsc は**最初に入れた値から型を決めます**。これを**型推論**（type inference）と言います。

| 書いたもの | 推論された型 | 読み方 |
| --- | --- | --- |
| `let done = false` | `boolean` | true か false |
| `const tags = ['買い物', '急ぎ']` | `string[]` | 文字列の配列 |
| `const scores: number[] = []` | （書いたとおり）`number[]` | 空の配列は中身が分からないので、型を書く |
| `const task = { id: 1, title, done }` | `{ id: number; title: string; done: boolean }` | この3つの項目を持つオブジェクト |

基本の型は、`typeof` の答えとほぼ同じ名前です。

| 型 | 値の例 |
| --- | --- |
| `string` | `'牛乳を買う'`、`` `#${id}` `` |
| `number` | `1`、`0.5`、`NaN` |
| `boolean` | `true`、`false` |
| `undefined`・`null` | `undefined`、`null`（5節） |
| `型[]` | `string[]` は文字列の配列、`number[]` は数の配列 |

### 2.2 手を動かす: 推論された型と違う値を入れる

`first-types.ts` の最後に、次の3行を足して、`npx tsc` を動かします。

```ts
done = 'yes';
tags.push(3);
task.priority = 1;
```

```sh
$ npx tsc
first-types.ts:13:1 - error TS2322: Type 'string' is not assignable to type 'boolean'.
first-types.ts:14:11 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
first-types.ts:15:6 - error TS2339: Property 'priority' does not exist on type '{ id: number; title: string; done: boolean; }'.
```

（ここからは、エラーの出力のうち、1行目だけを載せます。）

- 型を書かなくても、推論された型と違う使い方をすると、エラーになります。
- `TS2339`: オブジェクトに無い項目は、後から足せません。項目を足したいなら、最初から型に書いておきます（4節）。

確かめたら、足した3行を消してください。**どこに型を書くか**の目安は、次のとおりです。

| 場所 | 型を書くか |
| --- | --- |
| 関数の引数 | **必ず書く**（推論できないため。3節） |
| 関数の戻り値 | 書くとよい（中身の間違いに早く気づける） |
| 変数 | ふつうは書かない（推論に任せる）。空の配列や、後で別の型の値も入れる変数には書く |

## 3. 関数の型

### 3.1 手を動かす: 引数と戻り値

`functions.ts` を作ります。

```ts
function add(a: number, b: number): number {
  return a + b;
}

// ? を付けた引数は、渡さなくてよい（渡さないと undefined）
function greet(name: string, polite?: boolean): string {
  return polite ? `${name} さん、こんにちは` : `やあ、${name}`;
}

// 決まりの値を書いた引数も、渡さなくてよい。型は値から推論される（times: number）
function repeatText(text: string, times = 2): string {
  return text.repeat(times);
}

// アロー関数も同じように書く
const double = (n: number): number => n * 2;

// 何も返さない関数の戻り値は void
function log(message: string): void {
  console.log(`[log] ${message}`);
}

// 関数を受け取る引数の型は「(引数) => 戻り値」と書く
function applyTwice(n: number, fn: (x: number) => number): number {
  return fn(fn(n));
}

log(String(add(1, 2)));
log(greet('alice'));
log(greet('bob', true));
log(repeatText('ね'));
log(String(applyTwice(3, double)));
// map に渡したアロー関数の n は、配列の型から number と推論される（書かなくてよい）
log(String([1, 2, 3].map((n) => n * 10)));
```

```sh
$ node functions.ts
[log] 3
[log] やあ、alice
[log] bob さん、こんにちは
[log] ねね
[log] 12
[log] 10,20,30
```

| 書き方 | 意味 |
| --- | --- |
| `function add(a: number, b: number): number` | 引数 a と b は数。戻り値（`)` の後ろの `: number`）も数 |
| `polite?: boolean` | 渡さなくてもよい引数。渡さないと `undefined` なので、関数の中での型は `boolean \| undefined` |
| `times = 2` | 決まりの値。型は値から `number` と推論される。渡さなくてもよい |
| `(n: number): number => n * 2` | アロー関数も同じ所に型を書く |
| `: void` | 何も返さない |
| `fn: (x: number) => number` | 「数を1つ受け取って、数を返す関数」という型 |
| `[1, 2, 3].map((n) => n * 10)` | map に渡すアロー関数の `n` は、配列の型から `number` と推論されるので、書かなくてよい |

### 3.2 手を動かす: 引数の型を書き忘れる・間違えて呼ぶ

`functions.ts` の最後に足して、`npx tsc` を動かします。

```ts
function bad(a) {
  return a;
}
greet();
greet('carol', 'yes');
```

```sh
$ npx tsc
functions.ts:35:14 - error TS7006: Parameter 'a' implicitly has an 'any' type.
functions.ts:38:1 - error TS2554: Expected 1-2 arguments, but got 0.
functions.ts:39:16 - error TS2345: Argument of type '"yes"' is not assignable to parameter of type 'boolean | undefined'.
```

- `TS7006`: 引数に型が無いと、tsc は「何でもよい」（`any`。6節）とみなしてしまうので、エラーにします（8節の `strict` の設定）。
- `TS2554`: 引数の数が合わない。JavaScript では、足りない引数は黙って `undefined` になりました。
- `'"yes"'` は「`'yes'` という文字列そのもの」の型です（7節）。

確かめたら、足した行を消してください。

## 4. オブジェクトの形に名前を付ける

### 4.1 手を動かす: type と interface

同じ形のオブジェクトを何度も書くときは、形に名前を付けます。`task-type.ts` を作ります。

```ts
type Task = {
  readonly id: number; // readonly: 作った後で書き換えられない
  title: string;
  done: boolean;
  dueDate?: string; // ?: 無くてもよい項目（あれば string）
};

// interface でも、ほぼ同じことが書ける
interface User {
  name: string;
  email: string;
}

const t1: Task = { id: 1, title: '牛乳を買う', done: false };
const t2: Task = { id: 2, title: '本を返す', done: false, dueDate: '2026-11-20' };

function describe(task: Task): string {
  // dueDate は string か undefined。?? で「無いとき」の値を決める（5節）
  return `#${task.id} ${task.title}（締め切り: ${task.dueDate ?? 'なし'}）`;
}

console.log(describe(t1));
console.log(describe(t2));

// 形が同じなら、別の場所で作ったオブジェクトでも渡せる（名前ではなく形で比べる）
const fromSomewhere = { id: 3, title: '掃除', done: true, memo: '台所' };
console.log(describe(fromSomewhere));

const owner: User = { name: 'alice', email: 'alice@example.com' };
console.log(owner.name);
```

```sh
$ node task-type.ts
#1 牛乳を買う（締め切り: なし）
#2 本を返す（締め切り: 2026-11-20）
#3 掃除（締め切り: なし）
alice
```

| 書き方 | 意味 |
| --- | --- |
| `type Task = { ... }` | `{ ... }` という形に `Task` という名前を付ける（**型エイリアス**、type alias）。名前は大文字で始めるのがふつう |
| `interface User { ... }` | ほぼ同じ。この教材では `type` を使い、ライブラリの型を広げるとき（第37章）に `interface` を使う |
| `readonly id: number` | 作った後で書き換えられない項目 |
| `dueDate?: string` | 無くてもよい項目。読むと `string \| undefined` |
| `;` で区切る | 型の中の項目は `;` で区切る（`,` でもよい） |

`describe(fromSomewhere)` が通ったことに注目してください。`fromSomewhere` は `Task` と書いていないオブジェクトで、`memo` という余分な項目もありますが、**Task に要る項目（id・title・done）がそろっていれば**、Task として渡せます。TypeScript は、型の名前ではなく**形**で比べます（**構造的型付け**、structural typing）。

### 4.2 手を動かす: 形が合わないオブジェクト

`task-type.ts` の最後に足して、`npx tsc` を動かします。

```ts
const t3: Task = { id: 3, done: false };
const t4: Task = { id: 4, title: '洗濯', done: false, memo: 'ベランダ' };
t1.id = 5;
```

```sh
$ npx tsc
task-type.ts:31:7 - error TS2741: Property 'title' is missing in type '{ id: number; done: false; }' but required in type 'Task'.
task-type.ts:32:53 - error TS2353: Object literal may only specify known properties, and 'memo' does not exist in type 'Task'.
task-type.ts:33:4 - error TS2540: Cannot assign to 'id' because it is a read-only property.
```

- `TS2741`: 要る項目（title）が足りない。
- `TS2353`: `{ ... }` をその場で書いて `Task` の変数に入れるときは、余分な項目もエラーになります。打ち間違い（`dueDate` のつもりの `duedate` など）を見つけるためです。4.1節の `fromSomewhere` のように、一度別の変数に入れたものは、余分な項目があっても通ります。
- `TS2540`: `readonly` の項目に入れようとした。

確かめたら、足した行を消してください。

## 5. 無いかもしれない値（undefined と null）

JavaScript で一番多いエラーは、`Cannot read properties of undefined` でしょう。TypeScript は、「`undefined` かもしれない値」を型で覚えておき、確かめずに使うとエラーにします。

### 5.1 手を動かす: find の結果

`null-check.ts` を作ります。

```ts
type Task = { id: number; title: string; dueDate?: string };

const tasks: Task[] = [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '本を返す', dueDate: '2026-11-20' },
];

// find は、見つからなければ undefined を返す。戻り値の型は Task | undefined
const found = tasks.find((t) => t.id === 3);
if (found === undefined) {
  console.log('id 3 はありません');
} else {
  console.log(found.title); // ここでは found は Task（undefined ではない）
}

// ?. は「undefined なら、そこで止めて undefined」。?? は「undefined か null なら、右の値」
const title = tasks.find((t) => t.id === 2)?.title ?? '（なし）';
console.log(title);

// 配列の [0] も、空なら undefined（noUncheckedIndexedAccess の設定。8節）
const first = tasks[0];
console.log(first?.title);

// 「無い」をわざと返す関数は、戻り値に | null を書く
function dueOf(task: Task): string | null {
  return task.dueDate ?? null;
}
console.log(dueOf(tasks[1]!)); // ! は「undefined ではない」と言い切る。間違っていたら実行時に壊れるので、なるべく使わない
```

```sh
$ node null-check.ts
id 3 はありません
本を返す
牛乳を買う
2026-11-20
```

| 書き方 | 意味 |
| --- | --- |
| `Task \| undefined` | Task か undefined のどちらか（`\|` は「または」。**ユニオン型**、7節） |
| `if (found === undefined) { ... } else { ... }` | `else` の中では、tsc は found を `Task` として扱う（**絞り込み**、narrowing。第36章で詳しく） |
| `a?.title` | a が undefined か null なら、`.title` を読まずに undefined |
| `x ?? '（なし）'` | x が undefined か null なら、右の値 |
| `string \| null` | 「無い」ことを、わざと null で返す関数の戻り値 |
| `tasks[1]!` | 「undefined ではない」と言い切る。tsc は信じるだけで確かめないので、なるべく使わない |

### 5.2 手を動かす: 確かめずに使う

`null-check.ts` の最後に足して、`npx tsc` を動かします。

```ts
const t9 = tasks.find((t) => t.id === 9);
console.log(t9.title);
console.log(tasks[5].title);
const due: string = tasks[0]?.dueDate;
```

```sh
$ npx tsc
null-check.ts:30:13 - error TS18048: 't9' is possibly 'undefined'.
null-check.ts:31:13 - error TS2532: Object is possibly 'undefined'.
null-check.ts:32:7 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

`node null-check.ts` で動かすと、30行目で `TypeError: Cannot read properties of undefined (reading 'title')` で止まります。tsc は、それを動かす前に教えてくれました。直し方は3つです。

| 直し方 | 例 |
| --- | --- |
| `if` で確かめる | `if (t9 !== undefined) console.log(t9.title);` |
| `?.` と `??` で、無いときの値を決める | `console.log(t9?.title ?? '（なし）');` |
| 型を変える（無いことを受け入れる） | `const due: string \| undefined = tasks[0]?.dueDate;` |

確かめたら、足した行を消してください。

> **`tasks[5]` もエラーになるのはなぜ**: 配列の `[番号]` で読むと、範囲の外なら undefined です。8節の設定 `noUncheckedIndexedAccess` を入れているので、tsc は `tasks[5]` の型を `Task | undefined` とします。この設定が無いと `Task` になり、範囲の外を読む間違いに気づけません。

## 6. any・unknown・as

### 6.1 手を動かす: 型を確かめない3つの書き方

`any-unknown.ts` を作ります。

```ts
const text = '{"id": 1, "title": "牛乳を買う"}';

// JSON.parse の戻り値は any。any は「型を確かめない」なので、何をしてもエラーにならない
const a = JSON.parse(text);
console.log(a.title.toUpperCase()); // たまたま動く
// console.log(a.titel.toUpperCase()); // tsc は何も言わないが、動かすと壊れる

// unknown は「何か分からない」。確かめるまで、何もさせてもらえない
const u: unknown = JSON.parse(text);
if (typeof u === 'object' && u !== null && 'title' in u && typeof u.title === 'string') {
  console.log(u.title.length); // 確かめた後なら使える
}

// as は「この型だと思って」と tsc に言うだけ。中身は確かめないので、うそをつける
const n = JSON.parse('"十"') as number;
console.log(n, typeof n); // number のはずが string
```

```sh
$ node any-unknown.ts
牛乳を買う
5
十 string
```

| 書き方 | 意味 | 使う場面 |
| --- | --- | --- |
| `any` | 型を確かめない。何をしてもエラーにならない | なるべく使わない。`JSON.parse` の戻り値などは、知らないうちに any になっている |
| `unknown` | 何か分からない。`typeof` などで確かめるまで、使わせてもらえない | 外から来たデータを受け取るとき（第38章） |
| `値 as 型` | 「この型だと思って」と tsc に言う。中身は確かめない | 自分のほうが tsc より詳しいと言い切れるときだけ |

`as number` と書いても、値は `'十'`（文字列）のままでした。**`as` も `any` も、tsc を黙らせるだけで、値は変わりません**。外から来たデータ（ファイル、HTTP のボディ、データベース）を正しく確かめる方法は、第38章で学びます。

`unknown` の `if` の中は、「オブジェクトで、null ではなく、title という項目があり、それが文字列」と1つずつ確かめています。長くて大変ですが、確かめた後は安心して使えます。この確かめを短く書く方法も、第36章・第38章で学びます。

## 7. リテラル型とユニオン型

### 7.1 手を動かす: 決まった文字列のどれか

タスクの状態は、`'todo'`・`'doing'`・`'done'` の3つだけです。`string` にすると、`'tod'` のような打ち間違いも入ってしまいます。`status.ts` を作ります。

```ts
type Status = 'todo' | 'doing' | 'done';

function label(status: Status): string {
  switch (status) {
    case 'todo':
      return '未着手';
    case 'doing':
      return '作業中';
    case 'done':
      return '完了';
  }
}

let s: Status = 'todo';
console.log(label(s));
s = 'done';
console.log(label(s));

// as const: 値を「書いたとおりの、変わらない値」にする
const DEFAULTS = { status: 'todo', limit: 20 } as const; // { readonly status: 'todo'; readonly limit: 20 }
console.log(label(DEFAULTS.status));
```

```sh
$ node status.ts
未着手
完了
未着手
```

| 書き方 | 意味 |
| --- | --- |
| `'todo'` を型の所に書く | 「`'todo'` という文字列だけ」の型（**リテラル型**、literal type） |
| `'todo' \| 'doing' \| 'done'` | そのどれか（**ユニオン型**、union type） |
| `switch (status)` の `case` | 3つ全部に `return` を書いたので、tsc は「この関数は必ず string を返す」と分かる |
| `{ ... } as const` | 値を「書いたとおりの、変わらない値」にする。`status` の型が `string` ではなく `'todo'` になる |

`as const` は、6節の `as` と違い、うそをつきません。型を「もっと細かくする」だけです。

### 7.2 手を動かす: 打ち間違いと、書き忘れた case

`status.ts` の最後に `label('tod');` を足し、`switch` の中の `case 'done':` と `return '完了';` の2行を消して、`npx tsc` を動かします。

```sh
$ npx tsc
status.ts:3:33 - error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
status.ts:20:7 - error TS2345: Argument of type '"tod"' is not assignable to parameter of type 'Status'.
```

- `TS2345`: `'tod'` は Status の3つのどれでもない。
- `TS2366`: `'done'` のときに何も返さないまま関数が終わってしまう。状態を1つ増やしたときに、直し忘れた `switch` を見つけられます。

確かめたら、元に戻してください。

### 7.3 絞り込みとリテラル型

`string` の値を `===` で比べると、tsc は、`if` の中でその値をリテラル型として扱います。

```ts
function parseStatus(text: string): Status | null {
  if (text === 'todo' || text === 'doing' || text === 'done') return text; // ここでは text は 'todo' | 'doing' | 'done'
  return null;
}
```

練習問題6・8で使います。

### 7.4 enum は使わない

ほかの言語の **enum**（列挙型）に似た書き方が、TypeScript にもあります（`enum Status { Todo, Doing, Done }`）。ただ、enum は「型を消すだけ」では JavaScript にならない（消した後に別のコードが要る）ので、Node.js の型の除去では動きません。

```sh
$ echo 'enum Color { Red }' > enum-try.ts
$ node enum-try.ts
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
$ npx tsc
enum-try.ts:1:6 - error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
$ rm enum-try.ts
```

- `echo '文字列' > ファイル` は、文字列を書いたファイルを作ります（第1部 第1章）。`rm` はファイルを消すコマンドです。
- この教材では、enum の代わりに、7.1節のリテラル型のユニオンを使います。tsc も、8節の `erasableSyntaxOnly` の設定で、enum をエラーにします。

## 8. ファイルを分ける・tsconfig.json

### 8.1 手を動かす: 型を export・import する

`task-model.ts` と `use-model.ts` を作ります。

```ts
export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
};

export function createTask(id: number, title: string): Task {
  return { id, title, status: 'todo' };
}
```

```ts
import { createTask, type Task } from './task-model.ts';

const tasks: Task[] = [createTask(1, '牛乳を買う'), createTask(2, '本を返す')];
tasks[1]!.status = 'doing';
for (const t of tasks) console.log(`${t.id} ${t.title} [${t.status}]`);
```

```sh
$ node use-model.ts
1 牛乳を買う [todo]
2 本を返す [doing]
```

JavaScript の ES Modules（第3部 第14章）と同じ書き方に、2つの決まりが加わります。

| 決まり | 理由 |
| --- | --- |
| 型だけのものは `type` を付けて import する（`import { createTask, type Task }`） | Node.js は型を消して動かすので、消える import と残る import を見分ける必要がある |
| 拡張子は `.ts` と書く | Node.js は、書いたとおりのファイルを探す（`./task-model` では見つからない） |

わざと間違えて、`node` と `tsc` が何と言うかを見ておきます。`use-model.ts` の1行目を、次のどちらかに変えて動かしてみてください。

```ts
import { createTask, Task } from './task-model.ts'; // type を付け忘れた
```

```sh
$ node use-model.ts
SyntaxError: The requested module './task-model.ts' does not provide an export named 'Task'
$ npx tsc
use-model.ts:1:22 - error TS1484: 'Task' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

```ts
import { createTask, type Task } from './task-model'; // 拡張子を付け忘れた
```

```sh
$ node use-model.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/alice/dev/part07/ch35-ts-basics/task-model' imported from /Users/alice/dev/part07/ch35-ts-basics/use-model.ts
$ npx tsc
use-model.ts:1:39 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './task-model.js'?
```

tsc は `./task-model.js` を勧めてきますが、この教材では `.ts` と書きます（`.js` と書くのは、tsc で JavaScript に変換してから動かすときの書き方です。第37章 1.3節）。確かめたら、元に戻してください。

### 8.2 tsconfig.json を読む

`npx tsc` は、今いるフォルダの `tsconfig.json` を読んで、何をどう確かめるかを決めます。この章のフォルダの [tsconfig.json](tsconfig.json) は、次のとおりです。

```jsonc
{
  // この章の「手を動かす」で書くファイル（このフォルダの直下の .ts）を確かめる設定
  "extends": "../tsconfig.base.json",
  "include": ["*.ts"]
}
```

- `"extends"`: 別の設定ファイルを読み込んで、その上に書き足す。第7部の共通の設定は、部のフォルダの [tsconfig.base.json](../tsconfig.base.json) にあります。
- `"include": ["*.ts"]`: このフォルダの直下の `.ts` を確かめる。`samples/`・`exercises/`・`solutions/` には、それぞれ別の `tsconfig.json` があり、`cd samples && npx tsc` のように、そのフォルダで動かします（練習問題の書きかけのファイルのエラーが、本文の `npx tsc` に混ざらないようにするためです）。
- `//` のコメント: tsconfig.json は、JSON にコメントを書いてよいことになっています。

共通の設定（`tsconfig.base.json`）の中身です。

| 設定 | この教材での値 | 意味 |
| --- | --- | --- |
| `target`・`lib` | `es2024` | どの版の JavaScript の書き方と、標準の関数（`toSorted` など）を使ってよいか。Node.js 24 で動くもの |
| `module` | `nodenext` | `import` を Node.js の ES Modules の決まりで読む（拡張子が要る、など） |
| `types` | `["node"]` | Node.js の型（`@types/node`）を使う。これで `process.argv` や `node:fs` に型が付く |
| `moduleDetection` | `force` | どのファイルも、別々のモジュールとして扱う（別のファイルの同じ名前の変数がぶつからない） |
| `strict` | `true` | 厳しい確かめをまとめて入れる。3.2節の `TS7006`（型の無い引数）や、5節の undefined の確かめは、この設定で入る。**必ず true にする** |
| `noUncheckedIndexedAccess` | `true` | `配列[番号]` の型に `\| undefined` を付ける（5.2節） |
| `noFallthroughCasesInSwitch` | `true` | `switch` の `case` で `break` か `return` を忘れたらエラー |
| `erasableSyntaxOnly` | `true` | 「消すだけで JavaScript になる」書き方だけにする（enum などをエラーに。7.4節） |
| `verbatimModuleSyntax` | `true` | 型の import に `type` を付けさせる（8.1節） |
| `allowImportingTsExtensions` | `true` | import に `.ts` と書いてよい |
| `noEmit` | `true` | tsc は確かめるだけで、`.js` のファイルを作らない |
| `skipLibCheck` | `true` | `node_modules` の中の型の定義は確かめない（速くするため） |

> **`strict` を false にすると**: 試しに、`tsconfig.base.json` の `"strict": true` を `false` にして、3.2節や5.2節の間違いを書いてみると、エラーが出なくなります。確かめたら `true` に戻してください。古いプロジェクトには strict が false のものもありますが、新しく書くなら必ず true にします。

## 9. 型を確かめる書き方（練習問題で使う）

練習問題のテストは、関数の動きに加えて、**型が要件どおりか**も確かめます。そのために、`○○.check.ts` というファイルに、次の2つの書き方を使っています。

### 9.1 手を動かす: @ts-expect-error と Expect・Equal

`samples/type-assert.ts` をこのフォルダにコピーしてから、`type-test-try.ts` を作ります。

```sh
$ cp samples/type-assert.ts .
```

```ts
import type { Equal, Expect } from './type-assert.ts';

function add(a: number, b: number): number {
  return a + b;
}

// 「この行はエラーになるはず」。エラーにならなければ、tsc がこの行をエラーにする
// @ts-expect-error 文字列は渡せない
add('1', 2);

// 「2つの型が同じはず」。違えば、tsc がこの行をエラーにする
type Checks = [
  Expect<Equal<ReturnType<typeof add>, number>>,
  Expect<Equal<Parameters<typeof add>, [a: number, b: number]>>,
];
```

```sh
$ npx tsc
$
```

| 書き方 | 意味 |
| --- | --- |
| `// @ts-expect-error 説明` | 「次の行は、型のエラーになるはず」。エラーになれば、そのエラーは出さない。**エラーにならなければ**、`TS2578: Unused '@ts-expect-error' directive.` というエラーを出す |
| `Expect<Equal<A, B>>` | 「型 A と型 B は同じはず」。違えば `TS2344: Type 'false' does not satisfy the constraint 'true'.` というエラーになる |
| `ReturnType<typeof add>` | 関数 add の戻り値の型（ここでは number） |
| `Parameters<typeof add>` | 関数 add の引数の型を並べたもの（`[a: number, b: number]`） |
| `typeof add` | 型を書く所に書くと「値 add の型」という意味になる（JavaScript の `typeof` とは別のもの） |

試しに、`add('1', 2);` を `add(1, 2);` に変えて `npx tsc` を動かすと、`TS2578` が出ます。「エラーになるはずなのにならない」は、型がゆるすぎるという間違いだからです。確かめたら元に戻してください。

`type-assert.ts` の中身（`Equal` の作り方）は、第36章の内容を使っているので、読まなくてかまいません。

> **`@ts-ignore` と `@ts-expect-error`**: `// @ts-ignore` は、次の行のエラーを黙って消すコメントです。間違いを隠すだけなので、使いません。`@ts-expect-error` は、テストで「エラーになること」を確かめるときだけ使います。

## 10. Python の型ヒントと比べる

Flask を書いたときに、Python の**型ヒント**（`def add(a: int, b: int) -> int:`）を使ったことがあるかもしれません。Python の型ヒントは、TypeScript とよく似た考え方です。

| | Python | TypeScript |
| --- | --- | --- |
| 型の書き方 | `def add(a: int, b: int) -> int:` | `function add(a: number, b: number): number` |
| 動かすとき（実行時） | Python は型ヒントを**読み飛ばす**。合わない値でも動く | Node.js は型を**消して**動かす。合わない値でも動く |
| 確かめる道具 | mypy・pyright（別に入れる） | tsc（`typescript` パッケージ） |
| 無いかもしれない | `str \| None`（`Optional[str]`） | `string \| undefined`、`string \| null` |
| 決まった文字列のどれか | `Literal['todo', 'doing', 'done']` | `'todo' \| 'doing' \| 'done'` |
| オブジェクト（辞書）の形 | `TypedDict`、`dataclass` | `type Task = { ... }` |
| 何でもよい | `Any` | `any`（と、より安全な `unknown`） |

どちらも、「動かす前に確かめる道具」と「動かす仕組み」が別になっています。Python で mypy を動かさなければ型ヒントがただのメモになるのと同じで、**TypeScript も tsc を動かさなければ、型はただのメモです**。第37章で、`npm run typecheck` のように、確かめる手順をプロジェクトに組み込みます。

## まとめ

- TypeScript は、JavaScript に型を書き足した言語。型は動かす前に `tsc` が確かめ、動かすときには消える。型を付けても、動きは変わらない。
- `node ファイル.ts` は型を消して動かすだけで、確かめない。確かめるのは `npx tsc`。
- 関数の引数には必ず型を書く。変数は推論に任せる。オブジェクトの形には `type` で名前を付ける。TypeScript は名前ではなく形で比べる。
- `T | undefined` は、確かめてから使う（`if`、`?.`、`??`）。`!` はなるべく使わない。
- `any` と `as` は tsc を黙らせるだけ。分からない値は `unknown` で受け取り、確かめてから使う。
- 決まった文字列のどれかは、リテラル型のユニオン（`'todo' | 'doing' | 'done'`）で表す。enum は使わない。
- 型の import には `type` を付け、拡張子は `.ts` と書く。`strict` は必ず true。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。テストは、関数の動きと、型（tsc のエラーが無いこと）の両方を確かめます。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- TypeScript 公式「The TypeScript Handbook」: https://www.typescriptlang.org/docs/handbook/intro.html （特に「Everyday Types」「Narrowing」）
- TypeScript 公式「TSConfig Reference」: https://www.typescriptlang.org/tsconfig/
- Node.js 公式「Modules: TypeScript」（型の除去）: https://nodejs.org/api/typescript.html
- TypeScript 公式「TypeScript for JavaScript Programmers」: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
- mypy 公式「Type hints cheat sheet」（Python との比べ）: https://mypy.readthedocs.io/en/stable/cheat_sheet_py3.html

---

前: [第6部の成果物 タスク管理 API を PostgreSQL で](../../part06-database/project-task-api/README.md) ／ 次: [第36章 型の表現力](../ch36-ts-types/README.md) ／ 部の目次: [第7部 TypeScript](../README.md)
