# 第58章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part11/ch58-frontend-testing/exercises/` で行います。最初に `cd exercises` で移動してください。問題7は Playwright のブラウザ（本文8.1節の `npx playwright install chromium`）を使います。

| 問題 | 種類 | 書くもの | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | テスト | 期限つきのタスクの行 | [TaskCard.tsx](TaskCard.tsx)、[TaskCard.test.tsx](TaskCard.test.tsx) | 2・3 |
| 2 | 基本 | テスト | 題名を直すフォーム（user-event） | [EditTitleForm.tsx](EditTitleForm.tsx)、[EditTitleForm.test.tsx](EditTitleForm.test.tsx) | 3・4 |
| 3 | 基本 | コード | テストが探せる部品を作る | [TaskFilter.tsx](TaskFilter.tsx)、[TaskFilter.test.tsx](TaskFilter.test.tsx) | 3 |
| 4 | 基本 | 答え | 考えて答える | [predict.md](predict.md) | 3・5・6・8 |
| 5 | 応用 | テスト | API を読む部品の、書き換えと失敗 | [TaskListPanel.tsx](TaskListPanel.tsx)、[TaskListPanel.test.tsx](TaskListPanel.test.tsx)、[test-helpers.tsx](test-helpers.tsx) | 5 |
| 6 | 応用 | テスト | ときどき失敗するテストを直す | [flaky.test.tsx](flaky.test.tsx)、[check-flaky.ts](check-flaky.ts) | 7 |
| 7 | 応用 | テスト | 画面から API まで通す E2E | [e2e/tasks.spec.ts](e2e/tasks.spec.ts)、[playwright.config.ts](playwright.config.ts)、[check-e2e.ts](check-e2e.ts) | 8 |
| 8 | 発展 | テスト | 自動で保存するフックの、時間の動き | [useAutoSave.ts](useAutoSave.ts)、[useAutoSave.test.ts](useAutoSave.test.ts) | 6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

- **テストを書く問題（1・2・5・8）**は、第56・57章と同じです。`○○.test.tsx` の `// ここを書く` にテストを書き足し、`node ../../tools/check-tests.ts ○○.test.tsx --vitest` で「すべて成功しました」と出れば完成です（`--vitest` は、`node --test` ではなく Vitest で動かす、の意味）。ミュータントは [mutants/](mutants/) にあります。最初は、問題1で7個、問題2で7個、問題5で6個、問題8で6個の確認が失敗します。
- テストだけを動かすときは `npx vitest run ○○.test.tsx` です。この練習問題のフォルダには Vitest の設定ファイルが無いので、テストのファイルの1行目の `// @vitest-environment jsdom` で jsdom を選んでいます（第8部と同じ）。
- **コードを書く問題（3）**は、`TaskFilter.tsx` を書き、`npx vitest run TaskFilter.test.tsx` ですべて通れば完成です。模範解答は `MODULE=../solutions/TaskFilter.tsx npx vitest run TaskFilter.test.tsx` で試せます。
- 問題6・7は、専用の確認の道具（`check-flaky.ts`・`check-e2e.ts`）を使います。
- このフォルダの [api.ts](api.ts)・[AddTaskForm.tsx](AddTaskForm.tsx)・[TaskItem.tsx](TaskItem.tsx)・[TaskListPanel.tsx](TaskListPanel.tsx)・[test-helpers.tsx](test-helpers.tsx) は、本文の samples のコピーです。どれも書き換えなくてかまいません。

---

## 基本

### 問題1 期限つきのタスクの行

[TaskCard.tsx](TaskCard.tsx) は、本文の `TaskItem` に期限を足した部品です。決まりを確かめるテストを、[TaskCard.test.tsx](TaskCard.test.tsx) に書き足してください。今日の日付は props の `today`（`'YYYY-MM-DD'`）で受け取ります。

| 決まり | |
| --- | --- |
| チェックボックス | 名前は題名。`done` ならチェックが付く。押すと `onToggle(id, 反対の値)` |
| 「消す」ボタン | 名前は `「題名」を消す`。押すと `onDelete(id)` |
| 期限 | `dueDate` が `null` なら「期限なし」、あれば「期限: 2026-12-24」 |
| 期限切れ | 未完了で、期限が今日より前なら「期限切れ」と出す。今日・明日・完了のタスクには出さない |

```sh
$ npx vitest run TaskCard.test.tsx
$ node ../../tools/check-tests.ts TaskCard.test.tsx --vitest
```

ヒント: 押して呼ばれた引数は `toHaveBeenCalledWith`（1回だけなら `toHaveBeenCalledExactlyOnceWith`）で確かめます。期限の境目は、第56章のように表にして `test.each([...])` で並べると、書き漏らしが減ります（`test.each` は Vitest にもあり、名前の `$dueDate` に値が入ります）。

### 問題2 題名を直すフォーム

[EditTitleForm.tsx](EditTitleForm.tsx) は、タスクの題名を直すフォームです。決まりを確かめるテストを、[EditTitleForm.test.tsx](EditTitleForm.test.tsx) に書き足してください。

| 決まり | |
| --- | --- |
| 最初 | 欄（名前「題名」）に `initialTitle` が入っている |
| 保存 | 「保存」か Enter で、前後の空白を除いた題名を `onSave` に渡す |
| 空 | 空（空白だけ）なら `onSave` を呼ばず、「題名を入れてください」を `role="alert"` で出し、欄を `aria-invalid="true"` にする |
| 変わっていない | 前後の空白を除いて `initialTitle` と同じなら、`onSave` を呼ばずに `onCancel` を呼ぶ |
| 保存の途中 | ボタンが「保存中…」になり、押せない（`disabled`）。終わったら「保存」に戻る |
| 失敗 | `onSave` が例外なら、その `message` を `role="alert"` で出し、打った題名を残す |
| やめる | Escape キーか「やめる」ボタンで `onCancel` を呼ぶ |

```sh
$ npx vitest run EditTitleForm.test.tsx
$ node ../../tools/check-tests.ts EditTitleForm.test.tsx --vitest
```

ヒント: 入っている題名を消してから打つには `user.clear(欄)` を使います。「保存の途中」は、本文4.2節の `deferred()`（ひな形に書いてあります）で作ります。

### 問題3 テストが探せる部品を作る

今度は逆に、テスト（[TaskFilter.test.tsx](TaskFilter.test.tsx)）が先にあります。テストが役割と名前で探せるように、[TaskFilter.tsx](TaskFilter.tsx) を書いてください。

- 「すべて」「未完了」「完了」の3つのラジオボタンを、`<fieldset>` と `<legend>表示するタスク</legend>` で囲む
- ラジオボタンの名前は、件数つきで `すべて (3)` `未完了 (2)` `完了 (1)`。`value` は `all`・`open`・`done`。`filter` と同じものだけチェックが付く。選ぶと `onChange(値)`
- 3つは同じ `name` を持つ（矢印キーで動けるひとまとまりになる）。同じ画面に2つ置いても `name` がぶつからないように、`useId()` で作る（第8部 第45章）
- 件数のまとめを `role="status"` で出す。`3 件中 1 件完了`、タスクが無ければ `タスクはありません`

```sh
$ npx vitest run TaskFilter.test.tsx
```

最初は 9 個のテストがすべて失敗します。

ヒント: `<label><input type="radio" … />すべて (3)</label>` のように包むと、ラジオボタンの名前が label の文になります（本文3節の表）。JSX の `{o.label} ({o.count})` は「すべて (3)」になります。

### 問題4 考えて答える

[predict.md](predict.md) の4つの問いに答えてください。

---

## 応用

### 問題5 API を読む部品の、書き換えと失敗

本文の [TaskListPanel.tsx](TaskListPanel.tsx) のうち、本文で確かめていない所のテストを、[TaskListPanel.test.tsx](TaskListPanel.test.tsx) に書き足してください。道具は本文5節の [test-helpers.tsx](test-helpers.tsx) です。

| 決まり | |
| --- | --- |
| 空の一覧 | 「タスクはまだありません」と出し、一覧（`list`）は出さない |
| チェック | `PATCH /api/tasks/:id` に `{ "done": true }` を送り、一覧を読み直して、完了として出す（件数も変わる） |
| 消す | `DELETE /api/tasks/:id` を送り、一覧を読み直して、そのタスクを出さない |
| 足すのに失敗 | API が 422 を返したら、その理由（`errors[0].detail`）をフォーム（名前「タスクを足す」）の中に `role="alert"` で出す |
| 変えるのに失敗 | チェック・消すが失敗したら、「変更できませんでした: 理由」を `role="alert"` で出す |

```sh
$ npx vitest run TaskListPanel.test.tsx
$ node ../../tools/check-tests.ts TaskListPanel.test.tsx --vitest
```

ヒント: `fakeTaskApi(seed, override)` の `override` は、`(method, url) => Response | undefined` です。`POST` のときだけ `jsonResponse({ … }, 422)` を返せば、ほかは覚えているデータで答えます。届いたリクエストは `api.requests`（`{ method, url, body }` の配列）で確かめます。「読み直した」は、画面が新しい状態（件数など）になるまで `findBy…` で待つと確かめられます。

### 問題6 ときどき失敗するテストを直す

[flaky.test.tsx](flaky.test.tsx) の4つのテストは、`npx vitest run flaky.test.tsx` で動かすと、たいてい通ります。ところが、偽物の API の応答を遅らせたり、テストの順番を変えたりすると、失敗します。[check-flaky.ts](check-flaky.ts) は、遅れ（0ms・150ms）と順番（4通り）を変えて、8回動かします。

```sh
$ node check-flaky.ts flaky.test.tsx
[OK] 遅れ 0ms・順番 1: すべて通った
[OK] 遅れ 0ms・順番 2: すべて通った
[NG] 遅れ 0ms・順番 3: 失敗 → 最初は「読み込み中…」、読めたら「タスクはまだありません」 / Enter で1回だけ送る
[OK] 遅れ 0ms・順番 4: すべて通った
[NG] 遅れ 150ms・順番 1: 失敗 → 一覧に題名が出る
[NG] 遅れ 150ms・順番 2: 失敗 → 一覧に題名が出る
[NG] 遅れ 150ms・順番 3: 失敗 → 一覧に題名が出る / Enter で1回だけ送る
[NG] 遅れ 150ms・順番 4: 失敗 → 一覧に題名が出る
5 個の確認が失敗しました
```

8回すべて通るように、`flaky.test.tsx` を直してください。決まり: テストの名前と、確かめていること（`expect` の中身）は変えません。部品（`TaskListPanel`・`AddTaskForm`）も変えません。

ヒント: 原因は3つあります。本文7節の表を見て、「決まった時間だけ待っている所」「ファイルで1つだけ作って、テストの間で共有しているもの」を探します。同じ失敗をもう一度起こすには、`FAKE_DELAY_MS=150 npx vitest run flaky.test.tsx` や `npx vitest run flaky.test.tsx --sequence.shuffle --sequence.seed=3` と打ちます。

### 問題7 画面から API まで通す E2E

本文の画面（`../samples/app`）を本物のブラウザで動かし、[e2e/tasks.spec.ts](e2e/tasks.spec.ts) に E2E のテストを書き足してください。API と画面は、[playwright.config.ts](playwright.config.ts) が 9723・9724 で起動します。データは、テストごとに「牛乳を買う」（未完了）と「第58章を読む」（完了）に戻ります。

| 確かめること | |
| --- | --- |
| 完了にする | 「牛乳を買う」にチェックを付けると、チェックが付いて「2 件中 2 件完了」と出る。読み込み直しても、チェックが付いている |
| 未完了に戻す | 「第58章を読む」のチェックを外すと「2 件中 0 件完了」と出る。読み込み直しても、外れている |
| 消す | 「牛乳を買う」を消すと、一覧が1つになる。読み込み直しても、戻らない |

```sh
$ npx playwright test e2e/tasks.spec.ts
$ node check-e2e.ts e2e/tasks.spec.ts
```

[check-e2e.ts](check-e2e.ts) は、テストを、正しい API と、わざと壊した3つの API（[mutants/api-1.ts](mutants/api-1.ts) など。画面は同じ）で動かします。最初は、3つのミュータントを見逃して、3 個の確認が失敗します。1回に 30 秒ほどかかります。

ヒント: この画面のチェックボックスは、サーバが答えてから付きます。Playwright の `check()`・`uncheck()` は「押した直後に状態が変わったか」まで確かめるので、ここでは使えません（練習問題4の問3）。`click()` で押してから、`await expect(…).toBeChecked()` のように、そうなるまで待つ形で確かめます。

---

## 発展

### 問題8 自動で保存するフックの、時間の動き

[useAutoSave.ts](useAutoSave.ts) の `useAutoSave(value, save, delayMs)` は、打つのが止まったら自動で保存するフックです。戻り値は今の状態（`'idle'`・`'pending'`・`'saving'`・`'saved'`・`'error'`）です。決まりを確かめるテストを、フェイクタイマーと `renderHook`（本文6節）で、[useAutoSave.test.ts](useAutoSave.test.ts) に書き足してください。

| 決まり | |
| --- | --- |
| 最初 | 最初の値は保存しない。状態は `idle` |
| 待つ | 値が変わると `pending`。最後に変わってから `delayMs` ミリ秒たったら、最新の値で `save` を1回だけ呼び、`saving` |
| 続けて変わる | 待っている間にまた変わったら、そこから数え直す（途中の値は保存しない） |
| 終わり | `save` の Promise が解決したら `saved`、失敗したら `error` |
| アンマウント | 待っている間にアンマウントされたら、待たずに、すぐ最新の値で `save` を呼ぶ。待っているものが無ければ呼ばない |

```sh
$ npx vitest run useAutoSave.test.ts
$ node ../../tools/check-tests.ts useAutoSave.test.ts --vitest
```

ヒント: 境目は「999 ミリ秒ではまだ呼ばれない、1000 ミリ秒で呼ばれる」のように確かめます。`save` の Promise が解決した後の state の更新は、`await act(async () => d.resolve())` で待ちます（`act` に async 関数を渡すと、その中の Promise と、その後の更新が終わるまで待つ）。アンマウントは `renderHook` の戻り値の `unmount()` です。
