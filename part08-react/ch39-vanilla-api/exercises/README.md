# 第39章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch39-vanilla-api/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | タスク1つ分の `<li>` | [task-item.js](task-item.js)、[task-item.test.js](task-item.test.js) | 2 |
| 2 | 基本 | 一覧を作り直す・数える | [task-list.js](task-list.js)、[task-list.test.js](task-list.test.js) | 2・4 |
| 3 | 基本 | API を呼ぶ関数 | [api.js](api.js)、[api.test.js](api.test.js) | 3・5・6 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | フォームを読んで確かめる | [form.js](form.js)、[form.test.js](form.test.js) | 5 |
| 6 | 応用 | 3つの状態を画面にする | [view.js](view.js)、[view.test.js](view.test.js) | 4 |
| 7 | 応用 | 状態を1か所に置く `createStore` | [store.js](store.js)、[store.test.js](store.test.js) | 4・8 |
| 8 | 発展 | SSE のイベントを一覧に当てる | [live.js](live.js)、[live.test.js](live.test.js) | 7 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

この部のテストは、**Vitest** という道具で動かします。第3部から使ってきた `node --test` と同じ「テストを動かす道具」ですが、ブラウザ用のコード（DOM・JSX・CSS の import）も動かせます。

```sh
$ npx vitest run task-item.test.js
 ✓ task-item.test.js (5 tests) 12ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- `npx vitest run ファイル` は、そのテストのファイルを1回だけ動かします。`run` を付けないと、ファイルを保存するたびに動かし直す「見張る」モードになります（止めるのは `q`）。
- テストのファイルの1行目の `// @vitest-environment jsdom` は、「このテストでは **jsdom** を使う」という意味です。jsdom は、ブラウザの `document` や `HTMLElement` を、Node.js の中でまねする道具です。本物のブラウザを開かずに、DOM を作るコードを確かめられます。
- 最初はすべて失敗します（中身が `throw new Error('まだ書いていません')` だから）。すべて通れば完成です。
- 模範解答を確かめるときは、`MODULE=../solutions/task-item.js npx vitest run task-item.test.js` です。

---

## 基本

### 問題1 タスク1つ分の `<li>`

[task-item.js](task-item.js) の `renderTask(task)` を書いてください（本文2節）。

| 作るもの | 決まり |
| --- | --- |
| `<li>` | `data-id`（id の文字列）と `data-status`（status）を付ける。status が `'done'` なら `class` に `done` を足す |
| `<span class="title">` | 題名を**文字として**入れる。`<li>` の中の最初 |
| `<small>` | 締め切りがあれば `締め切り: 2026-11-20` の文で、`<span>` の後ろに足す。`null` なら作らない |

```sh
$ npx vitest run task-item.test.js
      Tests  5 passed (5)
```

ヒント: `class` に足すのは `li.classList.add('done')`、`class` を全部決めるのは `span.className = 'title'` です。

### 問題2 一覧を作り直す・数える

[task-list.js](task-list.js) の2つの関数を書いてください（本文2・4節）。

- `renderList(ul, tasks)`: `ul` の中身を、タスクごとの `<li>`（中身は題名の文字、`data-id` 付き）で**置き換え**、出した数を返します。`tasks` が空なら、`<li class="empty">タスクはありません</li>` を1つだけ入れて、`0` を返します。
- `countByStatus(tasks)`: `{ todo: 2, doing: 0, done: 1 }` のような、状態ごとの数を返します。1つも無い状態も `0` で入れます。

### 問題3 API を呼ぶ関数

[api.js](api.js) の `createApi(base, fetchFn)` と `ApiError` を書いてください（本文3・5・6節）。`fetchFn` は、ふつうはブラウザの `fetch` で、テストでは偽物が渡されます。

| メソッド | 送るもの | 返すもの |
| --- | --- | --- |
| `list()` | `GET base + '/api/tasks?limit=100'` | 応答の `items` |
| `create(input)` | `POST base + '/api/tasks'`、`Content-Type: application/json`、本文は `JSON.stringify(input)` | 作られたタスク |
| `update(task, changes)` | `PATCH base + '/api/tasks/' + id`、`If-Match: "version"`、本文は `changes` の JSON | 変えた後のタスク |
| `remove(task)` | `DELETE`、`If-Match: "version"` | なし（204） |

- 応答が 2xx でなければ、`ApiError` を投げます。`err.status` はステータス、`err.problem` は本文の JSON（読めなければ `{}`）、`err.message` は `problem.detail`、無ければ `problem.title`、それも無ければ `HTTP 404` のような文です。
- `headers` は、`{ 'Content-Type': 'application/json', 'If-Match': '"4"' }` のような、ふつうのオブジェクトで渡してください（テストは `options.headers['If-Match']` を見ます）。

ヒント: 本文の `request` 関数を、`fetchFn` と `base` を使う形にして、`createApi` の中に置きます。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app.html` をブラウザと DevTools で動かして確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 フォームを読んで確かめる

[form.js](form.js) の2つの関数を書いてください（本文5節）。API に送る前に画面で確かめると、間違いをすぐに出せます（API でも必ず確かめます。画面の確かめは、利用者のための親切です）。

- `readTaskForm(form)`: `{ values, errors }` を返します。
  - `values.title` は前後の空白を取った題名、`values.dueDate` は日付の文字列（空なら `null`）
  - 題名が空なら `errors.title = '題名を入れてください'`、101 文字以上なら `'題名は 100 文字までです'`
  - 日付が空でなく、`YYYY-MM-DD` の形でなければ `errors.dueDate = '日付は YYYY-MM-DD です'`
- `showErrors(form, errors)`: フォームの中の `data-error-for="title"` のような要素に、その名前の間違いの文を入れます。間違いの無い項目の要素は、空にします。間違いが1つでもあれば `true` を返します。

ヒント: `form.querySelectorAll('[data-error-for]')` で全部の要素が取れ、`el.dataset.errorFor` で `data-error-for` の値が読めます（`-` の後ろは大文字になる）。

### 問題6 3つの状態を画面にする

[view.js](view.js) の `renderView(root, state, { onRetry })` を書いてください（本文4節）。`root` の中身を、`state` に合わせて置き換えます。

| `state.status` | `root` の中身 |
| --- | --- |
| `'loading'` | `<p class="loading">読み込み中…</p>` だけ |
| `'error'` | `<p class="error">読み込めませんでした: （state.message）</p>` と `<button>もう一度</button>`。ボタンを押すと `onRetry()` |
| `'success'` | `<ul>` に、`state.tasks` の題名を文字として入れた `<li>` |
| それ以外 | `Error` を投げる |

ヒント: `switch (state.status)` で分けます。`default:` で投げます。

### 問題7 状態を1か所に置く `createStore`

[store.js](store.js) の `createStore(initial)` を書いてください（本文4・8節）。本文の `let state` と `setState` を、どの画面でも使えるように部品にしたものです。

| メソッド | すること |
| --- | --- |
| `getState()` | 今の状態を返す |
| `setState(patch)` | `patch` はオブジェクトか、「今の状態を受け取ってオブジェクトを返す関数」。`{ ...今, ...patch }` の**新しい**オブジェクトにし、登録された関数を全部呼ぶ。ただし、`patch` のどの項目も今と同じ（`Object.is`）なら、何もしない |
| `subscribe(listener)` | 変わったら `listener(新しい状態)` を呼ぶように登録する。登録をやめる関数を返す |

ヒント: 登録された関数は `Set` に入れます（第3部 第11章）。「同じか」は `Object.keys(p).some((k) => !Object.is(state[k], p[k]))` で調べられます。

---

## 発展

### 問題8 SSE のイベントを一覧に当てる

[live.js](live.js) の2つの関数を書いてください（本文7節）。

- `applyEvent(tasks, type, task)`: **新しい配列**を返します（元の配列は変えない）。
  - `'task.created'`: 後ろに足す。同じ id がもうあれば、足さずに置き換える（同じ知らせが2回届いても、1つ）
  - `'task.updated'`: 同じ id のものを置き換える。ただし、届いた `task.version` が今のもの以下なら、古い知らせなので無視する
  - `'task.deleted'`: 同じ id のものを外す
  - それ以外: 受け取った `tasks` をそのまま返す
- `connectLive(url, store, { reload, EventSourceImpl })`: `new EventSourceImpl(url)` でつなぎ、3つのイベントが来たら `store.setState((s) => ({ tasks: applyEvent(s.tasks, type, task) }))`、`reset` が来たら `reload()` を呼びます。やめる関数（中で `close()`）を返します。

ヒント: テストは、本物の `EventSource` の代わりに、偽物のクラスを `EventSourceImpl` に渡します。本物と同じ `addEventListener` と `close` だけを使って書けば、本物でもそのまま動きます。
