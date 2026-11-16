# 第36章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part07/ch36-ts-types/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 値の種類で絞り込む | [describe.ts](describe.ts)、[describe.test.ts](describe.test.ts) | 1 |
| 2 | 基本 | タスクのイベント | [events.ts](events.ts)、[events.test.ts](events.test.ts) | 2 |
| 3 | 基本 | ジェネリクスの関数 | [generics.ts](generics.ts)、[generics.test.ts](generics.test.ts) | 4 |
| 4 | 基本 | 推論された型を予想する（調べる問題） | [predict.ts](predict.ts) | 第35章 2・7節、4・7節 |
| 5 | 応用 | Task から型を作る | [task-types.ts](task-types.ts)、[task-types.test.ts](task-types.test.ts) | 5 |
| 6 | 応用 | 型ガード | [guards.ts](guards.ts)、[guards.test.ts](guards.test.ts) | 3 |
| 7 | 応用 | Result 型 | [result.ts](result.ts)、[result.test.ts](result.test.ts) | 6 |
| 8 | 発展 | 型の付いたイベントエミッタ | [emitter.ts](emitter.ts)、[emitter.test.ts](emitter.test.ts) | 4, 5 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第35章と同じです。問題4以外は、`○○.ts` を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。「型: tsc のエラーが無い」のテストは、`○○.ts` と `○○.check.ts`（型の要件。本文9節の書き方も使う）を tsc で確かめます。

この章の問題は、どれも `as` と `any` を使わずに書きます（テストが確かめます）。型を正しく書けば、要りません。

---

## 基本

### 問題1 値の種類で絞り込む

[describe.ts](describe.ts) の `describe(value)` を書いてください（本文1節）。引数の型は書いてあります。

| value | 戻り値の例 |
| --- | --- |
| `null`・`undefined` | `'（なし）'` |
| 文字列 | `'文字列「ねこ」（2文字）'` |
| 整数 | `'整数 42'` |
| 整数でない数 | `'小数 0.5'` |
| `true`・`false` | `'はい'`・`'いいえ'` |
| 配列 | `'2個: 家, 急ぎ'`（`', '` でつなぐ）。空なら `'0個'` |
| `Date` | `'日付 2026-11-11'`（`toISOString()` の最初の10文字） |

```sh
$ node --test describe.test.ts
ℹ pass 5
ℹ fail 0
```

ヒント: `if (!value) return '（なし）';` と書くと、`false`・`0`・`''` も（なし）になってしまいます（本文1.1節の表の最後の行）。

### 問題2 タスクのイベント

[events.ts](events.ts) の2つの関数を書いてください（本文2節）。`TaskEvent` の型と `assertNever` は書いてあります。

| 関数 | 仕様 |
| --- | --- |
| `eventText(e)` | created → `'#3 を作りました: 掃除'`、renamed → `'#1 の題名を「豆乳を買う」にしました'`、completed → `'#2 を完了にしました'`、deleted → `'#2 を消しました'` |
| `applyEvent(tasks, e)` | イベントを当てた**新しい**配列を返す。created は最後に足す、renamed は題名を変える、completed は done を true に、deleted は除く。無い id なら何も変えない。元の配列とタスクは変えない |

- どちらも `switch (e.type)` で書き、`default:` で `return assertNever(e);` を呼んでください（テストが確かめます）。
- 型を無視して `{ type: 'archived' }` が渡されたら、`assertNever` が投げる Error になります。

```sh
$ node --test events.test.ts
ℹ pass 5
ℹ fail 0
```

ヒント: 新しい配列は `[...tasks, e.task]`・`tasks.map(…)`・`tasks.filter(…)` で作れます。1つのタスクだけ変えるには、`map` の中で `t.id === e.id ? { ...t, title: e.title } : t`。

### 問題3 ジェネリクスの関数

[generics.ts](generics.ts) に、5つの関数を書いてください（本文4節）。**引数と戻り値の型も自分で書きます**。どんな型の配列にも使えるように、ジェネリクスにします。

| 関数 | 仕様 | 呼んだときの戻り値の型（`Task` の配列 `tasks` の場合） |
| --- | --- | --- |
| `last(items)` | 最後の要素。空なら undefined | `last(tasks)` → `Task \| undefined` |
| `pluck(items, key)` | 各要素の key の値の配列 | `pluck(tasks, 'title')` → `string[]` |
| `groupBy(items, keyOf)` | `keyOf(要素)`（文字列を返す関数）の結果ごとに分けた `Map`。キーの順は最初に出てきた順 | `groupBy(tasks, (t) => t.status)` → `Map<string, Task[]>` |
| `indexBy(items, key)` | key の値から要素を引く `Map`。同じ値があれば後のもの | `indexBy(tasks, 'id')` → `Map<number, Task>` |
| `chunk(items, size)` | size 個ずつに分けた配列の配列。size が1以上の整数でなければ `RangeError` を投げる | `chunk(['a', 'b', 'c'], 2)` → `string[][]` |

```sh
$ node --test generics.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント:

- `pluck` と `indexBy` は、本文4.1節の `pluck` と同じく `<T, K extends keyof T>`。`indexBy` の Map のキーの型は `T[K]` です。
- `Map` は、本文4.1節の最後のとおり、`new Map<string, T[]>()` と型を書いて作ります。`map.get(key)` の型は `T[] | undefined` です。
- `throw new RangeError('…')` は、範囲の外の値を受け取ったことを表すエラーです（第3部 第12章）。

### 問題4 推論された型を予想する（調べる問題）

[predict.ts](predict.ts) を読んで、答えてください。

1. 変数 a〜h の型を、**予想して**書いてください（例: `string[]`、`'todo' | null`）。
2. VS Code で `~/dev/part07` を開き、[predict.ts](predict.ts) の変数にマウスを乗せて、本当の型を確かめてください（エディタが使えなければ、`const x: number = a;` のように、わざと違う型に入れて `npx tsc` のエラーを読む方法もあります）。予想と違ったものは、なぜそうなるのかを、本文の節を指して説明してください。
3. `setStatus(c)` の行は、`npx tsc` でエラーになります（このフォルダで `npx tsc` を動かすと、ほかの問題のエラーと一緒に出ます）。なぜエラーになるのかを説明し、`c` の宣言の行を変えて直す方法を、**3つ**書いてください（`as Status` 以外で）。

---

## 応用

### 問題5 Task から型を作る

[task-types.ts](task-types.ts) に、`Task` から4つの型を作り、3つの関数を書いてください（本文5節）。

| 型（`export type`） | 中身 | 作り方 |
| --- | --- | --- |
| `NewTask` | title・status・dueDate・tags | `Omit` か `Pick` |
| `TaskPatch` | NewTask の4つが、どれも無くてよい | `Partial` |
| `TaskSummary` | id・title・status | `Pick` |
| `StatusCounts` | todo・doing・done の数 | `Record` |

| 関数 | 仕様 |
| --- | --- |
| `applyPatch(task, patch, now)` | patch の項目だけ変えた**新しい** Task。`updatedAt` を now（文字列）に、`version` を 1 増やす。patch の値が `undefined` の項目は無視する（`null` は「締め切りを消す」なので使う） |
| `toSummary(task)` | id・title・status の3つだけを持つオブジェクト |
| `countStatuses(tasks)` | 状態ごとの数 |

```sh
$ node --test task-types.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント: `{ ...task, ...patch }` と書くと、`{ title: undefined }` が渡されたときに題名が undefined になってしまいます。項目ごとに `if (patch.title !== undefined)` で確かめます。

### 問題6 型ガード

[guards.ts](guards.ts) の4つの関数を書いてください（本文3節）。型は書いてあります。

| 関数 | 仕様 |
| --- | --- |
| `isStatus(value)` | `'todo'`・`'doing'`・`'done'` のどれかなら true |
| `isTask(value)` | 次を全部満たすオブジェクトなら true（余分な項目はあってもよい）: id は1以上の整数、title は空でない文字列、status は isStatus、dueDate は文字列か null（項目は必ずある）、tags は文字列の配列 |
| `assertTask(value)` | isTask でなければ `TypeError` を投げる |
| `parseTasks(json)` | JSON の文字列を読んで `Task[]` を返す。配列でなければ `TypeError('配列ではありません')`。形の違う要素があれば `TypeError('3番目の要素がタスクの形ではありません')`（1から数える）。JSON として読めなければ、`JSON.parse` の `SyntaxError` のまま |

```sh
$ node --test guards.test.ts
ℹ pass 8
ℹ fail 0
```

ヒント:

- `JSON.parse` の戻り値は any です。`const data: unknown = JSON.parse(json);` と unknown の変数に入れると、確かめずに使うことを防げます。
- `Array.isArray(value.tags)` の後の `value.tags` は `any[]` です。`value.tags.every((tag: unknown) => typeof tag === 'string')` で中身も確かめます。

### 問題7 Result 型

[result.ts](result.ts) に、Result 型と6つの関数を書いてください（本文6節）。**`throw` は使いません**。

- `export type Result<T, E = string>`: 本文6.1節と同じ。

| 関数 | 引数 → 戻り値 | 仕様 |
| --- | --- | --- |
| `ok(value)` | T → `{ ok: true; value: T }` | |
| `err(error)` | E → `{ ok: false; error: E }` | |
| `parseLimit(text)` | `string \| undefined` → `Result<number>` | undefined なら 20。整数でない（空の文字列も）→ `'limit は整数です'`。1〜100 でない → `'limit は 1〜100 です'` |
| `parseDueDate(text)` | string → `Result<string>` | `YYYY-MM-DD` の形でなければ `'締め切りは YYYY-MM-DD の形です'`。形は合うが無い日付なら `'2026-02-30 という日はありません'` |
| `parseNewTask(input)` | `{ title?: string; dueDate?: string }` → `Result<{ title: string; dueDate: string \| null }, string[]>` | 題名は前後の空白を除く。空なら `'題名は必須です'`、101文字以上なら `'題名は100文字までです'`。dueDate があれば parseDueDate で確かめ、無ければ null。**間違いは全部集めて**、配列で返す |
| `unwrapOr(result, fallback)` | `Result<T, E>`, T → T | ok なら value、そうでなければ fallback |

```sh
$ node --test result.test.ts
ℹ pass 8
ℹ fail 0
```

ヒント:

- 形は正規表現 `/^\d{4}-\d{2}-\d{2}$/`（数字4つ・`-`・数字2つ・`-`・数字2つ。第3部 第11章）で確かめます。
- 無い日付: `new Date('2026-02-30T00:00:00Z')` は、エラーにならずに 3月2日になります。作った日付を `toISOString().slice(0, 10)` で文字列に戻し、元の文字列と同じかどうかで確かめます。
- `Number('')` は `0` です。空の文字列は先に除きます。

---

## 発展

### 問題8 型の付いたイベントエミッタ

第3部 第13章の `EventEmitter` は、イベントの名前も渡す値も、型が決まっていませんでした。[emitter.ts](emitter.ts) に、**イベントの名前と、渡す値の型を結び付けた**エミッタを書いてください。

```ts
type TaskEvents = { created: Task; deleted: { id: number } };
const em = createEmitter<TaskEvents>();
em.on('created', (task) => console.log(task.title)); // task は Task
em.emit('deleted', { id: 1 });   // OK
em.emit('deleted', { id: '1' }); // tsc のエラー
em.on('updated', () => {});      // tsc のエラー（知らない名前）
```

`Emitter<Events>` の型に、4つのメソッドの型を書き、`createEmitter` を書きます。

| メソッド | 仕様 |
| --- | --- |
| `on(name, listener)` | listener を登録し、**登録をやめる関数**を返す（やめる関数は2回呼んでもよい）。同じ関数を2回 on したら、別々の登録として数える |
| `once(name, listener)` | 1回呼ばれたら、自分で登録をやめる。on と同じく、やめる関数を返す |
| `emit(name, payload)` | その名前の listener を、登録した順に呼び、呼んだ数を返す。emit の途中で on・off されても、emit を始めたときの一覧で呼ぶ |
| `listenerCount(name)` | 登録されている数 |

```sh
$ node --test emitter.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント:

- メソッドの型は、本文4.1節の `pluck` と同じく `on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void;` の形です。
- 登録の一覧は、名前ごとに配列を持つオブジェクトにします。型は、本文5.2節のマップ型で `{ [K in keyof Events]?: … }` と書けます。
- 「同じ関数を2回 on したら別々」にするには、関数そのものではなく、`{ listener }` という小さなオブジェクトを一覧に入れ、そのオブジェクトで消します。
- 「emit の途中で変えても、始めたときの一覧で呼ぶ」は、on・off のたびに一覧を新しい配列にしておく（`[...list, entry]`、`filter`）と、emit は古い配列を最後まで読めます。
