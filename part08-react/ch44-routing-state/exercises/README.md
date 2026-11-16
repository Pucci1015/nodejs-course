# 第44章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch44-routing-state/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | URL の検索パラメータと条件の行き来 | [listParams.ts](listParams.ts)、[listParams.test.ts](listParams.test.ts) | 4 |
| 2 | 基本 | 今のページが分かるメニュー | [Nav.tsx](Nav.tsx)、[Nav.test.tsx](Nav.test.tsx) | 5.2 |
| 3 | 基本 | URL の `:id` を読むページ | [TaskIdPage.tsx](TaskIdPage.tsx)、[TaskIdPage.test.tsx](TaskIdPage.test.tsx) | 3 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | 何ページ目かを URL に持つ | [Pager.tsx](Pager.tsx)、[Pager.test.tsx](Pager.test.tsx) | 4 |
| 6 | 応用 | Context で配る「暗い色」 | [theme.tsx](theme.tsx)、[theme.test.tsx](theme.test.tsx) | 7 |
| 7 | 応用 | URL とページの対応表 | [AppRoutes.tsx](AppRoutes.tsx)、[AppRoutes.test.tsx](AppRoutes.test.tsx) | 2・8 |
| 8 | 発展 | 離れた部品で「選んだタスク」を共有する | [selection.tsx](selection.tsx)、[selection.test.tsx](selection.test.tsx) | 7.3 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第43章と同じです。`○○.tsx`（または `○○.ts`）を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` と `npx eslint .` も通してください。

- ルーターを使う問題のテストは、ブラウザのアドレス欄のかわりに、メモリの中の URL を使う `MemoryRouter` で包んで描きます（本文8節）。
- [types.ts](types.ts)（状態の型）と [pages.tsx](pages.tsx)（問題7で使うページ）は、書き換えなくてかまいません。

---

## 基本

### 問題1 URL の検索パラメータと条件の行き来

[listParams.ts](listParams.ts) の `parseListParams(params)` と `toListParams(p)` を書いてください（本文4節）。本文の `filters.ts` と同じ考え方で、状態を**いくつも**選べ、ページの番号もある一覧の条件を扱います。

```ts
parseListParams(new URLSearchParams('status=done,todo&page=2&q=牛乳'));
// → { statuses: ['todo', 'done'], page: 2, q: '牛乳' }
```

- `parseListParams`:
  - `status` はカンマで区切ります。知らない値は捨て、同じものは1つにして、`todo`・`doing`・`done` の順にそろえます。無ければ `[]`。
  - `page` は、1 以上の整数の文字（`03` のように 0 で始まるものは除く）だけを数にします。ほかは 1。
  - `q` は前後の空白を除きます。無ければ `''`。
- `toListParams`: 逆向きです。`status`・`page`・`q` の順に入れ、決まりの値（空の配列・1・空白だけの文字）は入れません。`status` も、`todo`・`doing`・`done` の順にそろえます。

### 問題2 今のページが分かるメニュー

[Nav.tsx](Nav.tsx) の `Nav({ items })` を書いてください（本文5.2節）。

- `aria-label="メニュー"` の `<nav>` の中の `<ul>` に、`items` の順に `NavLink` を `<li>` で並べます。
- 今のページのリンクには、`aria-current="page"`（`NavLink` が付ける）と `class="active"` を付けます。ほかのリンクには `class` を付けません。
- `/` のリンクは、URL が `/` ぴったりのときだけ、今のページとします。

ヒント: `NavLink` の `className` には、`({ isActive }) => …` の関数を渡せます。

### 問題3 URL の `:id` を読むページ

[TaskIdPage.tsx](TaskIdPage.tsx) の `parseId(s)` と `TaskIdPage()` を書いてください（本文3節）。

- `parseId`: 1 以上の整数の文字（0 で始まらない、9 けたまで）なら数を、それ以外（`undefined` を含む）なら `null` を返します。
- `TaskIdPage`: `/tasks/:id` のルートの部品です。`:id` が数なら `<h1>タスク 3</h1>`、そうでなければ `<h1>ページが見つかりません</h1>` を出します。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 何ページ目かを URL に持つ

[Pager.tsx](Pager.tsx) の `usePage()` と `Pager({ hasNext })` を書いてください（本文4節）。

- `usePage()`: `[今のページ, ページを変える関数]` を返すフックです。ページは、検索パラメータの `page` を問題1と同じ決まりで読みます。ページを変えるときは、**ほかのパラメータ（`status` など）を残し**、1 ページ目なら `page` を URL から消します。
- `Pager`: `aria-label="ページ"` の `<nav>` に、「前へ」ボタン・`3 ページ目` の文・「次へ」ボタンを並べます。1 ページ目では「前へ」を、`hasNext` が `false` なら「次へ」を押せなくします。

ヒント: `setSearchParams` には、本文4.3節の更新関数の形 `(prev) => 次の URLSearchParams` を渡せます。`prev` は変えずに、`new URLSearchParams(prev)` でコピーしてから変えます。

### 問題6 Context で配る「暗い色」

[theme.tsx](theme.tsx) の `ThemeProvider`・`useTheme`・`ThemeToggle` を書いてください（本文7節）。

- `ThemeProvider({ initial, children })`: テーマ（`'light'` か `'dark'`。最初は `initial`、無ければ `'light'`）を state に持ち、`{ theme, toggle }` を Context で配ります。`toggle()` で `light` と `dark` が入れ替わります。
- `useTheme()`: Context の値を返します。`ThemeProvider` の外で使われたら、`useTheme は <ThemeProvider> の中で使ってください` という文の `Error` を投げます。
- `ThemeToggle()`: 「暗い色」という名前のボタンです。押すと `toggle()` を呼びます。`dark` のときは `aria-pressed="true"`、`light` のときは `"false"` です。

### 問題7 URL とページの対応表

[AppRoutes.tsx](AppRoutes.tsx) の `AppRoutes()` を、`<Routes>` と `<Route>` で書いてください（本文2・8節）。ページの部品は [pages.tsx](pages.tsx) にあります。

| URL | 出すページ |
| --- | --- |
| `/` | `Home` |
| `/tasks` | `TaskIndex` |
| `/tasks/new` | `NewTask` |
| `/tasks/:id` | `TaskPage` |
| `/home` | `/` に移す（`<Navigate to="/" replace />`） |
| それ以外 | `NotFound` |

- どのページも、`Layout`（メニューと `<Outlet />` がある）の中に出します。
- `/tasks` で始まる3つは、`<Route path="tasks">` の子にまとめてください。

ヒント: 本文2節の `createBrowserRouter` に渡した配列と、同じ形を JSX で書きます。`{ index: true, element: … }` は `<Route index element={…} />` です。

---

## 発展

### 問題8 離れた部品で「選んだタスク」を共有する

[selection.tsx](selection.tsx) の5つを書いてください（本文7.3節）。一覧のチェックボックスと、画面の上のバーという、離れた部品で「選んだタスクの id の配列」を共有します。

- `selectionReducer(selected, action)`:
  - `toggled`: その id が無ければ後ろに足し、あれば除く。
  - `all-selected`: `ids` を足す（もうあるものは足さない）。
  - `cleared`: 空にする。もともと空なら、受け取った配列をそのまま返す。
  - どれも、元の配列を変えません。
- `SelectionProvider`: `useReducer(selectionReducer, [])` を持ち、中の部品に配ります。
- `useSelection()`: `{ selected, isSelected(id), toggle(id), selectAll(ids), clear() }` を返します。Provider の外では、`useSelection は <SelectionProvider> の中で使ってください` の `Error` を投げます。
- `SelectableItem({ id, title })`: `<li><label><input type="checkbox" />題名</label></li>`。選ばれていればチェックが付き、押すと切り替わります。
- `SelectionBar({ allIds })`: 「すべて選ぶ」ボタン（`allIds` を全部選ぶ）。1つ以上選ばれていれば、`<span role="status">2 件選択中</span>` と「選択を解除」ボタンも出します。

ヒント: 本文7.3節のように、選ばれた配列と `dispatch` を、別々の Context で配ると、`dispatch` しか使わない部品が、選択が変わるたびに描き直されずに済みます（テストはどちらの書き方でも通ります）。
