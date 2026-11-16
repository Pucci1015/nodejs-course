# 第35章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part07/ch35-ts-basics/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 関数に型を付ける | [basics.ts](basics.ts)、[basics.test.ts](basics.test.ts) | 3 |
| 2 | 基本 | オブジェクトの型 | [task.ts](task.ts)、[task.test.ts](task.test.ts) | 4 |
| 3 | 基本 | 型のエラーを読んでバグを直す | [fix-me.ts](fix-me.ts)、[fix-me.test.ts](fix-me.test.ts) | 1.2, 2, 5 |
| 4 | 基本 | エラーを予想する（調べる問題） | [read-errors.ts](read-errors.ts) | 1.2, 5, 6 |
| 5 | 応用 | 無いかもしれない値 | [find.ts](find.ts)、[find.test.ts](find.test.ts) | 5 |
| 6 | 応用 | リテラル型で状態を表す | [status.ts](status.ts)、[status.test.ts](status.test.ts) | 7 |
| 7 | 応用 | JavaScript のファイルを TypeScript にする | [stats.mjs](stats.mjs)、[stats.test.ts](stats.test.ts) | 3〜6 |
| 8 | 発展 | タスクのファイルを読む CLI | [report.ts](report.ts)、[report.test.ts](report.test.ts)、[tasks.txt](tasks.txt) | 1〜8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

- 問題4以外は、`○○.ts` を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。
- テストは、関数の動きに加えて、**型**も確かめます。「型: tsc のエラーが無い」というテストが、`○○.ts` と `○○.check.ts`（型の要件を書いたファイル。本文9節）を tsc で確かめます。失敗すると、tsc のエラーがテストの出力に出ます。
- 型だけを確かめたいときは、このフォルダで `npx tsc` を動かしてもかまいません。ただし、まだ書いていない問題のエラーも全部出ます。
- `typecheck.ts`（テストの中から tsc を動かす部品）と `type-assert.ts`（本文9節）は、書き換えなくてよいファイルです。

---

## 基本

### 問題1 関数に型を付ける

[basics.ts](basics.ts) の4つの関数に、引数と戻り値の型を付けて、中身を書いてください（本文3節）。今は引数に型が無いので、`npx tsc` が `TS7006` を出します。

| 関数 | 仕様 |
| --- | --- |
| `add(a, b)` | 2つの数を足して返す |
| `average(nums)` | 数の配列の平均を返す。空の配列なら `0` |
| `formatPrice(yen, withTax)` | `withTax` は渡さなくてもよい（true か false）。`1000` → `'1000円'`。`withTax` が true なら 1.1 倍して `Math.round` で四捨五入し、`'1100円（税込）'` |
| `line(char, width)` | `char`（文字列）を `width` 個つなげた文字列。`width` を渡さなければ 10 個 |

```sh
$ node --test basics.test.ts
ℹ pass 5
ℹ fail 0
```

ヒント: 渡さなくてもよい引数は `?` か決まりの値（本文3.1節）。`basics.check.ts` は、`formatPrice` の2つ目の引数の型が `withTax?: boolean`、`line` の2つ目が `width?: number`（決まりの値を書いた引数は、こう見える）であることを確かめます。

### 問題2 オブジェクトの型

[task.ts](task.ts) に、`Task` の型と、3つの関数を書いてください（本文4節）。

`Task`（`export type Task = { ... }` と書く）:

| 項目 | 型 | 説明 |
| --- | --- | --- |
| `id` | number | 作った後は書き換えられない（`readonly`） |
| `title` | string | |
| `done` | boolean | |
| `dueDate` | string | 無くてもよい（`'2026-11-20'` の形） |

| 関数 | 仕様 |
| --- | --- |
| `createTask(id, title, dueDate)` | `done: false` の Task を返す。`dueDate` は渡さなくてもよく、渡したときだけ項目を作る（`dueDate: undefined` という項目は作らない） |
| `isOverdue(task, today)` | 終わっていなくて、締め切りがあり、締め切りが `today`（`'2026-11-11'` の形の文字列）より前なら true |
| `toggle(task)` | `done` を反対にした**新しい** Task を返す。元の Task は変えない |

```sh
$ node --test task.test.ts
ℹ pass 4
ℹ fail 0
```

ヒント: `'YYYY-MM-DD'` の形の文字列は、`<` でそのまま比べると、日付の順になります。オブジェクトを写して一部だけ変えるには `{ ...task, done: … }`（第3部 第11章）。

### 問題3 型のエラーを読んでバグを直す

[fix-me.ts](fix-me.ts) には、型のエラーが5つあります。どれも、動かすと困る本当のバグです（テストの「動き」のテストも失敗しています）。`npx tsc` のエラーを読んで、5つとも直してください。

**使ってはいけない書き方**: `any`、`as`、`!`（undefined ではないと言い切る）、`@ts-` で始まるコメント。これらは、エラーを消すだけで、バグは直しません。テストが、これらを使っていないことも確かめます。

```sh
$ node --test fix-me.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント: エラーの行と、その関数の上のコメント（何をする関数か）を読み比べます。「エラーを消す」のではなく、「関数がコメントのとおりに動くように直したら、エラーも消えた」が目標です。

### 問題4 エラーを予想する（調べる問題）

[read-errors.ts](read-errors.ts) の `// 1`〜`// 6` の行について、答えてください。

1. 1〜6 のうち、`npx tsc` がエラーにするのはどの行ですか。**動かす前に予想して**、紙かメモに書いてください。
2. このファイルを章のフォルダにコピーして、確かめます（章のフォルダの `tsconfig.json` は、直下の `.ts` だけを確かめるので、ほかの問題のエラーが混ざりません）。

   ```sh
   $ cp read-errors.ts .. && cd .. && npx tsc; cd exercises
   ```

   予想と違った行について、なぜそうなったのかを、本文の節を指して説明してください。
3. エラーになった行を、それぞれ1つずつ直す方法を書いてください（`!`・`as` は使わない）。
4. `node read-errors.ts` で動かすと、どうなりますか。tsc がエラーにしなかったのに、動かすと止まる行があります。どの行で、なぜですか。
5. 確かめたら、章のフォルダにコピーした `read-errors.ts` を消してください（`rm ../read-errors.ts`）。

---

## 応用

### 問題5 無いかもしれない値

[find.ts](find.ts) の4つの関数を書いてください（本文5節）。型は書いてあります。`!` と `as` は使いません。

| 関数 | 仕様 |
| --- | --- |
| `findTask(tasks, id)` | id のタスク。無ければ `undefined` |
| `titleOf(tasks, id)` | id のタスクの題名。無ければ `'（なし）'` |
| `lastTitle(tasks)` | 最後のタスクの題名。空の配列なら `undefined` |
| `nextDue(tasks)` | 終わっていない（`done` が false の）タスクの中で、いちばん早い締め切り。締め切りのあるタスクが1つも無ければ `null` |

```sh
$ node --test find.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント: `nextDue` は、`let best: string | null = null;` から始めて、`for` で1つずつ比べます。`t.dueDate === undefined` なら `continue` で飛ばすと、その後の行では `t.dueDate` が string になります。

### 問題6 リテラル型で状態を表す

[status.ts](status.ts) に、`Status` の型と4つの関数を書いてください（本文7節）。

- `export type Status` は、`'todo'`・`'doing'`・`'done'` のどれか。

| 関数 | 引数 → 戻り値の型 | 仕様 |
| --- | --- | --- |
| `label(status)` | Status → string | `'未着手'`・`'作業中'`・`'完了'` |
| `next(status)` | Status → Status | todo → doing → done。done の次は done |
| `parseStatus(text)` | string → `Status \| null` | 前後の空白を除き（`trim()`）、小文字にしてから（`toLowerCase()`）読む。3つのどれでもなければ `null` |
| `countByStatus(tasks)` | `{ status: Status }[]` → `{ todo: number; doing: number; done: number }` | 状態ごとの数。無い状態は 0 |

```sh
$ node --test status.test.ts
ℹ pass 5
ℹ fail 0
```

ヒント: `parseStatus` は本文7.3節。`countByStatus` は、`{ todo: 0, doing: 0, done: 0 }` を作っておき、`counts[t.status] += 1` で数えられます（`t.status` は3つのどれかなので、キーとして使えることを tsc が知っています）。

### 問題7 JavaScript のファイルを TypeScript にする

[stats.mjs](stats.mjs) は、正しく動く JavaScript のファイルです。これを `stats.ts` にコピーして、型を付けてください。

```sh
$ cp stats.mjs stats.ts
$ node --test stats.test.ts
```

- `cp コピー元 コピー先` は、ファイルをコピーするコマンドです（第1部 第1章）。
- 最初は、引数の型が無いので `TS7006` がたくさん出ます。引数と戻り値に型を付けると、**別のエラー**が出てきます。JavaScript のときは見えていなかった「undefined かもしれない」「null かもしれない」です。動きを変えずに、直してください。
- `any`・`as`・`!` は使いません。
- 戻り値の型は、`stats.check.ts` に書いてあります（`summarize` は `{ count: number; min: number; max: number; mean: number } | null`。`type Summary = { … }` と名前を付けてもかまいません）。

```sh
$ node --test stats.test.ts
ℹ pass 3
ℹ fail 0
```

---

## 発展

### 問題8 タスクのファイルを読む CLI

[report.ts](report.ts) に、タスクを書いたファイル（[tasks.txt](tasks.txt)）を読んで、報告を出す CLI を書いてください。`Task` と `Status` の型は書いてあります。

**`parseLine(line)`**: 1行を読んで Task を返す。読めなければ `null`。

- 行の形は `id,題名,状態,締め切り`（`,` で区切る）。締め切りは無くても、空でもよい（そのときは `dueDate` の項目を作らない）。
- それぞれの前後の空白を除く。状態は小文字にしてから読む（問題6と同じ）。
- 次の行は `null`: 空の行、空白だけの行、`#` で始まる行（コメント）、項目が3つより少ない、id が1以上の整数でない、題名が空、状態が3つのどれでもない。

**`formatReport(tasks, today)`**: 次の形の文字列（最後に改行は付けない）。

```text
未着手 2 / 作業中 1 / 完了 1
#1 [未着手] 牛乳を買う（締め切り 2026-11-10・過ぎています）
#2 [作業中] 本を返す（締め切り 2026-11-20）
#3 [完了] 掃除（締め切り 2026-11-01）
#4 [未着手] 手紙を出す
```

- 1行目は状態ごとの数。続けて、タスクを1行に1つ、渡された順に。
- 締め切りがあれば `（締め切り 日付）`。終わっていなくて、締め切りが today より前なら `（締め切り 日付・過ぎています）`。

**CLI**（`if (import.meta.main) { … }` の中）:

```sh
$ node report.ts tasks.txt 2026-11-11
読めない行: 7行目
読めない行: 8行目
未着手 2 / 作業中 2 / 完了 1
#1 [未着手] 牛乳を買う（締め切り 2026-11-10・過ぎています）
#2 [作業中] 本を返す（締め切り 2026-11-20）
#3 [完了] 掃除
#4 [未着手] 手紙を出す
#6 [作業中] 電話をかける（締め切り 2026-11-11）
$ node report.ts tasks.txt
使い方: node report.ts ファイル 今日の日付（YYYY-MM-DD）
$ echo $?
1
```

- `process.argv[2]`・`[3]` でファイル名と今日の日付を受け取る。どちらかが無ければ、使い方を**標準エラー出力**（`console.error`）に出して、`process.exit(1)` で終わる。
- ファイルは `readFileSync(ファイル名, 'utf8')`（`node:fs`）で読み、`split('\n')` で行に分ける。
- 読めない行のうち、空の行とコメント以外は、`読めない行: N行目`（1行目から数える）を標準エラー出力に出す（上の出力では、標準エラー出力と標準出力が混ざって見えています）。
- `import.meta.main` は、このファイルを `node` で直接動かしたときだけ true になります（テストが `import` したときは false）。

```sh
$ node --test report.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント:

- `const [idText, titleText, statusText, dueText] = line.split(',');` と分けると、それぞれの型は `string | undefined` です（本文5.2節）。
- `process.argv` の要素も `string | undefined` です。`if (fileName === undefined || today === undefined) { …; process.exit(1); }` と書くと、その後の行では、tsc は2つを string として扱います（`process.exit` は戻ってこない関数だと、tsc が知っているからです）。
- `Number('x')` は `NaN`、`Number('1.5')` は `1.5` です。`Number.isInteger(n)` で整数かどうかを確かめられます。
