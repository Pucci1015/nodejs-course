# 第46章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch46-fullstack/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | `<script>` に入れられる JSON | [serialize.ts](serialize.ts)、[serialize.test.ts](serialize.test.ts) | 3.2 |
| 2 | 基本 | `<title>` と `<meta>` を作る | [head.ts](head.ts)、[head.test.ts](head.test.ts) | 2.4・5 |
| 3 | 基本 | URL からページを決める | [routes.ts](routes.ts)、[routes.test.ts](routes.test.ts) | 2.2 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 1〜6 |
| 5 | 応用 | HTML とステータスを作る | [render.tsx](render.tsx)、[render.test.tsx](render.test.tsx) | 2・5 |
| 6 | 応用 | 食い違わない時刻の表示 | [LocalTime.tsx](LocalTime.tsx)、[LocalTime.test.tsx](LocalTime.test.tsx) | 4 |
| 7 | 応用 | タイムゾーンに左右されない日数 | [dueLabel.ts](dueLabel.ts)、[dueLabel.test.ts](dueLabel.test.ts) | 4.3 |
| 8 | 発展 | 遅い部分を後から送る | [stream.tsx](stream.tsx)、[stream.test.tsx](stream.test.tsx) | 6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第45章と同じです。`○○.tsx`（または `○○.ts`）を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` と `npx eslint .` も通してください。

- 問題5・8のテストは、1行目に `@vitest-environment jsdom` がありません。ブラウザのかわり（jsdom）を使わず、サーバと同じ Node.js の中で動きます。`window` や `document` はありません。
- [pages.tsx](pages.tsx)（問題5で使うページ）は、書き換えなくてかまいません。

---

## 基本

### 問題1 `<script>` に入れられる JSON

[serialize.ts](serialize.ts) の `serializeForScript(data)` を書いてください（本文3.2節）。サーバが読んだデータを、`<script type="application/json">` の中に入れるための文字を作ります。

- `JSON.stringify(data)` の結果の、`<`・`>`・`&` を、それぞれ `<`・`>`・`&`（6文字の文字）に変えます。JSON の文字列の中では同じ意味なので、`JSON.parse` すると元のデータに戻ります。
- 古い JavaScript では改行として扱われる2つの文字（U+2028・U+2029）も、` `・` ` に変えます。
- `JSON.stringify` が `undefined` を返す値（`undefined` や関数）なら、`TypeError` を投げます。

### 問題2 `<title>` と `<meta>` を作る

[head.ts](head.ts) の `escapeHtml(s)` と `renderHead(head)` を書いてください（本文2.4・5節）。

- `escapeHtml`: `&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;`、`'` → `&#39;` にします（第4部 第21章）。`&` を最初に変えます。
- `renderHead({ title, description, noindex })`: 次の行を、改行（`\n`）でつないだ文字を返します。どの値もエスケープします。
  - `<title>題名</title>`
  - `description` があれば `<meta name="description" content="説明">`
  - `noindex` が `true` なら `<meta name="robots" content="noindex">`（検索エンジンに載せないでという印。本文5節）

### 問題3 URL からページを決める

[routes.ts](routes.ts) の `matchRoute(pathname)` を書いてください（本文2.2節）。サーバでも、ブラウザでも使う関数です。

| パス | 返す値 |
| --- | --- |
| `/` | `{ name: 'list' }` |
| `/tasks/new` | `{ name: 'new' }` |
| `/tasks/3`（1 以上の整数。0 で始まらない、9 けたまで） | `{ name: 'task', id: 3 }` |
| `/` 以外で、最後が `/`（`/tasks/3/`） | `{ name: 'redirect', to: '/tasks/3' }`（最後の `/` を全部取る。全部取って空なら `'/'`） |
| それ以外 | `{ name: 'not-found' }` |

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 HTML とステータスを作る

[render.tsx](render.tsx) の `render(pathname, tasks)` を書いてください（本文2・5節）。`react-dom/server` の `renderToString` で、[pages.tsx](pages.tsx) のページを HTML の文字にして、ステータスと一緒に返します。

| パス | ステータス | HTML |
| --- | --- | --- |
| `/` | 200 | `<TaskListPage tasks={tasks} />` |
| `/tasks/:id`（その id のタスクがある） | 200 | `<TaskPage task={そのタスク} />` |
| `/tasks/:id`（無い）・それ以外 | 404 | `<NotFoundPage />` |

`:id` は、問題3と同じ決まりの数だけを受け付けます。

### 問題6 食い違わない時刻の表示

[LocalTime.tsx](LocalTime.tsx) の `useHydrated()`・`formatUtc(iso)`・`LocalTime({ iso })` を書いてください（本文4節）。サーバ（タイムゾーンは UTC のことが多い）とブラウザ（利用者のタイムゾーン）で、時刻の書き方が変わってしまうのを、ハイドレーションの食い違いにせずに出す部品です。

- `useHydrated()`: サーバで描くときと、ハイドレーションの間は `false`、その後は `true` を返すフックです。
- `formatUtc(iso)`: `'2026-11-11T16:10:38.925Z'` → `'2026-11-11 16:10 UTC'`。どこで動かしても同じ文字になる書き方です。
- `LocalTime({ iso })`: `<time dateTime={iso}>…</time>` を返します。中の文字は、`useHydrated()` が `false` なら `formatUtc(iso)`、`true` なら `new Date(iso).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })` です。

ヒント: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` は、サーバとハイドレーションの間は `getServerSnapshot()` の値を、その後は `getSnapshot()` の値を使います。`subscribe` は、何も見張らない `() => () => {}` でかまいません。`useEffect` で `setState(true)` しても書けますが、ESLint の `set-state-in-effect`（第42章 4節）に当たります。

### 問題7 タイムゾーンに左右されない日数

[dueLabel.ts](dueLabel.ts) の `todayIn(timeZone, now)` と `dueLabel(dueDate, today)` を書いてください（本文4.3節）。

- `todayIn('Asia/Tokyo', now)`: `now` の時刻の、そのタイムゾーンでの日付を `'YYYY-MM-DD'` で返します（`Intl.DateTimeFormat` に `timeZone` を渡す）。
- `dueLabel(dueDate, today)`: どちらも `'YYYY-MM-DD'` の文字です。

| 締め切り | 返す文字 |
| --- | --- |
| `null` | `締め切りなし` |
| 今日 | `今日まで` |
| 明日 | `明日まで` |
| 2日以上後 | `あと 8 日` |
| 過ぎている | `3 日過ぎています` |

- 日数は、日付の文字だけから数えます。`new Date('2026-11-20')` と `new Date()` の差を 86,400,000 で割る書き方は、時刻やタイムゾーン、夏時間で1日ずれることがあります。

ヒント: `Date.UTC(年, 月 - 1, 日)` は、その日の UTC の 0 時のミリ秒です。2つの日付をこれにして、差を 86,400,000 で割ると、ずれずに日数になります。

---

## 発展

### 問題8 遅い部分を後から送る

[stream.tsx](stream.tsx) の `streamStats(stats, out)` を書いてください（本文6節）。`stats` は、集計（`{ total, done }`）が終わると値になる Promise、`out` は書き込み先（Node.js の Writable）です。

- `renderToPipeableStream` で、次の部品を `out` に流します。

  ```html
  <main><h1>集計</h1>（ここに Suspense）</main>
  ```

- Suspense の `fallback` は `<p>集計中…</p>`、中身は、`use(stats)` で集計を受け取って `<p>全部で 5 件、完了は 2 件</p>` を出す部品です。
- 集計を待たずに、見出しと「集計中…」を先に送ります（`onShellReady` で `pipe(out)`）。集計ができたら、残りが送られて、`out` が終わります。
