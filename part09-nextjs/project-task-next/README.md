# 第9部の成果物 タスク管理アプリを Next.js で作り直す

第8部では、タスク管理 API（`~/dev/task-api`）を使う画面を、Vite と React で作りました（`~/dev/task-api/web`）。第9部のまとめとして、**同じ画面を Next.js で作り直し、2つを比べます**。

第47〜50章で学んだことを組み合わせます。ファイルが URL になること・`loading.tsx`・`not-found.tsx`（第47章）、Server Component と Client Component・`<Suspense>`（第48章）、Server Action・`useActionState`・SSE の中継（第49章）、何を覚えておくか（第50章）です。完成例のテスト（34 個）が通り、`npm run check`（`tsc` と ESLint とテスト）がエラー 0 で終われば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 8〜12時間 |
| 前提 | 第8部の成果物（`~/dev/task-api` のブランチ `part08-web`）、第47〜50章 |
| 作るもの | `~/dev/task-api/next/`。`npm run dev` で `http://localhost:9550/` に開く画面。サーバから、第7部の API（`127.0.0.1:9490`）を呼ぶ |
| 確かめ方 | `npm run check`。テストは完成例の [solutions/test/](solutions/test/)（ページ 14 個・Server Action 14 個・部品 6 個） |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`task-next` パッケージ）。偽の API でページ・Server Action・部品を確かめるテスト付き |

> **読み方**
> - 作業は、`~/dev/task-api` の中に `next/` というフォルダを作って行います。第8部の `web/` は消さずに残し、2つを並べて比べます（1節・5節）。
> - 要件（2節）は、第8部とほぼ同じです。違うのは、**データを読むのも書き換えるのもサーバ**になることです。
> - テストは、本物の API を使いません。偽の API（`test/fake-api.ts`）を HTTP のサーバとして動かし、その上で Next.js の開発サーバを起動して、ページを読みます。
> - テストは、ファイルの場所・関数の名前・画面に出す名前で探します。2.1節と2.6節の表のとおりに付けてください。
> - 一度に全部を書かず、3.2節の順番で、1つのページができるたびに `npm run dev` で開いて確かめてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| サーバで API を読んでページを作り、書き換えは Server Action で行う | 第10部（ログインのフォームも Server Action。Cookie もサーバで読む） |
| 1つのアプリを、Vite + React と Next.js の2つの作りで比べる | 第13部（作るものに合わせて、作りを選ぶ） |
| Server Action を、ふつうの関数としてテストする | 第11部（テストの層を分ける。ブラウザを動かす E2E のテストも書く） |
| `next build` → `next start` で、本番の形で動かす | 第12部（Next.js のアプリをデプロイする） |

---

## 1. 準備

### 1.1 ブランチを作る

第8部の完成した形を残しておくため、新しいブランチで作業します（第1部 第3章）。

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part08-web              # 第8部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part09-next          # 新しいブランチを作って、そこに移る
```

### 1.2 next フォルダと、設定のファイル

`web/` と同じく、画面のパッケージは、API とは別の `package.json` を持ちます。設定のファイルは、完成例からコピーします。

```sh
$ mkdir next
$ cd next
$ P=~/dev/part09/project-task-next/solutions
$ cp $P/package.json $P/package-lock.json $P/tsconfig.json $P/eslint.config.js $P/next.config.ts $P/.gitignore .
$ npm ci
```

- `P=…` は、長い場所に `P` という名前を付けるシェルの書き方です。`$P` と書くと、その場所になります。
- `npm ci` は、`package-lock.json` に書かれたとおりの版を入れるコマンドです（第3部 第14章）。版は、第9部の章で使ったものと同じです。

コピーしたファイルの中身は、次のとおりです。

| ファイル | 中身 |
| --- | --- |
| `package.json` | `scripts` に `dev`（`next dev -p 9550`）・`build`・`start`（`next start -p 9550`）・`typecheck`（`next typegen` で `PageProps` などの型を作ってから `tsc`。第47章 6.1節）・`lint`・`test`・`check`。`check` は、`tsc` → ESLint → テストの順に動かす |
| `tsconfig.json` | 第9部の `tools/tsconfig.next.json` と同じ（第47章 2.1節） |
| `eslint.config.js` | 第47章 9.3節と同じ（Next.js と Hooks の決まりを見張る）。`test/` だけ、型の無い値の注意を止める |
| `next.config.ts` | 第47章 2.1節と同じ。`NEXT_DIST_DIR` で、ビルドの結果を置くフォルダを変えられる（テストは `.next-test` を使う） |
| `.gitignore` | `node_modules/`・`.next/`・`.next-test/`・`next-env.d.ts`・`*.tsbuildinfo` をコミットしない |

`app/`・`components/`・`lib/`・`test/` は、自分で作ります。第8部の `web/` から、そのまま使えるファイルもコピーしておきます。

```sh
$ mkdir -p app/tasks/new "app/tasks/[id]" app/api/events components lib test
$ cp ../web/src/api/schemas.ts ../web/src/lib/dates.ts lib/
```

- `mkdir -p` は、途中のフォルダもまとめて作るオプションです。`[id]` は、シェルでは特別な意味を持つ文字（`[ ]`）なので、`"…"` で囲みます。
- `schemas.ts`（Zod の決まり）と `dates.ts`（締め切りまでの日数・日本の時刻）は、ブラウザでもサーバでも同じように動くので、作り直さずに使えます。

### 1.3 API を動かす

画面を目で確かめるときは、第7部の API を動かしておきます。ターミナルをもう1つ開いて、次を打ちます。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)   # PostgreSQL
$ cd ~/dev/task-api
$ npm start                                          # http://127.0.0.1:9490/api/tasks
```

- 止めるときは `Ctrl+C` です。PostgreSQL は `(cd ~/dev/part06 && docker compose stop)` で止めます。
- データベースを使わずに試したいときは、第9部の練習用の API（`~/dev/part09` で `npm run api`。`127.0.0.1:9500`）を使い、画面を `API_URL=http://127.0.0.1:9500 npm run dev` で動かします。
- 第8部と違い、ブラウザは API に直接つながりません。API を呼ぶのは Next.js のサーバなので、プロキシも CORS も要りません（第47章 5.1節）。

---

## 2. 要件

### 2.1 ページと、画面に出す名前

第8部の 2.1節とほぼ同じです。違うところを**太字**にしています。

| URL | ページ | 要るもの（名前） |
| --- | --- | --- |
| どのページにも | 枠 | リンク「本文へ」（`href="#main"`）、`<nav aria-label="メニュー">` の中にリンク「一覧」「新しいタスク」、`<main id="main">` |
| `/` | 一覧 | 見出し（`h1`）「タスク一覧」。**`<form>` の中に**、`<fieldset>` の `<legend>` が「状態」で、チェックボックス「未着手」「作業中」「完了」（**`name="status"`、`value` は `todo`・`doing`・`done`**）。選ぶ欄「並べ方」（**`name="sort"`**。「締め切りが近い順」「新しい順」「古い順」「題名順」）。検索の欄「題名で絞り込む」（`type="search"`、**`name="q"`**）。**ボタン「絞り込む」**。タスクごとに `<li>` で、チェックボックス「完了（題名）」と、題名のリンク（`/tasks/:id` へ）。続きがあれば**リンク「次のページ」**。1つも無ければ「タスクはありません」 |
| `/tasks/new` | 作る | 見出し「新しいタスク」。入力欄「題名」「締め切り」（`type="date"`）、ボタン「作る」 |
| `/tasks/:id` | 1つのタスク | 見出しはタスクの題名。選ぶ欄「状態」（「未着手」「作業中」「完了」）。入力欄「題名」「締め切り」、ボタン「保存」。ボタン「消す」 |
| ほか（無いタスク・`/tasks/abc` も） | 見つからない | 見出し「ページが見つかりません」 |
| `/api/events` | SSE の中継 | API の `/api/events` を、そのまま流す（`text/event-stream`） |

### 2.2 一覧

- サーバで、API の `GET /api/tasks` を 20 件ずつ読む。`nextCursor` があれば、リンク「次のページ」（`/?cursor=…`。条件も付ける）で続きのページに移る
- 状態・並べ方・題名の絞り込みは、URL の検索パラメータに置く。`/?status=todo,doing&sort=title&q=牛乳` と、フォームを送った形の `/?status=todo&status=doing` の両方を読めるようにする。知らない値は捨てる
  - 並べ方の既定は「締め切りが近い順」（`dueDate`）。URL には書かないが、API にはいつも `sort` を送る
  - API に送る順は `status`・`sort`・`limit`・`cursor`（例: `/api/tasks?status=todo,doing&sort=title&limit=20`）
  - 題名の絞り込みは、API に無いので、読み込んだものの中から探す。大文字と小文字は区別しない
- 条件のフォームは、`useState` を使わず、ふつうの GET のフォームにする（`next/form` の `<Form action="/">`。3.4節）
- 終わっていないタスクには、締め切りまでの日数を出す: 「今日まで」「明日まで」「あと N 日」「N 日過ぎています」。「今日」は日本の日付
- 「完了（題名）」のチェックで、完了と未着手を切り替える。応答を待たずにチェックを変え（`useOptimistic`。第49章 3.4節）、失敗したら戻して、理由を `role="alert"` で出す。成功したら「「題名」を完了にしました」か「「題名」を未着手に戻しました」を、`role="status"` で知らせる
- `?deleted=題名` で開いたら、`<p role="status">「題名」を消しました</p>` を出す（3.6節）

### 2.3 作る

- **サーバ（Server Action）で**、Zod で確かめる。題名が空なら API に送らず、題名の横に「題名を入れてください」と出し、`aria-invalid` と `aria-describedby` でつなぐ。打った値は消さない
- API が 422 を返したら、その項目の横に、API の文を出す。409 など、ほかの断りは、フォームの上に `role="alert"` で出す
- 送っている間は、ボタンを押せなくする（`useFormStatus`。3.3節）
- 作れたら、`/tasks/番号?created=1` に移り、`<p role="status">「題名」を作りました</p>` を出す

### 2.4 1つのタスク

- 作った日時・変えた日時（完了していれば完了した日時も）を、日本の時刻で出す
- 「状態」を変えたら、すぐに送る。API が断ったら（409。作業中は3個まで、など）、理由を `role="alert"` で出し、選ぶ欄は元に戻す
- 「保存」は、**変わった項目だけ**を送る。何も変わっていなければ、API に送らない
- 変えるときも消すときも、`If-Match` に、読んだときの `version` を入れる。ほかの人が先に変えていたら（412）、「ほかの人が先に変えました。読み直してから、もう一度やってください」と出し、ボタン「読み直す」で新しい中身にする（3.5節）
- 「消す」は、ダイアログ（「「題名」を消しますか」）で確かめてから消す。ダイアログを開いたら、フォーカスは「キャンセル」に置く。消したら `/?deleted=題名` に移る
- 無いタスク（404）・数字でない id・`0` は、「ページが見つかりません」（`notFound()`）
- ブラウザのタブの題名を、タスクの題名にする（`generateMetadata`。第47章 8節）

### 2.5 どのページにも

- ほかのタブや人が変えたら、SSE で知らせてもらい、ページを作り直す（`router.refresh()`。第49章 5節）。ブラウザは、同じオリジンの `/api/events` につなぐ
- `/tasks/[id]` を読んでいる間は `loading.tsx` を出す。API が 500 などで失敗したら、`error.tsx` で「うまく表示できませんでした」と出し、ボタン「もう一度読む」で読み直せる
- 色とフォーカスの枠は、第8部の `index.css` と同じ（`app/globals.css` にコピーして使ってよい）

### 2.6 ファイルと関数の名前

テストは、次のファイルを import して、ふつうの関数・部品として呼びます。名前と引数を、このとおりにしてください。

| ファイル | 出すもの |
| --- | --- |
| `lib/api.ts` | API を呼ぶ関数。1行目で `import 'server-only'`。API の場所は `process.env.API_URL`（無ければ `http://127.0.0.1:9490`） |
| `app/tasks/actions.ts` | 1行目が `'use server'`。`createTaskAction(prev, formData)`・`updateTaskAction(id, version, original, prev, formData)`・`setStatusAction(id, version, status)`・`deleteTaskAction(id, version, title)`、型 `FormState` |
| `components/TaskForm.tsx` | `<TaskForm action initial submitLabel pendingLabel />`（作るページと、1つのタスクのページで使う） |
| `components/DoneToggle.tsx` | `<DoneToggle id version title done />` |
| `components/StatusSelect.tsx` | `<StatusSelect id version status />` |
| `components/DeleteButton.tsx` | `<DeleteButton id version title />` |

`FormState` は、次の形です。

```ts
export type FormState = {
  errors: { title?: string; dueDate?: string; form?: string }; // form: フォーム全体のエラー（409・412 など）
  values: { title: string; dueDate: string };                   // 打った値（失敗しても消さないため）
  stale?: boolean;                                               // 412 なら true。「読み直す」を出す
};
```

`setStatusAction` と `deleteTaskAction` は、`{ error: string | null }` を返します（`deleteTaskAction` は、消せたら `redirect` するので、返るのは失敗したときだけです）。

- `npm run typecheck`（`tsc`）と `npm run lint`（ESLint）が、エラー 0 で終わる
- `any` を書かない。API の応答は、Zod で確かめてから使う
- Server Action の引数は、どれもブラウザから届く値として確かめる（第49章 4節）。id や状態がおかしければ、API に送らずに「送られた値が正しくありません」を返す

---

## 3. 作り方のヒント

### 3.1 ファイルの分け方

```text
next/
├── package.json  tsconfig.json  eslint.config.js  next.config.ts
├── app/
│   ├── layout.tsx            … 枠。「本文へ」・メニュー・<main>・SSE
│   ├── globals.css           … 第8部の index.css と同じ
│   ├── page.tsx              … 一覧（/）
│   ├── not-found.tsx  error.tsx
│   ├── tasks/
│   │   ├── actions.ts        … Server Action（作る・直す・状態・消す）
│   │   ├── new/page.tsx      … 作る
│   │   └── [id]/  page.tsx  loading.tsx
│   └── api/events/route.ts   … SSE の中継（Route Handler）
├── components/  NavLinks.tsx  TaskForm.tsx  DoneToggle.tsx  StatusSelect.tsx  DeleteButton.tsx  LiveRefresh.tsx
├── lib/
│   ├── schemas.ts  dates.ts  … 第8部からコピー
│   ├── filters.ts            … 一覧の条件と、URL の行き来
│   └── api.ts                … API を呼ぶ関数と ApiError（サーバだけ）
└── test/                     … 完成例からコピー（4.1節）
```

`'use client'` を付けるのは、`components/` の中の、ブラウザで動く部品だけです。ページ（`page.tsx`）とレイアウトは、Server Component のままにします。

章で書いたものが、そのまま使えます。

| ファイル | 元にするもの |
| --- | --- |
| `lib/api.ts` | 第49章 2.2節の `lib/api.ts`（`ApiError`・`toFieldErrors`・`openEvents`）。`listTasks` は、第8部の `client.ts` と同じく `status`・`sort`・`limit`・`cursor` を送る |
| `lib/filters.ts` | 第8部の `filters.ts`。読む側を、Next.js の `searchParams`（値が文字・文字の配列・無し）に合わせる |
| `components/NavLinks.tsx`・`LiveRefresh.tsx` | 第48章 6.1節・練習問題8 |
| `components/TaskForm.tsx`・`DoneToggle.tsx` | 第49章 3.2節・3.4節・練習問題7 |
| `app/api/events/route.ts` | 第49章 5節 |
| `app/tasks/[id]/page.tsx`・`not-found.tsx`・`error.tsx` | 第47章 6節 |

### 3.2 進める順番

1. `lib/filters.ts` → `lib/api.ts`（ここまでは画面が無いので、`npx tsc --noEmit` で確かめる）
2. `app/layout.tsx`・`components/NavLinks.tsx`・`app/not-found.tsx` → `npm run dev` で開いて、メニューで移れること
3. `app/page.tsx`（一覧と、条件のフォーム。まずは1ページ目だけ）→「次のページ」
4. `app/tasks/[id]/page.tsx`（読むだけ）・`loading.tsx`・`error.tsx`
5. `app/tasks/actions.ts` の `setStatusAction` → `DoneToggle`・`StatusSelect`
6. `createTaskAction` → `TaskForm` → `app/tasks/new/page.tsx`
7. `updateTaskAction`（変わった項目だけ → 412 と「読み直す」）→ `deleteTaskAction` と `DeleteButton`
8. `app/api/events/route.ts` と `LiveRefresh`
9. テストをコピーして、`npm run check`（4節）。途中でも、`npx vitest run test/actions.test.ts` のように、1つのファイルだけを動かせる

### 3.3 2回送らない工夫

第8部では、作るときに `Idempotency-Key` を付けて、2回押してもタスクが1つになるようにしました。この成果物では、**冪等キーを付けません**。代わりに、次の2つで防ぎます。

- `useFormStatus` の `pending` で、送っている間は「作る」を押せなくする（第49章 3.2節）
- React は、同じフォームの Server Action を、前のものが終わるまで送らない（順番に1つずつ送る）

冪等キーを付けないのは、**キーを作る場所**が難しいからです。キーは「フォームを開くたびに1つ」作る値ですが、

- Client Component の中で `crypto.randomUUID()` を呼ぶと、サーバで作った HTML とブラウザで作り直した画面とで値が違い、ハイドレーションの食い違いになります（第8部 第46章）
- Server Component の中で呼ぶと、Cache Components では「毎回変わる値」になり、`connection()` が要ります（第50章 2.2節）

ネットワークが切れて、ブラウザが同じ送信を繰り返すような場合まで防ぎたいなら、5節の「もっとやるなら」を試してください。

### 3.4 条件のフォームは GET で

一覧の条件は、`useState` ではなく、ふつうの `<form method="get">` で送ります。送ると、ブラウザが `/?status=todo&sort=title` のような URL に移り、ページ（Server Component）がその `searchParams` で読み直します。

```tsx
import Form from 'next/form';

<Form action="/">                       {/* method は GET。送ると /?status=…&sort=… に移る */}
  <input type="checkbox" name="status" value="todo" defaultChecked={filters.statuses.includes('todo')} />
  …
  <button type="submit">絞り込む</button>
</Form>
```

- `next/form` の `<Form>` は、ふつうの `<form>` と同じ HTML になります。ページ全体を読み直さずに、`<Link>` と同じように移ります。
- 値は、`value` ではなく `defaultValue`・`defaultChecked` で入れます。入れた後は、ブラウザが値を持つので、`useState` は要りません。
- チェックボックスを2つ選ぶと、`?status=todo&status=doing` と、同じ名前が2回付きます。`searchParams.status` は、このとき `['todo', 'doing']`（文字の配列）になります。`lib/filters.ts` で、文字・文字の配列・無しの3つを扱います。

### 3.5 412 と「読み直す」

`updateTaskAction` は、`bind` で、ページを作ったときの `id`・`version`・元の値を受け取ります（第49章 3.3節）。

```tsx
// app/tasks/[id]/page.tsx（Server Component）
<TaskForm
  key={task.version}
  action={updateTaskAction.bind(null, task.id, task.version, { title: task.title, dueDate: task.dueDate })}
  initial={{ title: task.title, dueDate: task.dueDate ?? '' }}
  submitLabel="保存"
  pendingLabel="保存しています…"
/>
```

- 保存できたら、Server Action の中で `refresh()`（`next/cache`）を呼びます。ページが作り直され、新しい `version` と新しい `bind` のフォームに替わります。`key={task.version}` なので、フォームの state も新しい中身で始まります。
- 412 なら、`refresh()` を**呼ばず**、`{ stale: true }` と打った値を返します。呼ぶと、打った値が新しい中身で消えてしまうからです。「読み直す」を押したときだけ、`router.refresh()` で作り直します。
- 状態のチェック・選ぶ欄（`setStatusAction`）は、断られたときも `refresh()` を呼びます。打った値が無いので、すぐに最新にしてよいからです。

### 3.6 「作りました」「消しました」は URL で

第8部では、ページを移る前に、知らせる場所（`Announcer`）に文を入れました。Next.js では、`redirect` の後のページは**サーバが新しく作る**ので、Client Component の state は使えません。そこで、知らせを URL に入れて渡します。

```ts
redirect(`/tasks/${id}?created=1`);                                  // 作った
redirect(`/?${new URLSearchParams({ deleted: title.slice(0, 100) })}`); // 消した
```

ページは、`searchParams` を見て `<p role="status">…</p>` を出します。「POST の後は redirect して、GET のページで結果を出す」形は、Flask の `flash` と同じ考え方です（PRG: Post/Redirect/Get）。

- 消したときに題名を URL に入れるのは、消した後は API から読めないからです。だれでも `/?deleted=何でも` と打てますが、React が文字としてエスケープして出すので、HTML として動くことはありません（第8部 第41章 2.3節）。

### 3.7 テストのしくみ

| ファイル | 確かめること | やり方 |
| --- | --- | --- |
| `test/pages.test.ts` | ページの HTML（一覧・作る・1つのタスク・見つからない・SSE） | 偽の API（ポート 9556）と、このアプリの開発サーバ（9557）を起動し、`fetch` でページを読む |
| `test/actions.test.ts` | Server Action（送る値・エラーの文・`refresh()`・`redirect`） | 偽の API（9558）を起動し、`actions.ts` を import して、ふつうの関数として呼ぶ（第49章 練習問題5） |
| `test/components.test.tsx` | 部品（楽観的な更新・ダイアログ・`aria-invalid`・「読み直す」） | jsdom で描く。Server Action と `next/navigation` は偽物（`vi.mock`） |

- Next.js は、API を**サーバで**呼ぶので、第8部のように `fetch` を差し替えられません。そこで `test/servers.ts` が、偽の API（第8部の `fake-api.ts` と同じもの）を、本物の HTTP のサーバにします。
- 開発サーバは、`NEXT_DIST_DIR=.next-test` で起動します。自分で動かしている `npm run dev`（`.next`・9550）と、ぶつかりません。
- 最初の `pages.test.ts` は、ページを作るのに時間がかかります（1回目は 30 秒ほど）。

### 3.8 よく出るエラーと直し方

| エラー | 理由 | 直し方 |
| --- | --- | --- |
| 画面に「うまく表示できませんでした」、ターミナルに `fetch failed`（`ECONNREFUSED 127.0.0.1:9490`） | API が動いていない | 1.3節。練習用の API なら `API_URL` を付ける |
| `Only async functions are allowed to be exported in a "use server" file` | `actions.ts` から、関数でないもの（定数など）を `export` した | 型（`export type`）は出してよい。値は別のファイルに移す |
| `'server-only' cannot be imported from a Client Component module` | Client Component から `lib/api.ts` を import した | Client Component は、`actions.ts`（Server Action）を通して書き換える（第48章 4.1節） |
| ビルドや開発サーバで「`<Suspense>` の外で…」のエラー | `searchParams` や API を読む部品を、`<Suspense>` で包んでいない | 読む部品を、ページの中の `<Suspense>` に入れる（第50章 2節） |
| 412 の後、打った題名が消える | 412 でも `refresh()` を呼んでいる | 3.5節。412 のときは呼ばない |
| 保存した後、もう一度保存すると 412 | `bind` した `version` が古いまま | 成功したら `refresh()` を呼ぶ。`TaskForm` に `key={task.version}` を付ける |
| `pages.test.ts` が `next dev が起動しません` | ポート 9557 を、ほかのものが使っている | 前のテストが残っていないか確かめる（`lsof -i :9557`。第4部 第17章） |

---

## 4. 確かめ方

### 4.1 テスト

完成例のテストをコピーして、`npm run check` を動かします。

```sh
$ cp ~/dev/part09/project-task-next/solutions/test/* test/
$ npm run check
```

`npm run check` は、`tsc` → ESLint → テストの順に動き、どれかが失敗したら、そこで止まります。完成例では、次のように終わります。

```text
 Test Files  3 passed (3)
      Tests  34 passed (34)
```

### 4.2 目で確かめる

API を動かして（1.3節）、`npm run dev` で `http://localhost:9550/` を開き、次のことを確かめます。

- [ ] タスクを作る → 「作りました」が出る。締め切りに過ぎた日付を入れると、締め切りの横に理由が出て、打った値は残る
- [ ] 状態の条件と並べ方を変えて「絞り込む」 → URL が変わる。その URL を新しいタブで開いても、同じ一覧になる。戻るボタンで、前の条件に戻る
- [ ] タブを2つ開き、片方で完了にする → もう片方も変わる（SSE）
- [ ] 2つのタブで同じタスクを開き、片方で題名を変えて保存 → もう片方で（SSE で作り直される前に）保存すると「ほかの人が先に変えました」が出ることがある。打った値は残り、「読み直す」で新しい題名になる
- [ ] 作業中を4つにしようとすると、理由が出て、選ぶ欄が戻る
- [ ] マウスを使わず、Tab・Shift+Tab・Enter・Space・Esc だけで、作る・完了にする・消すができる
- [ ] DevTools の Network で、ページを開いたとき、ブラウザから API（9490）へのリクエストが無い（API を呼ぶのはサーバ）
- [ ] `npm run build` → `npm start` でも動く。ビルドの表で、`/` と `/tasks/[id]` が ◐、`/tasks/new` が ○ になっている（第50章 2節）

終わったら、コミットします（`next/` で打っても、リポジトリ全体が対象です）。

```sh
$ git add -A
$ git commit -m "画面を Next.js で作り直す"
```

---

## 5. 第8部（Vite + React）と比べる

同じ要件を、2つの作りで書きました。`web/` と `next/` のファイルを並べて開き、次の表の行ごとに見比べてください。

| | 第8部（`web/`、Vite + React） | 第9部（`next/`、Next.js） |
| --- | --- | --- |
| HTML を作る場所 | ブラウザ（最初の HTML は、ほぼ空の `<div id="root">`） | サーバ（中身の入った HTML が届く） |
| API を呼ぶ場所 | ブラウザ（Vite のプロキシで `/api` を中継） | Next.js のサーバ（`lib/api.ts` は `server-only`） |
| 読み込んだデータ | TanStack Query のキャッシュ（ブラウザのメモリ） | 覚えない。ページを開くたびにサーバが読む（理由は下） |
| 一覧の条件 | `useSearchParams` と `useState` | GET のフォームと、ページの `searchParams` |
| 続き | 「もっと読む」で足す（`useInfiniteQuery`） | 「次のページ」のリンク（URL にカーソル） |
| 書き換え | `useMutation` | Server Action と `useActionState` |
| 書き換えた後 | `setQueryData`・`invalidateQueries` | `refresh()`（ページを作り直す） |
| フォームの確かめ | ブラウザで Zod（送る前） | サーバで Zod（Server Action の中） |
| 2回送らない | `Idempotency-Key` | `useFormStatus` で押せなくする（3.3節） |
| 「作りました」 | 知らせる場所（`Announcer`）に入れる | URL（`?created=1`）で渡す（3.6節） |
| ページを移った知らせ | `PageTitle` で `h1` にフォーカス | Next.js の route announcer（新しいページの題名を読み上げる） |
| ほかの人の変更（SSE） | ブラウザが API につなぎ、キャッシュを「古い」にする | `/api/events` で中継し、`router.refresh()` |
| テスト | jsdom で画面全体を描く（`fetch` を差し替え） | 開発サーバを起動してページを読む＋Server Action と部品を別々に |
| 動かすもの | ビルドした静的なファイル（どこにでも置ける） | Node.js のサーバ（第12部） |

**データを覚えない理由**: タスクは、何人もが書き換え、412 で「先に変えた」を見つけるアプリです。古い中身を見せると、412 が増えます。そこで、第50章 8節の「迷ったときの順番」の1番目（何もしない）を選びました。ページの殻（枠・見出し・メニュー）だけはビルドのときに作られ（◐）、すぐに届きます。

どちらがよいかは、作るものによります。

- **Next.js が向く**: 最初の表示を速くしたい、検索エンジンに読ませたい、API の場所や鍵をブラウザに見せたくない
- **Vite + React が向く**: ログインした後だけ使う、操作が多い画面（表計算・お絵かきなど）。静的なファイルなので、置く場所を選ばない

## 6. もっとやるなら

- 冪等キーを付ける: `app/tasks/new/page.tsx` で `await connection()` の後に `crypto.randomUUID()` を作り、`<input type="hidden" name="key">` で `TaskForm` に渡す。`createTaskAction` は、それを `Idempotency-Key` で送る（3.3節）
- 一覧の数（「未着手 3・作業中 1・完了 1」）を、`'use cache'` と `cacheTag('tasks')` で覚えておき、Server Action で `updateTag('tasks')`、SSE の知らせで `revalidateTag` する（第50章 3・4節）
- 「次のページ」を、第8部と同じ「もっと読む」にする。2ページ目からは、Route Handler（`/api/tasks`。第49章 2.3節）を、Client Component から呼ぶ
- 題名の絞り込みを、打つたびに URL を変える形にする（第48章 6.2節の `useSearchParams` と `router.replace`）
- 第11部の予習: Playwright で、2つのタブで 412 を起こすテストを書く

## 7. Python で作るなら

Flask で同じ画面を作ると、この成果物とよく似た形になります。どちらも、**サーバが HTML を作り、フォームを POST で受けて、redirect する**からです。

| この成果物 | Python（Flask） |
| --- | --- |
| `app/tasks/[id]/page.tsx` | `@app.get('/tasks/<int:id>')` と Jinja2 のテンプレート |
| Server Action（`createTaskAction`） | `@app.post('/tasks')`。フォームの値を WTForms・pydantic で確かめる |
| `useActionState` で、エラーと打った値を返す | 失敗したら、同じテンプレートを、エラーと値を入れて描き直す |
| `redirect('/tasks/1?created=1')` | `flash('作りました')` と `redirect(url_for(...))` |
| `useOptimistic`・`router.refresh()` | htmx の `hx-post` と `hx-swap`。SSE は htmx の `sse` の拡張 |
| `lib/api.ts`（サーバから API を呼ぶ） | `httpx` で API を呼ぶ |
| 偽の API でテスト | Flask の `app.test_client()` と、`respx` などで `httpx` を偽物にする |

違うのは、Next.js では、**同じ部品が、サーバでもブラウザでも動く**ことです。Flask では、ブラウザで動く部分（楽観的な更新など）を、別に JavaScript（htmx）で書きます。

## 8. 次の部へ

- 第10部: ログインを足します。ログインのフォームは Server Action、Cookie はサーバで読みます。人ごとに違うページは、覚えません（第50章 8節）
- 第11部: ページのテスト・Server Action のテスト・API のテストを、GitHub Actions で、プッシュのたびに動かします。ブラウザを動かす E2E のテストも書きます
- 第12部: `next build` したアプリを、API と一緒にデプロイします

---

前の章: [第50章 レンダリングとキャッシュ](../ch50-rendering-cache/README.md) ／ 第9部の目次: [../README.md](../README.md)
