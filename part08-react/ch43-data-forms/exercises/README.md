# 第43章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch43-data-forms/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | API の間違いを項目ごとに分ける | [fieldErrors.ts](fieldErrors.ts)、[fieldErrors.test.ts](fieldErrors.test.ts) | 5.3 |
| 2 | 基本 | 読み込みの状態ごとに出し分ける | [TaskListView.tsx](TaskListView.tsx)、[TaskListView.test.tsx](TaskListView.test.tsx) | 2.2 |
| 3 | 基本 | 一覧の条件から URL を作る | [tasksPath.ts](tasksPath.ts)、[tasksPath.test.ts](tasksPath.test.ts) | 1.3 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | useEffect でタスクを1つ読む | [useTask.ts](useTask.ts)、[useTask.test.tsx](useTask.test.tsx) | 2 |
| 6 | 応用 | TanStack Query で読む・作る | [taskQueries.ts](taskQueries.ts)、[taskQueries.test.tsx](taskQueries.test.tsx) | 3・4.1 |
| 7 | 応用 | 確かめて送るフォーム | [TaskForm.tsx](TaskForm.tsx)、[TaskForm.test.tsx](TaskForm.test.tsx) | 5 |
| 8 | 発展 | 楽観的な更新と、失敗したときの巻き戻し | [useToggleDone.ts](useToggleDone.ts)、[useToggleDone.test.tsx](useToggleDone.test.tsx) | 4.2 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第42章と同じです。`○○.tsx`（または `○○.ts`）を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` と `npx eslint .` も通してください。

- テストは、本物の API を使いません。`fetch` を偽物に替えて、決めた応答を返します（本文8節）。API を動かしていなくても通ります。
- 次のファイルは、問題で使う道具です。書き換えなくてかまいません。
  - [api.ts](api.ts): `ApiError` と `request(パス, init)`（本文1.2節の `api.ts` の前半と同じ）
  - [schemas.ts](schemas.ts): `TaskSchema`・`PageSchema`・`TaskInputSchema`（本文の `schemas.ts` と同じ）
  - [test-helpers.tsx](test-helpers.tsx): テストの道具（偽物の `fetch`、テスト用の `QueryClient`）

---

## 基本

### 問題1 API の間違いを項目ごとに分ける

[fieldErrors.ts](fieldErrors.ts) の `toFieldErrors(problem)` を書いてください（本文5.3節）。API の problem+json の `errors` を、「項目の名前 → 文」のオブジェクトにします。

```ts
toFieldErrors({ errors: [{ pointer: '#/dueDate', detail: '締め切りが過ぎています' }] });
// → { dueDate: '締め切りが過ぎています' }
```

- `pointer` があれば、`#/` を除いた**最初の部分**を名前にします（`#/title` → `title`、`#/tags/0` → `tags`）。
- `pointer` が無く `parameter` があれば、それを名前にします（クエリの間違い）。
- どちらも無ければ、名前は空の文字 `''` です（フォーム全体の間違い）。
- 同じ名前が2つ以上あれば、最初の文を使います。`errors` が無ければ `{}` です。

### 問題2 読み込みの状態ごとに出し分ける

[TaskListView.tsx](TaskListView.tsx) の `TaskListView({ load, onRetry })` を書いてください（本文2.2節）。`load` は、ファイルにある `Load` 型（3つの状態のユニオン）です。

| `load.status` | 出すもの |
| --- | --- |
| `'pending'` | `<p role="status">読み込み中…</p>` |
| `'error'` | `role="alert"` の箱の中に、`読み込めませんでした: （error.message）` と「再試行」ボタン（押すと `onRetry()`） |
| `'success'` | 題名の `<ul>`。タスクが無ければ、`<ul>` のかわりに `<p>タスクはありません</p>` |

- `role="status"` は「今の様子の知らせ」の印です。スクリーンリーダーが、手が空いたときに読み上げます（第45章）。

### 問題3 一覧の条件から URL を作る

[tasksPath.ts](tasksPath.ts) の `tasksPath(options)` を書いてください（本文1.3節）。API の一覧のパスとクエリ（第25章）を作ります。

```ts
tasksPath({ statuses: ['doing'], sort: 'dueDate', limit: 100 }); // → '/tasks?status=doing&sort=dueDate&limit=100'
tasksPath();                                                      // → '/tasks'
```

- クエリは `status`・`sort`・`due_before`・`limit` の順にします。`URLSearchParams` を使うと、エスケープ（`,` → `%2C`）もしてくれます。
- API が決めている値（`statuses` が空、`sort` が `-createdAt`、`dueBefore` が `null` か空、`limit` が 20）や、指定されていないものは付けません。`?` も、クエリが1つも無ければ付けません。
- `status` は、`todo`・`doing`・`done` の順にそろえ、同じものは1つにして、カンマでつなぎます。選んだ順で URL が変わると、同じ一覧が別のキャッシュになってしまうからです。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 useEffect でタスクを1つ読む

[useTask.ts](useTask.ts) の `useTask(id)` を書いてください（本文2節）。TanStack Query を使わずに、`useEffect` で `GET /api/tasks/:id` を読むフックです。

- `id` が `null` なら `{ status: 'idle' }` を返し、fetch しません。
- 読み込み中は `{ status: 'pending' }`、読めたら `{ status: 'success', task }`（`TaskSchema` で確かめる）、失敗したら `{ status: 'error', error }` です。API の失敗は、`request` が投げる `ApiError` をそのまま `error` に入れます。
- `id` が変わったら、**すぐに** `pending` を返します（前の id のタスクを出したままにしない）。
- 前の `id` の応答が後から届いても、今の `id` の結果を消さないようにします。

ヒント: 本文2.3節の `PlainList` と同じ形で書けます。結果と一緒に「どの id の結果か」を state に覚えておき、今の id と違えば `pending` を返します。

### 問題6 TanStack Query で読む・作る

[taskQueries.ts](taskQueries.ts) の `taskKeys`・`useTasks(status)`・`useCreateTask()` を書いてください（本文3・4.1節）。

- `taskKeys.all` は `['tasks']`、`taskKeys.list(status)` は `['tasks', 'list', status]` です。
- `useTasks(status)`: キー `taskKeys.list(status)` で、`/tasks?sort=dueDate&limit=100`（`status` が `'all'` でなければ `&status=…` も）を `request` で読み、`PageSchema` で確かめた `items` を返す `useQuery` です。
- `useCreateTask()`: `mutate(input)` で、`input` を JSON にして `POST /tasks` し（`Content-Type: application/json`）、`TaskSchema` で確かめたタスクを返す `useMutation` です。成功したら、`taskKeys.all` で始まるキャッシュを古いことにして、一覧を読み直させます。

### 問題7 確かめて送るフォーム

[TaskForm.tsx](TaskForm.tsx) の `TaskForm({ onSubmit, submitLabel })` を書いてください（本文5節）。どの API に送るかは、親が `onSubmit` で決めます（追加にも、編集にも使えるように）。

- 「題名」と「締め切り」（`type="date"`）の入力欄と、`submitLabel`（決まりは「追加」）のボタンを出します。
- 送られたら、`TaskInputSchema` で確かめます。間違いがあれば、その項目の下に `<p role="alert">` で文を出し、その入力欄に `aria-invalid="true"`（ほかは `"false"`）を付けて、`onSubmit` は呼びません。
- 確かめた値で `await onSubmit(値)` を呼びます。待っている間は、ボタンを「送信中…」にして押せなくします。
  - 成功したら、入力欄を空に戻します。
  - `ApiError` の 422 なら、`errors` の `pointer` を使って、項目ごとに文を出します（入力は残す）。
  - そのほかの失敗（409 など）は、エラーの `message` を、フォーム全体の間違いとして `<p role="alert">` で出します。

### 問題8 楽観的な更新と、失敗したときの巻き戻し

[useToggleDone.ts](useToggleDone.ts) の `useToggleDone(listKey)` を書いてください（本文4.2節）。`mutate(task)` で、タスクの完了と未着手を切り替える `useMutation` です。

- `PATCH /tasks/:id` に `{ status }`（`done` なら `todo`、それ以外は `done`）を JSON で送ります。`If-Match` ヘッダに `"（task.version）"` を入れます。
- **応答を待たずに**、キャッシュ `listKey` の一覧の、そのタスクの `status` を変えます（元の配列やオブジェクトは変えない）。
- 失敗したら、キャッシュを変える前の一覧に戻します。
- 成功しても失敗しても、最後に `['tasks']` で始まるキャッシュを古いことにします。

---

この章の練習問題は、このフォルダの外の API を使いません。`npm run api` を動かしていなくても、テストは通ります。
