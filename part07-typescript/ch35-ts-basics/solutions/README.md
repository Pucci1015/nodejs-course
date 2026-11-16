# 第35章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part07/ch35-ts-basics/exercises` で実行） |
| --- | --- | --- |
| 1 | [basics.ts](basics.ts) | `MODULE=../solutions/basics.ts node --test basics.test.ts` |
| 2 | [task.ts](task.ts) | `MODULE=../solutions/task.ts node --test task.test.ts` |
| 3 | [fix-me.ts](fix-me.ts) | `MODULE=../solutions/fix-me.ts node --test fix-me.test.ts` |
| 4 | このページ | — |
| 5 | [find.ts](find.ts) | `MODULE=../solutions/find.ts node --test find.test.ts` |
| 6 | [status.ts](status.ts) | `MODULE=../solutions/status.ts node --test status.test.ts` |
| 7 | [stats.ts](stats.ts) | `MODULE=../solutions/stats.ts node --test stats.test.ts` |
| 8 | [report.ts](report.ts) | `MODULE=../solutions/report.ts node --test report.test.ts` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。型の確かめも、模範解答のフォルダの `○○.check.ts`（`exercises/` と同じもの）で行います。`typecheck.ts`・`type-assert.ts`・`tasks.txt` も `exercises/` と同じものです。

---

## 問題1 関数に型を付ける

```ts
export function add(a: number, b: number): number {
  return a + b;
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0; // 0 で割ると NaN になるので、先に返す
  let sum = 0;
  for (const n of nums) sum += n;
  return sum / nums.length;
}

export function formatPrice(yen: number, withTax?: boolean): string {
  return withTax ? `${Math.round(yen * 1.1)}円（税込）` : `${yen}円`;
}

export function line(char: string, width = 10): string {
  return char.repeat(width);
}
```

- `withTax?: boolean` の引数は、関数の中では `boolean | undefined` です。`withTax ? … : …` は、undefined も false と同じように扱うので、渡さなかったときは税込みになりません。
- `width = 10` のように決まりの値を書くと、型（number）は推論され、外から見ると `width?: number`（渡さなくてよい）になります。
- `average` で空の配列を先に返さないと、`0 / 0` で `NaN` になります。型は number のままなので、tsc はこれを見つけられません。**型が合っていても、値が正しいとは限らない**ので、テストも要ります。

## 問題2 オブジェクトの型

```ts
export type Task = {
  readonly id: number;
  title: string;
  done: boolean;
  dueDate?: string;
};

export function createTask(id: number, title: string, dueDate?: string): Task {
  const task: Task = { id, title, done: false };
  // dueDate: undefined という項目を作らないため、渡されたときだけ足す
  if (dueDate !== undefined) task.dueDate = dueDate;
  return task;
}

export function isOverdue(task: Task, today: string): boolean {
  if (task.done || task.dueDate === undefined) return false;
  // 'YYYY-MM-DD' の文字列は、そのまま < で比べると日付の順になる
  return task.dueDate < today;
}

export function toggle(task: Task): Task {
  // ... で写してから done だけ変える。元のオブジェクトは変えない
  return { ...task, done: !task.done };
}
```

- `const task: Task = { id, title, done: false };` の後で `task.dueDate = dueDate` と足せるのは、`dueDate` が型に書いてある（`?` で無くてもよい）項目だからです。型に無い項目は、後から足せません（本文2.2節の `TS2339`）。
- `{ id, title, done: false, dueDate }` と書くと、渡さなかったときに `dueDate: undefined` という項目ができてしまいます（`Object.hasOwn` で調べると true）。JSON にしたときは消えますが、`deepEqual` などで比べると違いが出ます。
- `readonly id` は、`toggle` の `{ ...task, done: !task.done }` には関係ありません。新しいオブジェクトを作っているので、元の id を書き換えていないからです。

## 問題3 型のエラーを読んでバグを直す

```ts

export type Item = { name: string; price: number; qty: number };

/** 品物の合計の金額 */
export function total(items: Item[]): number {
  let sum = 0; // 修正: '0'（文字列）だと += が文字列をつなげてしまう。数の 0 から始める
  for (const it of items) sum += it.price * it.qty;
  return sum;
}

/** いちばん安い品物の名前。品物が無ければ '（なし）' */
export function cheapest(items: Item[]): string {
  const sorted = items.toSorted((a, b) => a.price - b.price);
  return sorted[0]?.name ?? '（なし）'; // 修正: 空の配列なら sorted[0] は undefined
}

/** 名前で品物を探す。無ければ undefined */
export function findItem(items: Item[], name: string): Item | undefined {
  // 修正: 戻り値に | undefined を足し、nmae を name に
  return items.find((it) => it.name === name);
}

/** レシートの文字列 */
export function receipt(items: Item[]): string {
  const lines = items.map((it) => `${it.name} x${it.qty}`);
  lines.push(`合計 ${total(items)}円`);
  return lines.join('\n');
}

/** 割り引いた値段（四捨五入） */
export function discount(price: number, rate: number): number {
  return Math.round(price * (1 - rate));
}

export const SALE_PRICE = discount(1000, 0.1); // 修正: '1000'（文字列）ではなく数を渡す
```

| エラー | 本当のバグ | 直し方 |
| --- | --- | --- |
| `TS2322: Type 'string' is not assignable to type 'number'.`（total） | `sum` が文字列なので、`+=` が数を文字列としてつなげ、`'036098420'` のような値を返していた | `let sum = 0;` |
| `TS2532: Object is possibly 'undefined'.`（cheapest） | 空の配列で `sorted[0].name` を読むと、`TypeError` で止まる | `sorted[0]?.name ?? '（なし）'` |
| `TS2322: Type 'Item \| undefined' is not assignable to type 'Item'.` | 見つからないときに undefined を返すのに、戻り値の型が Item だった。呼んだ側が確かめずに使ってしまう | 戻り値の型を `Item \| undefined` に（コメントに「無ければ undefined」とある） |
| `TS2339: Property 'nmae' does not exist on type 'Item'.` | 打ち間違い。いつも `undefined === name` で false になり、何も見つからなかった | `it.name` |
| `TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.` | `'1000' * 0.9` は JavaScript がたまたま数にしてくれるが、`'1000' + …` のような計算だと壊れる | `discount(1000, 0.1)` |

`findItem` の戻り値の型を `any` にしたり、`return items.find(…) as Item` にしたりしても、エラーは消えます。でも、それは「見つからないことがある」という事実を隠すだけで、呼んだ側で `undefined` のまま使ってしまうバグが残ります。**エラーは、型を事実に合わせて直します**。

## 問題4 エラーを予想する

1・2. tsc がエラーにするのは 1・3・5 の3行です。

```text
read-errors.ts(5,11): error TS2532: Object is possibly 'undefined'.
read-errors.ts(7,28): error TS18048: 'u.age' is possibly 'undefined'.
read-errors.ts(10,1): error TS2322: Type 'number' is not assignable to type 'string'.
```

| 行 | エラー | なぜ |
| --- | --- | --- |
| 1 `users[0].name` | TS2532 | `noUncheckedIndexedAccess` で、`users[0]` の型は `User \| undefined`（本文5.2節）。配列に2つ入っていることを、tsc は型からは知らない |
| 2 `users[1]?.age ?? 0` | なし | `?.` で undefined の場合を扱い、`??` で number にしている |
| 3 `u.age * 2` | TS18048 | `age?: number` なので `u.age` は `number \| undefined`。bob には age が無いので、動かすと `NaN` になる |
| 4 `users.map((u) => u.name)` | なし | `name` は必ずある string。結果は `string[]` |
| 5 `e = 20` | TS2322 | `let e = 'alice'` で e の型は string と推論された（本文2.2節）。後から数は入れられない（エラーの位置は、代入の行の10行目） |
| 6 `JSON.parse(…).name.toUpperCase()` | なし | `JSON.parse` の戻り値は `any`（本文6節）。any には何をしてもエラーにならない |

3. 直し方の例:

```ts
const a = users[0]?.name ?? '（なし）'; // 1
const c = users.map((u) => (u.age ?? 0) * 2); // 3（age が無い人は 0 として計算する、と決めた）
let e: string | number = 'alice'; // 5（数も入れたいなら、型を広げる。そうでないなら、別の変数にする）
```

4. `node read-errors.ts` は、型を消して動かすので、1・3・5 の行も動きます（1 は配列に入っているので読める。3 は `NaN` になる。5 は JavaScript では問題ない）。止まるのは **6** の行で、`TypeError: JSON.parse(...).name.toUpperCase is not a function` です。JSON の `name` が数（`1`）なので、文字列の関数 `toUpperCase` がありません。tsc は any を確かめないので、この行は「tsc が通っても壊れる」例です。外から来たデータを確かめる方法は、第38章で学びます。

## 問題5 無いかもしれない値

```ts

export type Task = { id: number; title: string; done: boolean; dueDate?: string };

export function findTask(tasks: Task[], id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function titleOf(tasks: Task[], id: number): string {
  // ?. で「見つからなければ undefined」、?? で「undefined なら （なし）」
  return findTask(tasks, id)?.title ?? '（なし）';
}

export function lastTitle(tasks: Task[]): string | undefined {
  // tasks[tasks.length - 1] の型は Task | undefined（noUncheckedIndexedAccess）。at(-1) も同じ
  return tasks.at(-1)?.title;
}

export function nextDue(tasks: Task[]): string | null {
  let best: string | null = null;
  for (const t of tasks) {
    if (t.done || t.dueDate === undefined) continue;
    // ここでは t.dueDate は string（undefined は上で除いた）
    if (best === null || t.dueDate < best) best = t.dueDate;
  }
  return best;
}
```

- `tasks.at(-1)` は「後ろから1つ目」で、型は `Task | undefined` です。`tasks[tasks.length - 1]` と書いても同じです（`noUncheckedIndexedAccess` で `| undefined` が付く）。
- `nextDue` の `continue` の後では、tsc は `t.dueDate` を string として扱います（本文5.1節の絞り込み）。`best === null || t.dueDate < best` も、`||` の右側では `best` が string だと分かっています。
- 「無い」を `undefined` で返すか `null` で返すかは、関数ごとに決めて、型に書きます。この教材では、「探して見つからない」は undefined（`find` に合わせる）、「計算した結果が無い」は null としています。

## 問題6 リテラル型で状態を表す

```ts
export type Status = 'todo' | 'doing' | 'done';

export function label(status: Status): string {
  switch (status) {
    case 'todo':
      return '未着手';
    case 'doing':
      return '作業中';
    case 'done':
      return '完了';
  }
}

export function next(status: Status): Status {
  if (status === 'todo') return 'doing';
  return 'done'; // doing の次も、done の次も done
}

export function parseStatus(text: string): Status | null {
  const s = text.trim().toLowerCase();
  // s は string。=== で比べた後の return では、tsc は s をリテラル型として扱う（7節）
  if (s === 'todo' || s === 'doing' || s === 'done') return s;
  return null;
}

export function countByStatus(tasks: { status: Status }[]): { todo: number; doing: number; done: number } {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1; // t.status は 3つのどれかなので、counts のキーとして使える
  return counts;
}
```

- `parseStatus` の `if` の中で `return s` できるのは、`s === 'todo' || …` で比べた後、tsc が `s` を `'todo' | 'doing' | 'done'` に絞り込んでいるからです（本文7.3節）。`return s as Status` と書く必要はありません。
- `countByStatus` の引数の型を `{ status: Status }[]` にしたので、`id` や `title` があるタスクの配列も渡せます（本文4.1節の「形で比べる」）。
- 別解: `next` を `switch` で書いてもかまいません。状態が増えたときに直し忘れを tsc に見つけてもらいたいなら、`switch` で3つとも書くほうが安全です（第36章 2節で、もっと確かな書き方を学びます）。

## 問題7 JavaScript のファイルを TypeScript にする

```ts

export type Summary = { count: number; min: number; max: number; mean: number };

export function sum(nums: number[]): number {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

export function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return sum(nums) / nums.length;
}

export function median(nums: number[]): number | null {
  const sorted = nums.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // 修正: sorted[mid] の型は number | undefined。空の配列のとき undefined になるのを、ここでまとめて確かめる
  const upper = sorted[mid];
  if (upper === undefined) return null;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1];
  if (lower === undefined) return null; // 長さが偶数（2以上）なら来ないが、tsc にはそれが分からない
  return (lower + upper) / 2;
}

export function summarize(nums: number[]): Summary | null {
  if (nums.length === 0) return null;
  // 修正: mean(nums) は number | null を返すので、Summary の mean（number）に入れられない。ここで直接計算する
  return { count: nums.length, min: Math.min(...nums), max: Math.max(...nums), mean: sum(nums) / nums.length };
}

export function formatSummary(summary: Summary | null): string {
  if (summary === null) return 'データがありません';
  return `${summary.count}件 最小 ${summary.min} 最大 ${summary.max} 平均 ${summary.mean.toFixed(1)}`;
}
```

引数と戻り値に型を付けた直後には、次のエラーが出ます（`type Summary` を4行目に足した場合）。

```text
stats.ts(20,32): error TS2322: Type 'number | undefined' is not assignable to type 'number | null'.
stats.ts(21,11): error TS2532: Object is possibly 'undefined'.
stats.ts(21,29): error TS2532: Object is possibly 'undefined'.
stats.ts(26,80): error TS2322: Type 'number | null' is not assignable to type 'number'.
```

（行の番号は、型の付け方によって少し違います。）

- `sorted[mid]` は `number | undefined` です。長さを先に確かめていても、tsc は「長さと `[番号]` の関係」までは分かりません。そこで、取り出した値そのものを `undefined` と比べます。これがいちばん素直な直し方です。
- `summarize` の `mean: mean(nums)` は、`mean` が `number | null` を返すので、`mean: number` の項目に入れられません。JavaScript の版でも、空の配列は先に null を返しているので実際には null になりませんが、tsc にはそれが分かりません。模範解答は、その場で計算し直しました。`mean(nums) ?? 0` と書く方法もあります。

## 問題8 タスクのファイルを読む CLI

```ts
import { readFileSync } from 'node:fs';

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate?: string };

const LABELS = { todo: '未着手', doing: '作業中', done: '完了' } as const;

function toStatus(text: string): Status | null {
  const s = text.trim().toLowerCase();
  if (s === 'todo' || s === 'doing' || s === 'done') return s;
  return null;
}

export function parseLine(line: string): Task | null {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  // 分けた結果は string[]。[0] などの型は string | undefined（noUncheckedIndexedAccess）
  const [idText, titleText, statusText, dueText] = trimmed.split(',');
  if (idText === undefined || titleText === undefined || statusText === undefined) return null;
  const id = Number(idText.trim());
  if (!Number.isInteger(id) || id < 1) return null; // Number('x') は NaN。NaN も 1.5 もここで落とす
  const title = titleText.trim();
  if (title === '') return null;
  const status = toStatus(statusText);
  if (status === null) return null;
  const task: Task = { id, title, status };
  const due = dueText?.trim() ?? ''; // 4つ目が無ければ undefined
  if (due !== '') task.dueDate = due;
  return task;
}

function formatTask(t: Task, today: string): string {
  const head = `#${t.id} [${LABELS[t.status]}] ${t.title}`;
  if (t.dueDate === undefined) return head;
  const overdue = t.status !== 'done' && t.dueDate < today;
  return `${head}（締め切り ${t.dueDate}${overdue ? '・過ぎています' : ''}）`;
}

export function formatReport(tasks: Task[], today: string): string {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  const lines = [`未着手 ${counts.todo} / 作業中 ${counts.doing} / 完了 ${counts.done}`];
  for (const t of tasks) lines.push(formatTask(t, today));
  return lines.join('\n');
}

if (import.meta.main) {
  // process.argv[2] の型は string | undefined。足りなければ使い方を出して終わる
  const [, , fileName, today] = process.argv;
  if (fileName === undefined || today === undefined) {
    console.error('使い方: node report.ts ファイル 今日の日付（YYYY-MM-DD）');
    process.exit(1);
  }
  const tasks: Task[] = [];
  const lines = readFileSync(fileName, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const task = parseLine(line);
    if (task !== null) tasks.push(task);
    // 空の行とコメントは黙って飛ばし、それ以外の読めない行だけ知らせる
    else if (line.trim() !== '' && !line.trim().startsWith('#')) console.error(`読めない行: ${i + 1}行目`);
  });
  console.log(formatReport(tasks, today));
}
```

- `LABELS[t.status]` が通るのは、`LABELS` のキーが `todo`・`doing`・`done` で、`t.status` がそのどれかだからです。`as const` を付けたので、値の型も `'未着手'` などになります。
- `process.exit(1)` の後で `fileName` が string になるのは、`process.exit` の戻り値の型が `never`（「戻ってこない」。第36章 2節）だからです。
- `lines.forEach((line, i) => …)` の `i` は 0 から数えるので、`i + 1` 行目と出します。
- 空の行とコメントを `parseLine` の中で null にし、外でもう一度「空かコメントか」を調べています。`parseLine` が「なぜ読めなかったか」を返せば1回で済みます。第36章 6節の **Result 型**で、そう書く方法を学びます。
