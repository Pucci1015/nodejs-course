# 第8部の成果物 タスク管理アプリの画面（React + TypeScript）

第7部で、タスク管理 API（`~/dev/task-api`）を TypeScript にしました。第8部のまとめとして、**この API を使う画面を、React と TypeScript で作ります**。

第39〜46章で学んだことを組み合わせます。Vite とプロキシ（第40章）、コンポーネントと state（第41・42章）、TanStack Query・フォーム・412・SSE（第43章）、ルーティングと URL の条件（第44章）、CSS とアクセシビリティ（第45章）、日付の表示（第46章）です。完成例のテスト（19 個）が通り、`npm run check`（`tsc` と ESLint とテスト）がエラー 0 で終われば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 8〜12時間 |
| 前提 | 第7部の成果物（`~/dev/task-api` のブランチ `part07-typescript`）、第39〜46章 |
| 作るもの | `~/dev/task-api/web/`。`npm run dev` で `http://localhost:5173/` に開く画面。`/api` は、第7部の API（`127.0.0.1:9490`）に中継する |
| 確かめ方 | `npm run check`。テストは完成例の [solutions/test/app.test.tsx](solutions/test/app.test.tsx)（19 個） |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`task-web` パッケージ）。偽の API で画面全体を確かめるテスト付き |

> **読み方**
> - 作業は、第7部で作った `~/dev/task-api` の中に `web/` というフォルダを作って行います。API と画面を、1つのリポジトリで管理します（1節）。
> - テストは、本物の API を使いません。`fetch` を偽の API（`solutions/test/fake-api.ts`）に置きかえて、画面だけを確かめます。だから、テストのときは PostgreSQL も API も要りません。
> - 画面を目で確かめるとき（4.2節）だけ、第7部の API を動かします。
> - テストは、ボタンや入力欄を**画面に出ている名前**で探します（第45章 5.3節）。2.1節の表の名前を、そのとおりに付けてください。
> - 一度に全部を書かず、3.2節の順番で、1つのページができるたびに `npm run dev` で開いて確かめてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| API の応答を Zod で確かめ、型の付いた関数にまとめる | 第9部（Next.js のサーバ側からも、同じように API を呼ぶ） |
| 一覧・詳しい画面・作る・直す・消すの画面を、URL で分ける | 第9部（Next.js では、フォルダの形が URL になる） |
| 412・409・422 を、利用者に分かる言葉にする | 第10部（ログインが切れた 401 も、同じように画面で扱う） |
| 画面全体のテストを、偽の API で書く | 第11部（テストの層を分ける。E2E のテストでは本物の API を使う） |
| `npm run build` で、配るファイルを作る | 第12部（ビルドした画面を、API と一緒にデプロイする） |

---

## 1. 準備

### 1.1 ブランチを作る

第7部の完成した形を残しておくため、新しいブランチで作業します（第1部 第3章）。

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part07-typescript       # 第7部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part08-web           # 新しいブランチを作って、そこに移る
```

### 1.2 web フォルダと、設定のファイル

画面のパッケージは、API とは別の `package.json` を持ちます。API は Node.js で動き、画面はブラウザで動くので、要るパッケージも `tsconfig.json` の設定（第40章 6節）も違うからです。

設定のファイルは、完成例からコピーします。`P=~/dev/part08` としておくと、短く書けます。

```sh
$ mkdir web
$ cd web
$ P=~/dev/part08/project-task-web/solutions
$ cp $P/package.json $P/package-lock.json $P/tsconfig.json $P/eslint.config.js $P/vite.config.ts $P/index.html $P/.gitignore .
$ npm ci
```

- `mkdir web` は、`web` というフォルダを作るコマンドです。
- `npm ci` は、`package-lock.json` に書かれたとおりの版を入れるコマンドです（第3部 第14章）。版は、第8部の章で使ったものと同じです。

コピーしたファイルの中身は、次のとおりです。どれも、章で書いたものと同じ形です。

| ファイル | 中身 |
| --- | --- |
| `package.json` | `scripts` に `dev`・`build`・`preview`・`typecheck`・`lint`・`test`・`check`。`check` は、`tsc` → ESLint → テストの順に動かす |
| `tsconfig.json` | 第8部の `tsconfig.base.json` と同じ設定に、`"include": ["src", "test", "vite.config.ts"]` を足したもの |
| `eslint.config.js` | 第42章 3.5節と同じ（Hooks の決まりを見張る） |
| `vite.config.ts` | `/api` を `127.0.0.1:9490`（第7部の API）に中継する（第40章 5節）。`API_TARGET=… npm run dev` で、中継先を変えられる |
| `index.html` | `<div id="root">` と、`/src/main.tsx` を読む `<script>` |
| `.gitignore` | `node_modules/` と `dist/`（ビルドしたもの）をコミットしない |

`src/` と `test/` は、自分で作ります。

```sh
$ mkdir -p src/api src/components src/pages src/lib test
```

- `mkdir -p` は、途中のフォルダもまとめて作るオプションです。

### 1.3 API を動かす

画面を目で確かめるときは、第7部の API を動かしておきます。ターミナルをもう1つ開いて、次を打ちます。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)   # PostgreSQL
$ cd ~/dev/task-api
$ npm start                                          # http://127.0.0.1:9490/api/tasks
```

- 止めるときは `Ctrl+C` です。PostgreSQL は `(cd ~/dev/part06 && docker compose stop)` で止めます。
- データベースを使わずに試したいときは、第8部の練習用の API（`~/dev/part08` で `npm run api`。`127.0.0.1:9500`）を使い、画面を `API_TARGET=http://127.0.0.1:9500 npm run dev` で動かします。

---

## 2. 要件

### 2.1 ページと、画面に出す名前

テストは、ここに書いた名前で探します。名前は、`<label>` の文字・ボタンの文字・`aria-label` で付けます（第45章 5.3節・6.1節）。

| URL | ページ | 要るもの（名前） |
| --- | --- | --- |
| どのページにも | 枠 | リンク「本文へ」（`href="#main"`）、`<nav aria-label="メニュー">` の中にリンク「一覧」「新しいタスク」、`<main id="main">`、知らせる場所（`role="status"`） |
| `/` | 一覧 | 見出し（`h1`）「タスク一覧」。`<fieldset>` の `<legend>` が「状態」で、チェックボックス「未着手」「作業中」「完了」。選ぶ欄「並べ方」（選ぶものは「締め切りが近い順」「新しい順」「古い順」「題名順」）。検索の欄「題名で絞り込む」（`type="search"`）。タスクごとに `<li>` で、チェックボックス「完了（題名）」と、題名のリンク（`/tasks/:id` へ）。続きがあればボタン「もっと読む」。1つも無ければ「タスクはありません」 |
| `/tasks/new` | 作る | 見出し「新しいタスク」。入力欄「題名」「締め切り」（`type="date"`）、ボタン「作る」 |
| `/tasks/:id` | 1つのタスク | 見出しはタスクの題名。選ぶ欄「状態」（「未着手」「作業中」「完了」）。入力欄「題名」「締め切り」、ボタン「保存」。ボタン「消す」 |
| ほか（無いタスク・`/tasks/abc` も） | 見つからない | 見出し「ページが見つかりません」 |

### 2.2 一覧

- 第7部の API の `GET /api/tasks` で、20 件ずつ読む。`nextCursor` があれば「もっと読む」で続きを足す（3.3節）
- 状態・並べ方・題名の絞り込みは、URL の検索パラメータに置く（第44章 4節）。`/?status=todo,doing&sort=title&q=牛乳` のように書き、開いたときも URL の条件で出す。知らない値は捨てる
  - 並べ方の既定は「締め切りが近い順」（`dueDate`）。URL には書かないが、API にはいつも `sort` を送る（API の既定は `-createdAt` で、違うので）
  - API に送る順は `status`・`sort`・`limit`・`cursor`（例: `/api/tasks?status=done&sort=title&limit=20`）
  - 題名の絞り込みは、API に無いので、読み込んだものの中から探す。大文字と小文字は区別しない
- 終わっていないタスクには、締め切りまでの日数を出す: 「今日まで」「明日まで」「あと N 日」「N 日過ぎています」。「今日」は日本の日付（第46章 4.3節）
- 「完了（題名）」のチェックで、完了と未着手を切り替える。応答を待たずにチェックを変え（楽観的な更新。第43章 4.2節）、失敗したら戻して、理由を `role="alert"` で出す。成功したら「「題名」を完了にしました」か「「題名」を未着手に戻しました」と知らせる（第45章 7節）

### 2.3 作る

- 送る前に、Zod で確かめる（第43章 5.1節）。題名が空なら送らず、題名の横に「題名を入れてください」と出し、`aria-invalid` と `aria-describedby` でつなぐ（第45章 6.2節）
- 送るときは `Idempotency-Key` に `crypto.randomUUID()` を入れる（2回押しても、タスクは1つ）
- API が 422 を返したら、その項目の横に、API の文を出す（第43章 5.3節。締め切りが過ぎた日付など）
- 作れたら、そのタスクのページに移り、「「題名」を作りました」と知らせる

### 2.4 1つのタスク

- 作った日時・変えた日時（完了していれば完了した日時も）を、日本の時刻で出す
- 「状態」を変えたら、すぐに送る。API が断ったら（409。作業中は3個まで、など）、理由を `role="alert"` で出し、選ぶ欄は元のまま
- 「保存」は、**変わった項目だけ**を送る（締め切りが過ぎたタスクでも、題名だけなら直せるように）
- 変えるときも消すときも、`If-Match` に、読んだときの `version` を入れる。ほかの人が先に変えていたら（412）、「ほかの人が先に変えました」と出し、ボタン「読み直す」で新しい中身にする（第43章 6節）
- 「消す」は、ダイアログ（「「題名」を消しますか」）で確かめてから消す。ダイアログを開いたら、フォーカスは「キャンセル」に置く（第45章 8節）。消したら一覧に戻り、「「題名」を消しました」と知らせる
- 無いタスク（404）・数字でない id は、「ページが見つかりません」

### 2.5 どのページにも

- ほかのタブや人が変えたら、SSE（`/api/events`）で知らせてもらい、読み直す（第43章 7節）
- ページを移ったら、そのページの `h1` にフォーカスを移す（3.6節）
- 色は CSS 変数にまとめ、OS の設定が暗い色なら暗い色にする（第45章 3節）。フォーカスの枠を消さない（第45章 5.4節）

### 2.6 型とコード

- `npm run typecheck`（`tsc`）と `npm run lint`（ESLint）が、エラー 0 で終わる
- `src/` に `any` を書かない。API の応答は、Zod で確かめてから使う
- `src/routes.tsx` が、URL とページの対応表を `export const routes: RouteObject[]` で出す（テストが `createMemoryRouter(routes)` で使う。3.7節）
- 知らせる場所（`AnnouncerProvider`）は、対応表の一番外のページ（枠）の中に置く。テストは、`QueryClientProvider` と `RouterProvider` だけで包むので

---

## 3. 作り方のヒント

### 3.1 ファイルの分け方

```text
web/
├── package.json  tsconfig.json  eslint.config.js  vite.config.ts  index.html
├── src/
│   ├── main.tsx              … 入り口。QueryClient・ルーター・StrictMode
│   ├── routes.tsx            … URL とページの対応表
│   ├── Layout.tsx            … 枠。「本文へ」・メニュー・<main>・知らせる場所・SSE
│   ├── index.css             … 全体の CSS（CSS 変数）
│   ├── filters.ts            … 一覧の条件と、URL の行き来
│   ├── useFilters.ts         … 条件を URL に持つフック
│   ├── api/
│   │   ├── schemas.ts        … Task・Page・フォームの決まり（Zod）
│   │   ├── client.ts         … API を呼ぶ関数と ApiError
│   │   └── queries.ts        … TanStack Query のフック
│   ├── lib/   dates.ts  errors.ts
│   ├── components/  TaskForm.tsx  TaskItem.tsx（+ .module.css）  FilterBar.tsx  ConfirmDialog.tsx  Announcer.tsx  PageTitle.tsx
│   └── pages/  TaskListPage.tsx  NewTaskPage.tsx  TaskDetailPage.tsx  NotFoundPage.tsx  ErrorPage.tsx
└── test/
    ├── fake-api.ts           … 完成例からコピー
    └── app.test.tsx          … 完成例からコピー
```

章の練習問題で書いたものが、そのまま使えます。

| ファイル | 元にするもの |
| --- | --- |
| `api/schemas.ts`・`api/client.ts` | 第43章の `schemas.ts`・`api.ts`。`Task` に `createdAt`・`updatedAt`・`completedAt`・`version` を足す（第7部の `types.ts` と同じ形） |
| `filters.ts`・`useFilters.ts` | 第44章 4節・練習問題1 |
| `components/ConfirmDialog.tsx`・`Announcer.tsx` | 第45章 練習問題6・5 |
| `components/TaskForm.tsx` | 第43章 5.2節と、第45章 6.2節・練習問題3 |
| `lib/dates.ts` | 第46章 練習問題7（`todayIn`・日数の差） |

### 3.2 進める順番

1. `api/schemas.ts` → `api/client.ts`（ここまでは画面が無いので、`npx tsc` で確かめる）
2. `routes.tsx`・`Layout.tsx`・`main.tsx`・`pages/NotFoundPage.tsx` → `npm run dev` で開いて、メニューで移れること
3. `filters.ts` → `api/queries.ts` の一覧 → `pages/TaskListPage.tsx`（まずは1ページ目だけ）
4. 「もっと読む」と、チェックで完了（楽観的な更新）
5. `components/TaskForm.tsx` → `pages/NewTaskPage.tsx`
6. `pages/TaskDetailPage.tsx`（状態 → 保存 → 412 → 消す）
7. SSE・見出しへのフォーカス・CSS
8. テストをコピーして、`npm run check`（4節）。途中でも、`npx vitest run -t "一覧"` のように、名前に「一覧」が入るテストだけを動かせる

### 3.3 「もっと読む」: useInfiniteQuery

第43章の `useQuery` は、1つのキーに1つの応答でした。続きを足していく一覧には、`useInfiniteQuery` を使います。

```ts
export function useTaskList(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['tasks', 'list', { statuses: filters.statuses, sort: filters.sort }],
    queryFn: ({ pageParam, signal }) => listTasks(filters, pageParam, signal),
    initialPageParam: null as string | null,    // 1ページ目は、カーソル無し
    getNextPageParam: (last: Page) => last.nextCursor, // null なら「もう無い」
  });
}
```

- `data.pages` は、読んだページの配列です。`data.pages.flatMap((p) => p.items)` で、1つの配列にします。
- `hasNextPage` が `true` のときだけ「もっと読む」を出し、押したら `fetchNextPage()` を呼びます。
- キーに `q`（題名の絞り込み）を入れないのは、API に送らないからです。入れると、1文字打つたびに読み直します。

### 3.4 楽観的な更新を、全部の一覧に

条件ごとに一覧のキャッシュがあるので（`['tasks', 'list', {…}]` がいくつも）、第43章 4.2節の `getQueryData`・`setQueryData` の代わりに、キーの頭が合うもの全部を扱う `getQueriesData`・`setQueriesData` を使います。

```ts
onMutate: async (task) => {
  await queryClient.cancelQueries({ queryKey: ['tasks', 'list'] });
  const previous = queryClient.getQueriesData<InfiniteData<Page>>({ queryKey: ['tasks', 'list'] }); // [キー, データ] の配列
  queryClient.setQueriesData<InfiniteData<Page>>({ queryKey: ['tasks', 'list'] }, (data) => /* そのタスクだけ置きかえる */);
  return { previous };
},
onError: (_error, _task, context) => {
  for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data); // 全部戻す
},
```

### 3.5 412 と「読み直す」

- 保存が 412 で失敗したら、`useMutation` の `error` が `ApiError`（`status === 412`）になります。そのときだけ「読み直す」を出し、押したら `useTask` の `refetch()` を呼びます。
- 読み直すと、`version` が変わります。フォームを `key={task.version}` で包むと、`version` が変わったときにフォームが作り直され、入力欄が新しい中身で始まります（第41章 4節の key と同じ働き）。
- 422 はフォームが項目の横に出し、412・409 はページの上の `role="alert"` に出す、のように、どこに出すかを決めておきます。

### 3.6 ページを移ったら、見出しにフォーカス

ふつうのリンクでは、ブラウザがページを読み直すので、スクリーンリーダーは新しいページの名前を読みます。React Router はページを読み直さないので、そのままでは、目の見えない人に「ページが替わった」ことが伝わりません。そこで、見出しの部品を作り、ページを移ってきたら、そこにフォーカスを移します。

```tsx
export function PageTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname, key } = useLocation();
  useEffect(() => {
    if (key !== 'default') ref.current?.focus(); // 最初に開いたページの key は 'default'
  }, [pathname]); // 同じページで条件（?status=…）を変えたときは、動かさない
  return <h1 ref={ref} tabIndex={-1}>{children}</h1>; // tabIndex={-1}: Tab では止まらないが、focus() はできる
}
```

ESLint（`react-hooks/exhaustive-deps`）は「`key` が依存配列に無い」と注意します。ここは、わざと `pathname` だけにしているので、理由をコメントに書いて、その行だけ注意を止めます（完成例の `components/PageTitle.tsx`）。

### 3.7 テストのしくみ

`test/app.test.tsx` は、ページごとに次のように描きます。

```tsx
const api = createFakeApi([{ title: '牛乳を買う', dueDate: '2026-12-10' }]); // 偽の API と、最初のタスク
vi.stubGlobal('fetch', vi.fn(api.fetch));                                   // fetch を偽の API にする
const router = createMemoryRouter(routes, { initialEntries: ['/tasks/1'] }); // URL を決めて開く（アドレスバーの代わり）
render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
```

- `createMemoryRouter` は、ブラウザの URL を使わず、メモリの上に URL を持つルーターです。テストのたびに、好きな URL から始められます。
- 「今日」は、`vi.setSystemTime` で 2026年12月10日（日本の時刻）に決めています。
- jsdom（第42章）には、`EventSource` と、ダイアログの `showModal` がありません。テストの最初で、何もしない偽物を置いています。

### 3.8 よく出るエラーと直し方

| エラー | 理由 | 直し方 |
| --- | --- | --- |
| 画面に `Failed to fetch`、ターミナルに `ECONNREFUSED 127.0.0.1:9490` | API が動いていない | 1.3節。練習用の API なら `API_TARGET` を付ける |
| テストが `Unable to find role="checkbox" and name "完了（牛乳を買う）"` | 名前が違う（全角の括弧、空白など） | 2.1節の表のとおりにする。`screen.debug()` で、テストの中の画面を出せる |
| 一覧の並びが、テストの期待と違う | API に `sort` を送っていない（API の既定は新しい順） | 2.2節。`listTasks` で、いつも `sort` を送る |
| 状態を変えた後に保存すると、いつも 412 | 古い `version` で送っている | 成功したら、返ってきたタスク（新しい `version`）で、キャッシュを置きかえる（`setQueryData`） |
| ESLint `Promises must be awaited`（`onClick={() => list.fetchNextPage()}`） | Promise を捨てている | 待たないなら `void list.fetchNextPage()` と書く（第37章 6節） |
| ESLint `Calling setState synchronously within an effect` | エフェクトの中で state を作っている | 描画の中で計算する（第42章 4節） |

---

## 4. 確かめ方

### 4.1 テスト

完成例のテストをコピーして、`npm run check` を動かします。

```sh
$ cp ~/dev/part08/project-task-web/solutions/test/fake-api.ts ~/dev/part08/project-task-web/solutions/test/app.test.tsx test/
$ npm run check
```

`npm run check` は、`tsc` → ESLint → テストの順に動き、どれかが失敗したら、そこで止まります。完成例では、次のように終わります。

```text
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

### 4.2 目で確かめる

API を動かして（1.3節）、`npm run dev` で `http://localhost:5173/` を開き、次のことを確かめます。

- [ ] タスクを作る → 一覧に出る。締め切りに過ぎた日付を入れると、締め切りの横に理由が出る
- [ ] 状態の条件と並べ方を変える → URL が変わる。その URL を新しいタブで開いても、同じ一覧になる。戻るボタンで、前の条件に戻る
- [ ] タブを2つ開き、片方で完了にする → もう片方も変わる（SSE）
- [ ] 2つのタブで同じタスクを開き、片方で題名を変えて保存 → もう片方で（SSE で読み直される前に）保存すると「ほかの人が先に変えました」が出ることがある。「読み直す」で新しい題名になる
- [ ] 作業中を4つにしようとすると、理由が出る
- [ ] マウスを使わず、Tab・Shift+Tab・Enter・Space・Esc だけで、作る・完了にする・消すができる。フォーカスの枠が見える
- [ ] DevTools の Lighthouse（第45章 10節）の Accessibility で、指摘が無い
- [ ] `npm run build` → `npm run preview` で `http://localhost:4173/` を開いても動く。`/tasks/1` を直接開いても動く（第44章 2.4節）

終わったら、コミットします（`web/` で打っても、リポジトリ全体が対象です）。

```sh
$ git add -A
$ git commit -m "画面を作る"
```

## 5. もっとやるなら

- 一覧に「締め切りが過ぎたものだけ」を足す。API の `due_before` を使う（`/api/tasks?due_before=2026-12-10`）
- 題名の絞り込みを API でできるようにする（第7部の API に `q` を足し、SQL の `ILIKE`）。画面は、打ち終わってから送るように、第42章 練習問題8の `useDebounce` を使う
- タスクの画面の右上に「前のタスク」「次のタスク」のリンクを付ける。キャッシュにある一覧から探す
- `@tanstack/react-query-devtools` を入れて、キャッシュの中身を見る
- 第45章の `ThemePicker` を付け、明るい色・暗い色を自分で選べるようにする
- `TaskListPage` を `React.lazy` で分けて、ビルドしたファイルが2つに分かれることを確かめる（第40章 7.2節）

## 6. Python で作るなら

Flask で同じ画面を作るなら、Jinja2 のテンプレートで、サーバが HTML を作ります。

| この成果物 | Python（Flask） |
| --- | --- |
| React の部品 | Jinja2 のテンプレートと `{% include %}`・`{% macro %}` |
| URL とページの対応表（`routes.tsx`） | `@app.route('/tasks/<int:id>')`。ページを移るたびに、サーバが HTML を返す |
| TanStack Query のキャッシュ | 無い（毎回サーバが読む）。部分だけ変えたいなら htmx |
| 楽観的な更新・SSE | htmx の `hx-swap`・`sse` の拡張 |
| Zod でフォームを確かめる | WTForms・pydantic。画面とサーバで同じ決まりを使うのは、Python だけでは難しい（ブラウザで Python が動かないので） |
| 偽の API でテスト | Flask の `app.test_client()` と、データの層を偽物にする |

## 7. 次の部へ

- 第9部: Next.js で、この画面をサーバでも描けるようにします（第46章で自分で作った SSR を、フレームワークに任せる）
- 第10部: ログインを足します。画面は、401 のときにログインのページへ移ります
- 第11部: この画面のテストと API のテストを、GitHub Actions で、プッシュのたびに動かします。ブラウザを動かす E2E のテストも書きます
- 第12部: `npm run build` した画面を、API と一緒にデプロイします

---

前の章: [第46章 フルスタックフレームワークの考え方](../ch46-fullstack/README.md) ／ 第8部の目次: [../README.md](../README.md)
