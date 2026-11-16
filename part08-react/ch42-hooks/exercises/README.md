# 第42章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch42-hooks/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 得点と履歴（更新関数） | [Score.tsx](Score.tsx)、[Score.test.tsx](Score.test.tsx) | 2 |
| 2 | 基本 | タブの題名を変えるフック | [useDocumentTitle.ts](useDocumentTitle.ts)、[useDocumentTitle.test.tsx](useDocumentTitle.test.tsx) | 3・7 |
| 3 | 基本 | 配列を変えずに新しい配列を作る | [updates.ts](updates.ts)、[updates.test.ts](updates.test.ts) | 2.4 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 1〜6・8 |
| 5 | 応用 | ストップウォッチ | [Stopwatch.tsx](Stopwatch.tsx)、[Stopwatch.test.tsx](Stopwatch.test.tsx) | 3 |
| 6 | 応用 | localStorage に保存される state | [useLocalStorage.ts](useLocalStorage.ts)、[useLocalStorage.test.tsx](useLocalStorage.test.tsx) | 7 |
| 7 | 応用 | `useReducer` でタスクと絞り込み | [TaskApp.tsx](TaskApp.tsx)、[TaskApp.test.tsx](TaskApp.test.tsx) | 8 |
| 8 | 発展 | 少し待ってから絞り込む検索欄 | [TaskSearch.tsx](TaskSearch.tsx)、[TaskSearch.test.tsx](TaskSearch.test.tsx) | 3・5・7 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第41章と同じです。`○○.tsx`（または `○○.ts`）を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` で型を、`npx eslint .` で Hooks の決まりを守れているかも確かめてください（本文3.5節）。

- いくつかのテストは、コンポーネントを `<StrictMode>` で包んで描きます（本文3.4節）。後片付けを忘れていると、ここで見つかります。
- タイマーを使う問題（5・8）のテストは、偽物の時計で時間を進めます（本文9節）。

---

## 基本

### 問題1 得点と履歴（更新関数）

[Score.tsx](Score.tsx) の `Score()` を書いてください（本文2節）。

- `<h2>得点: 0</h2>` と、「+1」「+3」「0に戻す」の3つのボタン、押した履歴の `<ol>` を出します。
- 「+1」は1点足し、履歴の後ろに `+1` を足します。
- 「+3」は、**「+1」と同じ関数を3回呼んで**作ってください。履歴には `+1` が3つ並びます。
- 「0に戻す」は 0 点にし、履歴に `0に戻す` を足します（履歴は消しません）。

ヒント: 「+1」の関数を `setScore(score + 1)` で書くと、「+3」が1点しか増えません（本文2.2節）。

### 問題2 タブの題名を変えるフック

[useDocumentTitle.ts](useDocumentTitle.ts) の `useDocumentTitle(title)` を書いてください（本文3節・7節）。

- 描いた後、`document.title` を `title` にします。`title` が変わったら、題名も変えます。
- そのコンポーネントが画面から消えたら、**フックを使い始める前の題名**に戻します。
- `<StrictMode>` でも、同じように動くようにします。

使い方: `useDocumentTitle(`タスク（${tasks.length}件）`);`

### 問題3 配列を変えずに新しい配列を作る

[updates.ts](updates.ts) の4つの関数を書いてください（本文2.4節）。どれも、**元の配列とオブジェクトを変えずに**、新しい配列を返します（テストは、元の配列を `Object.freeze` で凍らせて渡すので、書き換えると例外になります）。

| 関数 | 返すもの |
| --- | --- |
| `toggle(tasks, id)` | その id のタスクの `done` を反対にした配列 |
| `rename(tasks, id, title)` | その id のタスクの題名を変えた配列 |
| `remove(tasks, id)` | その id のタスクを除いた配列 |
| `moveUp(tasks, id)` | その id のタスクを1つ前と入れ替えた配列。先頭や、無い id なら、同じ並びの新しい配列 |

- 変えなかったタスクは、**同じオブジェクトのまま**新しい配列に入れます（コピーしない）。テストが `toBe` で確かめます。

ヒント: `moveUp` は、`tasks.with(番号, 値)`（1か所だけ替えた新しい配列を返す。ES2023）を2回使うと書けます。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 ストップウォッチ

[Stopwatch.tsx](Stopwatch.tsx) の `Stopwatch()` を書いてください（本文3節）。

- `<p>経過: 0 秒</p>` と、「開始」のボタン、「リセット」のボタンを出します。
- 「開始」を押すと、1秒ごとに1つ増えます。動いている間、ボタンの文字は「停止」になり、押すと止まります。もう一度「開始」を押すと、続きから進みます。
- 「リセット」で 0 秒に戻し、止めます。
- 動いている途中で画面から消えたら、タイマーも止めます（テストが、残っているタイマーの数を確かめます）。

ヒント: 「動いているか」を state に持ち、それを依存配列に入れた `useEffect` で `setInterval` を始めます。動いていなければ、何もせずに `return` します。

### 問題6 localStorage に保存される state

[useLocalStorage.ts](useLocalStorage.ts) の `useLocalStorage(key, initial)` を書いてください（本文7節）。`useState` と同じ形の `[値, 変える関数]` を返し、値をブラウザの `localStorage`（第39章）に JSON で保存するフックです。

- 最初の値は、`localStorage.getItem(key)` を `JSON.parse` したものです。保存された値が無いときや、JSON として読めないときは `initial` です。
- 値が変わったら、`localStorage.setItem(key, JSON.stringify(値))` で保存します。
- 変える関数には、値も、更新関数（`(prev) => prev + 1`）も渡せます。

ヒント: `useState(() => …)` のように関数を渡すと、最初の描画のときだけ呼ばれます（本文2.3節）。毎回 `localStorage` を読まずに済みます。

### 問題7 `useReducer` でタスクと絞り込み

[TaskApp.tsx](TaskApp.tsx) の `initialState`・`reducer`・`TaskApp` を書いてください（本文8節）。state は `{ tasks, filter }` で、action の型はファイルにあります。

| action | 次の state |
| --- | --- |
| `added` | 前後の空白を取った題名のタスク（id は一番大きい id + 1。無ければ 1、`done: false`）を後ろに足す |
| `toggled` | その id の `done` を反対にする |
| `renamed` | その id の題名を、前後の空白を取った題名にする |
| `deleted` | その id を除く |
| `cleared-done` | `done` のタスクを全部除く |
| `filter-changed` | `filter` を変える（タスクの配列は同じまま） |

- `added`・`renamed` で題名が空白だけなら、**受け取った state をそのまま**返します（React は、同じものが返ると描き直しません）。
- `initialState` は、タスク無し・`filter: 'all'` です。
- `TaskApp`: 「題名」という名前の入力欄と「追加」ボタンのフォーム、「すべて」「未完了」「完了」の3つの絞り込みボタン（選ばれているものに `aria-pressed="true"`）、`<label><input type="checkbox" />題名</label>` の一覧、「完了を消す」ボタンを出します。送ったら入力欄を空にします。

---

## 発展

### 問題8 少し待ってから絞り込む検索欄

[TaskSearch.tsx](TaskSearch.tsx) の `useDebounce(value, ms)` と `TaskSearch({ tasks })` を書いてください（本文3・5・7節）。

- `useDebounce`: `value` が `ms` ミリ秒の間変わらなかったら、その値を返すフックです。それまでは前の値を返します。1文字打つたびに重い絞り込みや API の呼び出しをしないための道具で、第43章でも使います。
- `TaskSearch`:
  - 「検索」という名前の入力欄、`<p>3 件</p>`（見つかった数）、見つかったタスクの題名の `<ul>` を出します。
  - 打った文字を `useDebounce(…, 300)` に通してから、題名に含まれるかで絞り込みます。大文字と小文字は区別しません。前後の空白は無視します。
  - 入力欄で Escape を押すと、検索の文字を消します。
  - 入力欄の外で `/` を押すと、検索欄にフォーカスを移し、ブラウザの元の動き（`/` で始まるページ内検索など）を止めます（`preventDefault`）。入力欄の中の `/` は、ふつうに文字として入れます。画面から消えたら、`/` を見張るのをやめます。

ヒント: `/` は `window` の `keydown` を `useEffect` で見張ります（本文3.3節）。フォーカスを移す先は `useRef`（本文5.1節）で指します。入力欄の中かどうかは、`e.target instanceof HTMLInputElement` で調べられます。
