# 第41章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch41-react-basics/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | タスク1つ分のカード | [TaskCard.tsx](TaskCard.tsx)、[TaskCard.test.tsx](TaskCard.test.tsx) | 2・3・5 |
| 2 | 基本 | 見出し付きの一覧 | [TaskTable.tsx](TaskTable.tsx)、[TaskTable.test.tsx](TaskTable.test.tsx) | 4・5 |
| 3 | 基本 | 状態で絞り込むボタン | [StatusTabs.tsx](StatusTabs.tsx)、[StatusTabs.test.tsx](StatusTabs.test.tsx) | 3・4・6 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜6 |
| 5 | 応用 | 数を増やし減らしする `Stepper` | [Stepper.tsx](Stepper.tsx)、[Stepper.test.tsx](Stepper.test.tsx) | 6.1 |
| 6 | 応用 | 題名と締め切りのフォーム | [NewTaskForm.tsx](NewTaskForm.tsx)、[NewTaskForm.test.tsx](NewTaskForm.test.tsx) | 6.2 |
| 7 | 応用 | 追加・完了・削除ができる一覧 | [TaskBoard.tsx](TaskBoard.tsx)、[TaskBoard.test.tsx](TaskBoard.test.tsx) | 6・7 |
| 8 | 発展 | 見出しで並べ替える表 | [SortableTable.tsx](SortableTable.tsx)、[SortableTable.test.tsx](SortableTable.test.tsx) | 4・6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第40章と同じです。`○○.tsx` を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` で型も確かめてください。

- テストは、本文8節の Testing Library で、ボタンの文字・ラベル・役割で要素を探します。**ボタンの文字やラベルは、問題に書いたとおりに**してください。
- 問題のファイルの関数には、戻り値の型 `ReactNode`（React が描けるもの: JSX・文字・数・`null` など）が書いてあります。書きかけの関数が `throw` だけでも、テストの `<TaskCard … />` が tsc のエラーにならないようにするためです。中身を書いたら、そのままにしておいても、消してもかまいません。
- タスクの型は [types.ts](types.ts) にあります（書き換えなくてよい）。

---

## 基本

### 問題1 タスク1つ分のカード

[TaskCard.tsx](TaskCard.tsx) の `TaskCard({ task })` を書いてください（本文2・3・5節）。

```html
<li class="task" data-status="doing">
  <span class="title">牛乳を買う</span> <span class="badge">作業中</span><small> 締め切り: 2026-11-20</small>
</li>
```

- `class` は `task`。状態が `done` なら `task done` です。`data-status` に状態を入れます（JSX では `data-status={…}` とそのまま書けます）。
- バッジの文は、`todo` → 未着手、`doing` → 作業中、`done` → 完了です。
- 締め切りが `null` なら、`<small>` を作りません。

ヒント: 状態と文の対応は、`const LABELS: Record<Status, string> = { todo: '未着手', … }` のような表にすると、状態を足したときに書き忘れを tsc が見つけます（第36章 7節）。

### 問題2 見出し付きの一覧

[TaskTable.tsx](TaskTable.tsx) の `TaskTable({ title, tasks })` を書いてください（本文4・5節）。

- `<section>` の中に、`<h2>今日（2 件）</h2>`（`title` と数）を出します。
- タスクがあれば、`<ul>` に題名の `<li>` を並べます。`key` を付けて、Console に警告が出ないようにします（テストが確かめます）。
- タスクが無ければ、`<ul>` は出さずに `<p>タスクはありません</p>` を出します。

### 問題3 状態で絞り込むボタン

[StatusTabs.tsx](StatusTabs.tsx) の `StatusTabs({ value, onChange })` を書いてください（本文3・4・6節）。

- 「すべて」「未着手」「作業中」「完了」の4つのボタンを、この順に並べます。値は `'all'`・`'todo'`・`'doing'`・`'done'` です。
- 押されたら、`onChange(そのボタンの値)` を呼びます。どれが選ばれているかの state は、`StatusTabs` では持ちません（親が `value` で渡す）。
- 選ばれている（`value` と同じ）ボタンには `aria-pressed="true"`、ほかには `"false"` を付けます（JSX では `aria-pressed={真偽値}`）。押されているかを、目の見えない人にも伝えるための属性です（第45章）。
- ボタンは `type="button"` にします（フォームの中に置かれても、フォームを送らないように）。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 数を増やし減らしする `Stepper`

[Stepper.tsx](Stepper.tsx) の `Stepper({ min, max, initial, label })` を書いてください（本文6.1節）。

```html
<button aria-label="人数を減らす">−</button><output aria-label="人数">3</output><button aria-label="人数を増やす">+</button>
```

- 最初の数は `initial`（無ければ `min`）です。`−` で1減り、`+` で1増えます。
- 数が `min` なら `−` を、`max` なら `+` を押せないようにします（`disabled`）。
- ボタンの名前（`aria-label`）は「（label）を減らす」「（label）を増やす」、数を出す `<output>` の名前は `label` です。`−` や `+` の記号だけでは、何のボタンか伝わらないためです。

### 問題6 題名と締め切りのフォーム

[NewTaskForm.tsx](NewTaskForm.tsx) の `NewTaskForm({ onAdd })` を書いてください（本文6.2節）。

- 「題名」と「締め切り」（`type="date"`）の2つの入力欄を、`<label>題名<input … /></label>` の形で作ります（ラベルの文字が、入力欄の名前になります）。どちらも制御されたコンポーネントにします。
- 「追加」のボタンか Enter で送られたら、題名の前後の空白を取って確かめます。
  - 空なら、`<p role="alert">題名を入れてください</p>` を出して、`onAdd` は呼びません。101 文字以上なら「題名は 100 文字までです」です。
  - よければ、`onAdd({ title, dueDate })` を呼び（締め切りが空なら `null`）、2つの入力欄と間違いの文を空にします。
- `role="alert"` は、「大事な知らせ」の印です。スクリーンリーダーが、すぐに読み上げます。

### 問題7 追加・完了・削除ができる一覧

[TaskBoard.tsx](TaskBoard.tsx) の `TaskBoard({ initialTasks })` を書いてください（本文6・7節）。タスクの配列は、`TaskBoard` の state に持ちます（最初は `initialTasks`）。

- `<p>残り 2 件</p>`（`done` 以外の数）を出します。
- 名前が「新しいタスク」の入力欄（`aria-label="新しいタスク"`）と「追加」のボタンのフォーム。送ると、前後の空白を取った題名のタスク（状態 `todo`、締め切り `null`、id は今の一番大きい id + 1）を後ろに足し、入力欄を空にします。空白だけなら足しません。
- 一覧の `<li>` には、`<label><input type="checkbox" />題名</label>` と、「（題名）を削除」という名前の「削除」ボタンを置きます。チェックで `done` と `todo` が切り替わり、削除ボタンで消えます。
- `initialTasks` の配列やタスクのオブジェクトは、書き換えません（テストが確かめます）。

ヒント: 本文の `App.tsx` の `addTask`・`toggleTask` と同じ形で書けます。削除は `filter` です。

---

## 発展

### 問題8 見出しで並べ替える表

[SortableTable.tsx](SortableTable.tsx) の `sortTasks(tasks, sort)` と `SortableTable({ tasks })` を書いてください（本文4・6節）。

- `sortTasks`: `sort.key`（`'title'` か `'dueDate'`）の値で並べた**新しい配列**を返します。`sort.dir` が `'asc'` なら小さい順、`'desc'` なら大きい順です。値が同じなら id の小さい順にします。締め切りが `null` のものは、どちらの順でも最後にします。元の配列は変えません。
- `SortableTable`: `<table>` の `<thead>` に「題名」「締め切り」の2つの見出し（`<th>` の中の `<button>`）、`<tbody>` に1タスク1行（題名・締め切り。`null` なら `—`）を出します。
  - 最初は題名の小さい順です。
  - 見出しを押すと、その列の小さい順に。並べている列の見出しをもう1回押すと、大きい順に。また押すと小さい順に戻ります。
  - 並べている列のボタンの文字の後ろに ` ▲`（小さい順）か ` ▼`（大きい順）を付けます（`締め切り ▲`）。
  - 並べている列の `<th>` には `aria-sort="ascending"` か `"descending"`、ほかの列には `"none"` を付けます。

ヒント: 並べ方（どの列で、どちらの順か）だけを state に持ち、並べた配列は、描くたびに `sortTasks(tasks, sort)` で計算します（本文7節の「計算できるものは state にしない」）。元の配列を変えずに並べるには、`toSorted`（ES2023）を使います。
