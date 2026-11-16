# 第36章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part07/ch36-ts-types/exercises` で実行） |
| --- | --- | --- |
| 1 | [describe.ts](describe.ts) | `MODULE=../solutions/describe.ts node --test describe.test.ts` |
| 2 | [events.ts](events.ts) | `MODULE=../solutions/events.ts node --test events.test.ts` |
| 3 | [generics.ts](generics.ts) | `MODULE=../solutions/generics.ts node --test generics.test.ts` |
| 4 | このページ | — |
| 5 | [task-types.ts](task-types.ts) | `MODULE=../solutions/task-types.ts node --test task-types.test.ts` |
| 6 | [guards.ts](guards.ts) | `MODULE=../solutions/guards.ts node --test guards.test.ts` |
| 7 | [result.ts](result.ts) | `MODULE=../solutions/result.ts node --test result.test.ts` |
| 8 | [emitter.ts](emitter.ts) | `MODULE=../solutions/emitter.ts node --test emitter.test.ts` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。`○○.check.ts`・`typecheck.ts`・`type-assert.ts` は `exercises/` と同じものです。

---

## 問題1 値の種類で絞り込む

```ts
export function describe(value: string | number | boolean | string[] | Date | null | undefined): string {
  // == null は「null か undefined」。この教材では、はっきり2つ書く
  if (value === null || value === undefined) return '（なし）';
  if (typeof value === 'string') return `文字列「${value}」（${value.length}文字）`;
  if (typeof value === 'number') return Number.isInteger(value) ? `整数 ${value}` : `小数 ${value}`;
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (Array.isArray(value)) return value.length === 0 ? '0個' : `${value.length}個: ${value.join(', ')}`;
  // 残りは Date だけ
  return `日付 ${value.toISOString().slice(0, 10)}`;
}
```

- 確かめる順番が大事です。最初に null と undefined を除くと、その後の `typeof` や `Array.isArray` で、残りの型が1つずつ減っていきます。最後の行では、value は `Date` だけになっています（エディタで value にマウスを乗せると確かめられます）。
- `typeof value === 'object'` で配列や Date を見分けようとすると、どちらも `'object'` なので見分けられません。`Array.isArray` と `instanceof` を使います。
- 最後を `if (value instanceof Date) …` と書いて、その後に何も書かないと、「最後に return が無い」（TS2366）になることがあります。残りが1つなら、確かめずに return してかまいません。

## 問題2 タスクのイベント

```ts

export type Task = { id: number; title: string; done: boolean };

export type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'renamed'; id: number; title: string }
  | { type: 'completed'; id: number }
  | { type: 'deleted'; id: number };

export function eventText(e: TaskEvent): string {
  switch (e.type) {
    case 'created':
      return `#${e.task.id} を作りました: ${e.task.title}`;
    case 'renamed':
      return `#${e.id} の題名を「${e.title}」にしました`;
    case 'completed':
      return `#${e.id} を完了にしました`;
    case 'deleted':
      return `#${e.id} を消しました`;
    default:
      return assertNever(e);
  }
}

export function applyEvent(tasks: Task[], e: TaskEvent): Task[] {
  switch (e.type) {
    case 'created':
      return [...tasks, e.task];
    case 'renamed':
      // map で新しい配列を作り、変えるタスクだけ ... で写して新しいオブジェクトにする
      return tasks.map((t) => (t.id === e.id ? { ...t, title: e.title } : t));
    case 'completed':
      return tasks.map((t) => (t.id === e.id ? { ...t, done: true } : t));
    case 'deleted':
      return tasks.filter((t) => t.id !== e.id);
    default:
      return assertNever(e);
  }
}

export function assertNever(x: never): never {
  throw new Error(`知らないイベントです: ${JSON.stringify(x)}`);
}
```

- `case 'renamed':` の中で `e.title` が使えるのは、`e.type === 'renamed'` で絞り込まれているからです。`map` に渡したアロー関数の中でも、絞り込みは続いています（e は const の引数で、変わらないため）。
- 新しい種類のイベント（例: `{ type: 'reopened'; id: number }`）を `TaskEvent` に足すと、2つの関数の `assertNever(e)` の行が両方ともエラーになり、直す所が全部分かります。
- `applyEvent` で、元の配列を `push` や `splice` で変えたり、元のタスクの `done` を書き換えたりすると、テストの「元の配列とタスクは変わらない」が失敗します。第8部の React では、状態をこのように「新しく作って返す」形で変えます。

## 問題3 ジェネリクスの関数

```ts

export function last<T>(items: T[]): T | undefined {
  return items.at(-1);
}

// K は T の項目の名前のどれか。戻り値は「T の K の項目の型」の配列
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>(); // 空の Map は、中身の型を <…> で書く
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key); // T[] | undefined
    if (group === undefined) groups.set(key, [item]);
    else group.push(item);
  }
  return groups;
}

export function indexBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T> {
  const index = new Map<T[K], T>();
  for (const item of items) index.set(item[key], item);
  return index;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError(`size は 1 以上の整数です: ${size}`);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
```

- `groupBy` の `keyOf: (item: T) => string` の T は、`items` から決まります。`groupBy(tasks, (t) => t.status)` の `t` に型を書かなくてよいのは、このためです。
- `indexBy` の戻り値を `Map<T[K], T>` にすると、`indexBy(tasks, 'id')` は `Map<number, Task>`、`indexBy(tasks, 'title')` は `Map<string, Task>` になります。
- `chunk` の `RangeError` は、型では防げない間違い（0 や 1.5 は number なので通る）を、実行時に確かめています。型と実行時の確かめは、役割が違います。

## 問題4 推論された型を予想する

1・2. 

| 変数 | 型 | なぜ |
| --- | --- | --- |
| `a` | `(string \| number)[]` | 中身の型のユニオンの配列。「1つ目が数、2つ目が文字列」という並びは覚えない |
| `b` | `readonly ["todo", "done"]` | `as const` で、書き換えられない、並びも決まった配列（**タプル**）になる |
| `c` | `{ status: string; }` | オブジェクトの項目は後から書き換えられるので、`'todo'` ではなく string に広げられる |
| `d` | `string` | `let` は後から書き換えられるので、string に広げられる |
| `e` | `"todo"` | `const` の文字列は書き換えられないので、リテラル型のまま |
| `f` | `"yes" \| null` | 条件演算子の両側のユニオン |
| `g` | `number \| undefined` | `find` は、見つからなければ undefined |
| `h` | `string[]` | `Object.keys` は、いつも `string[]` を返す（`('todo' \| 'done')[]` ではない。オブジェクトに、型に書いていない項目が入っていることもあるため） |

3. `c` の型は `{ status: string }` なので、`status` が Status の3つのどれかだとは限りません。`setStatus` は `{ status: Status }` を求めているので、渡せません（第35章 7節）。

```text
predict.ts(16,11): error TS2345: Argument of type '{ status: string; }' is not assignable to parameter of type '{ status: Status; }'.
  Types of property 'status' are incompatible.
    Type 'string' is not assignable to type 'Status'.
```

直し方（どれでも通ります）:

```ts
const c = { status: 'todo' } as const; // 1. 全体を as const（status が readonly の 'todo' に）
const c: { status: Status } = { status: 'todo' }; // 2. 変数に型を書く
const c = { status: 'todo' as const }; // 3. その項目だけ as const
const c = { status: 'todo' } satisfies { status: Status }; // 4. satisfies（本文7.1節。'todo' のまま残る）
```

`setStatus({ status: 'todo' })` のように、その場で書いて渡すときは、エラーになりません。渡す先の型（Status）を見て、tsc が `'todo'` のまま扱うからです。

## 問題5 Task から型を作る

```ts

export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

// サーバが付ける4つを除いたもの。Pick<Task, 'title' | 'status' | 'dueDate' | 'tags'> でも同じ
export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
// 変えられる4つを、どれも無くてよいものにした
export type TaskPatch = Partial<NewTask>;
export type TaskSummary = Pick<Task, 'id' | 'title' | 'status'>;
export type StatusCounts = Record<Status, number>;

export function applyPatch(task: Task, patch: TaskPatch, now: string): Task {
  const next: Task = { ...task, updatedAt: now, version: task.version + 1 };
  // undefined の項目は無視する。{ ...task, ...patch } だと、{ title: undefined } で題名が消えてしまう
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.dueDate !== undefined) next.dueDate = patch.dueDate; // null は「消す」なので入れる
  if (patch.tags !== undefined) next.tags = patch.tags;
  return next;
}

export function toSummary(task: Task): TaskSummary {
  // return task; と書いても型は通るが、ほかの項目も付いたまま返ってしまう（型は形が足りているかしか見ない）
  return { id: task.id, title: task.title, status: task.status };
}

export function countStatuses(tasks: Task[]): StatusCounts {
  const counts: StatusCounts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}
```

- `TaskPatch = Partial<NewTask>` のように、作った型からさらに作ると、`Task` に項目を足したときに `NewTask` と `TaskPatch` を両方直す必要がありません（`Omit` で作ったので、新しい項目は自動で NewTask に入ります）。入れたくない項目なら、`Omit` の除くほうに足します。
- `toSummary` で `return task;` と書いても、型は通ります。TaskSummary に要る3つの項目があるからです（第35章 4.1節「形で比べる」）。でも、返したオブジェクトには、ほかの項目も全部付いたままです。**型は「足りているか」しか見ない**ので、余分なものを外に出したくないとき（API の応答から内部の項目を除く、など）は、作り直して返します。

## 問題6 型ガード

```ts

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null; tags: string[] };

export function isStatus(value: unknown): value is Status {
  return value === 'todo' || value === 'doing' || value === 'done';
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  // 'id' in value の後では、value.id を読める（型は unknown）
  if (!('id' in value) || typeof value.id !== 'number' || !Number.isInteger(value.id) || value.id < 1) return false;
  if (!('title' in value) || typeof value.title !== 'string' || value.title === '') return false;
  if (!('status' in value) || !isStatus(value.status)) return false;
  if (!('dueDate' in value) || (value.dueDate !== null && typeof value.dueDate !== 'string')) return false;
  if (!('tags' in value) || !Array.isArray(value.tags)) return false;
  // Array.isArray の後の value.tags は any[]。中身も1つずつ確かめる
  return value.tags.every((tag: unknown) => typeof tag === 'string');
}

export function assertTask(value: unknown): asserts value is Task {
  if (!isTask(value)) throw new TypeError(`タスクの形ではありません: ${JSON.stringify(value)}`);
}

export function parseTasks(json: string): Task[] {
  const data: unknown = JSON.parse(json); // any のまま使わないよう、unknown の変数に入れる
  if (!Array.isArray(data)) throw new TypeError('配列ではありません');
  const tasks: Task[] = [];
  data.forEach((item: unknown, i) => {
    if (!isTask(item)) throw new TypeError(`${i + 1}番目の要素がタスクの形ではありません`);
    tasks.push(item);
  });
  return tasks;
}
```

- 1行ずつ、`'id' in value` で項目があることを確かめてから、`typeof` などで型を確かめています。`in` で確かめる前に `value.id` と書くと、tsc がエラーにします（value は `object` で、id という項目があるとは限らない）。
- 項目が6つになっただけで、かなり長くなりました。第38章の Zod を使うと、`TaskSchema.safeParse(value)` の1行で同じことができ、型（`Task`）もスキーマから作れます。
- `parseTasks` で `forEach` の代わりに `for (const [i, item] of data.entries())` と書いてもかまいません。

## 問題7 Result 型

```ts

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

export function parseLimit(text: string | undefined): Result<number> {
  if (text === undefined) return ok(20);
  // Number('') は 0 になってしまうので、空の文字列を先に除く
  const n = text.trim() === '' ? NaN : Number(text);
  if (!Number.isInteger(n)) return err('limit は整数です');
  if (n < 1 || n > 100) return err('limit は 1〜100 です');
  return ok(n);
}

export function parseDueDate(text: string): Result<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return err('締め切りは YYYY-MM-DD の形です');
  // Date は 2026-02-30 を 2026-03-02 に直してしまう。作った日付を文字列に戻して、同じかどうかで確かめる
  const d = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) return err(`${text} という日はありません`);
  return ok(text);
}

export function parseNewTask(input: { title?: string; dueDate?: string }): Result<{ title: string; dueDate: string | null }, string[]> {
  const errors: string[] = [];
  const title = input.title?.trim() ?? '';
  if (title === '') errors.push('題名は必須です');
  else if (title.length > 100) errors.push('題名は100文字までです');

  let dueDate: string | null = null;
  if (input.dueDate !== undefined) {
    const r = parseDueDate(input.dueDate);
    if (r.ok) dueDate = r.value;
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors) : ok({ title, dueDate });
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
```

- `ok` と `err` の戻り値の型を `Result<T, never>` などにせず、`{ ok: true; value: T }` のように片方だけにしたので、`Result<number>` にも `Result<number, string[]>` にも入れられます（片方の形を満たしていれば、ユニオンに入れられる）。
- `parseNewTask` は、間違いを見つけても途中で return せずに、配列に集めています。入力のフォームで「題名も締め切りも間違っている」ときに、1つずつ直させるより、全部まとめて見せたほうが親切だからです。第5部の API の 422 の `errors` 配列（第25章）と同じ考え方です。
- `if (r.ok) dueDate = r.value; else errors.push(r.error);` の `else` の中では、r は失敗の形に絞り込まれています。

## 問題8 型の付いたイベントエミッタ

```ts

export type Listener<P> = (payload: P) => void;

export type Emitter<Events> = {
  on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void;
  once<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void;
  emit<K extends keyof Events>(name: K, payload: Events[K]): number;
  listenerCount(name: keyof Events): number;
};

export function createEmitter<Events>(): Emitter<Events> {
  // イベントの名前ごとの「登録」の一覧。同じ関数を2回 on しても別々に消せるよう、関数ではなく登録（{ listener }）を入れる
  // { [K in keyof Events]?: … } は、Events の項目ごとに型を作る書き方（マップ型。本文5.2節）
  const registry: { [K in keyof Events]?: { listener: Listener<Events[K]> }[] } = {};

  function on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void {
    const entry = { listener };
    const list = registry[name] ?? [];
    registry[name] = [...list, entry]; // 新しい配列にする（emit の途中で変えても、emit が見ている配列は変わらない）
    return () => {
      registry[name] = (registry[name] ?? []).filter((e) => e !== entry);
    };
  }

  return {
    on,
    once(name, listener) {
      const off = on(name, (payload) => {
        off();
        listener(payload);
      });
      return off;
    },
    emit(name, payload) {
      const list = registry[name] ?? [];
      for (const { listener } of list) listener(payload);
      return list.length;
    },
    listenerCount(name) {
      return registry[name]?.length ?? 0;
    },
  };
}
```

- `Emitter<Events>` のメソッドを `on<K extends keyof Events>(…)` とジェネリクスにしたので、`em.on('created', (task) => …)` を呼ぶと K が `'created'` に決まり、listener の引数の型が `Events['created']`（Task）になります。
- `registry` の型 `{ [K in keyof Events]?: { listener: Listener<Events[K]> }[] }` は、「イベントの名前ごとに、その名前の値の型の listener の一覧」です。`registry[name]` と読むと、tsc は K に合った型だと分かるので、`as` が要りません。
- 返すオブジェクトの `once(name, listener) { … }` に型を書いていないのは、戻り値の型 `Emitter<Events>` から、引数の型が推論されるからです（アロー関数を `map` に渡すときと同じ）。
- `once` は、自分を包む関数を `on` で登録し、呼ばれたら先に `off()` してから listener を呼びます。先に off しておくと、listener の中でもう一度 emit されても、2回呼ばれません。
- Node.js の `EventEmitter` にも、型を付ける書き方があります（`new EventEmitter<{ created: [Task] }>()`。`@types/node` の型）。この問題は、その仕組みを自分で作ったものです。
