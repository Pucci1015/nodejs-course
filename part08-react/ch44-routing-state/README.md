# 第44章 ルーティングと状態の設計

第43章の画面は、1つのページに全部が並んでいました。本物の画面は、「一覧」「1つのタスクの詳しいページ」「新しいタスク」のように、URL ごとにページが分かれています。この章では、**React Router** で URL とページを対応させます。そのうえで、「絞り込みの条件は URL に置く」「アプリ全体の設定は Context で配る」のように、**state をどこに置くか**を決める考え方を学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第43章 |
| この章のゴール | React Router で URL とページを対応させ、共通の枠（`Outlet`）を作れる / `:id` のような URL のパラメータを読み、確かめられる / 絞り込みの条件を検索パラメータに持てる / `Link`・`NavLink`・`useNavigate` で移れる / 見つからないページとエラーのページを出せる / state の置き場所を選べる / Context で値を配れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch44-routing-state/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch44-routing-state
>   ```
>
> - 第43章と同じように、もう1つのターミナルで練習用の API（`cd ~/dev/part08` → `npm run api`）を動かしておきます。
> - React Router は、第8部のフォルダに入っています（パッケージの名前は `react-router`）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| URL とページの対応（2・3節） | 第8部の成果物、第46章（サーバで URL からページを作る）、第9部（Next.js のフォルダがそのまま URL になる仕組み） |
| 条件を URL に置く（4節） | 第8部の成果物（絞り込み・並べ方を URL に置く） |
| 本番のサーバで `index.html` を返す（2.4節） | 第12部（画面を配る設定） |
| state の置き場所（6節） | 第8部の成果物、第9部 |
| Context（7節） | 第45章（テーマ）、第10部（ログインしている人） |

---

## 1. 準備: 第43章の部品を持ってくる

```sh
$ mkdir -p app/src/pages
$ cp ../ch43-data-forms/app/{vite.config.ts,tsconfig.json,index.html} app/
$ cp ../ch43-data-forms/app/src/schemas.ts app/src/
$ cd app
```

- `{vite.config.ts,tsconfig.json,index.html}` は、シェルが `vite.config.ts tsconfig.json index.html` の3つに広げてくれる書き方です（ブレース展開）。
- `index.html` の `<title>` は `タスク管理` に変えます。

`app/src/api.ts` は、第43章の `api.ts` に、1つのタスクを読む `getTask` と、並べ方を選べる `listTasks` を足したものです。

```ts
import { z } from 'zod';
import { PageSchema, TaskSchema, type Status, type Task, type TaskInput } from './schemas.ts';

const ProblemSchema = z.object({
  title: z.string().optional(),
  detail: z.string().optional(),
  errors: z.array(z.object({ pointer: z.string().optional(), parameter: z.string().optional(), detail: z.string() })).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

export async function listTasks(status: Status | 'all', sort: string, signal?: AbortSignal): Promise<Task[]> {
  const q = new URLSearchParams({ sort, limit: '100' });
  if (status !== 'all') q.set('status', status);
  return PageSchema.parse(await request(`/tasks?${q}`, { signal })).items;
}

export async function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${id}`, { signal }));
}

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
}
```

`app/src/queries.ts` は、第43章の `queries.ts` から、この章で使う読む部分と作る部分を持ってきて、`useTask(id)` を足したものです。キャッシュのキーに、並べ方（`sort`）も入れています。

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, getTask, listTasks } from './api.ts';
import type { Status, TaskInput } from './schemas.ts';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (status: Status | 'all', sort: string) => ['tasks', 'list', { status, sort }] as const,
  detail: (id: number) => ['tasks', 'detail', id] as const,
};

export function useTasks(status: Status | 'all', sort: string) {
  return useQuery({
    queryKey: taskKeys.list(status, sort),
    queryFn: ({ signal }) => listTasks(status, sort, signal),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => getTask(id, signal),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
```

---

## 2. URL とページを対応させる

### 2.1 1つの HTML で、いくつものページ

Flask では、`/tasks` と `/tasks/2` は別々のリクエストで、サーバがそれぞれの HTML を作って返しました。React の画面は、**HTML は `index.html` の1つだけ**で、JavaScript が URL を見て、どのページの部品を出すかを決めます（**SPA**、Single Page Application）。

| 場面 | 起きること |
| --- | --- |
| 最初にページを開く | サーバは、どの URL でも `index.html` を返す。JavaScript が URL を読んで、そのページを出す |
| ページの中のリンクを押す | サーバには聞かずに、JavaScript がアドレス欄の URL を変え（History API）、部品を差し替える。速く、state やキャッシュも残る |
| ブラウザの「戻る」 | JavaScript が、前の URL のページに差し替える |

これを受け持つのが React Router です。

### 2.2 手を動かす: 対応表と、共通の枠

`app/src/router.tsx` を作ります。ページの部品は、この後で作ります。

```tsx
import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { NewTaskPage } from './pages/NewTaskPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { TaskDetailPage } from './pages/TaskDetailPage.tsx';
import { TaskListPage } from './pages/TaskListPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    // 子のルートのページは、Layout の <Outlet /> の場所に出る
    children: [
      { index: true, element: <TaskListPage /> }, // / そのもの
      { path: 'tasks/new', element: <NewTaskPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> }, // どれにも合わなかったとき
    ],
  },
]);
```

- `createBrowserRouter([…])` に、URL（`path`）と出す部品（`element`）の表を渡します。
- `children` の中のルートは、親の `path` の続きです。`tasks/:id` は `/tasks/:id` になります。`index: true` は、親の URL そのもの（`/`）のときに出すページです。
- 子のページは、親の部品（`Layout`）の中の `<Outlet />` の場所に出ます。メニューのような、どのページにも出す部分は、親に1回だけ書けば済みます。
- `path: '*'` は、ほかのどれにも合わなかったときです。React Router は、書いた順ではなく、より細かく合うもの（`tasks/new` は `tasks/:id` より細かい）を選びます。

`app/src/Layout.tsx` を作ります（`useSettings` と、チェックボックスの2つは7節で説明します。先に書いてかまいません）。

```tsx
import { NavLink, Outlet } from 'react-router';
import { useSettings } from './settings.tsx';

export function Layout() {
  const { settings, update } = useSettings();
  return (
    <div className={settings.dark ? 'dark' : undefined} style={{ background: settings.dark ? '#222' : '#fff', color: settings.dark ? '#eee' : '#000', minHeight: '100vh' }}>
      <header>
        <nav>
          {/* NavLink は、今のページへのリンクに aria-current="page" を付ける */}
          <NavLink to="/" end>一覧</NavLink> | <NavLink to="/tasks/new">新しいタスク</NavLink> | <NavLink to="/about">この画面について</NavLink>
        </nav>
        <label>
          <input type="checkbox" checked={settings.dark} onChange={(e) => update({ dark: e.target.checked })} /> 暗い色
        </label>{' '}
        <label>
          <input type="checkbox" checked={settings.compact} onChange={(e) => update({ compact: e.target.checked })} /> 詰めて表示
        </label>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

`app/src/main.tsx` を作ります。`RouterProvider` に、作った `router` を渡します。

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router.tsx';
import { SettingsProvider } from './settings.tsx';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

### 2.3 見つからないページ、エラーのページ

`app/src/pages/` に、中身の決まった3つのページを作ります。

```tsx
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section>
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">一覧へ戻る</Link>
      </p>
    </section>
  );
}
```

```tsx
export function AboutPage() {
  return (
    <section>
      <h1>この画面について</h1>
      <p>第8部 第44章の、ルーティングの練習の画面です。</p>
    </section>
  );
}
```

```tsx
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error);
  return (
    <section role="alert">
      <h1>問題が起きました</h1>
      <p>{message}</p>
      <Link to="/">一覧へ戻る</Link>
    </section>
  );
}
```

- `NotFoundPage` は、`*` のルートと、3節の「無いタスク」で使います。
- `ErrorPage` は、ルートの `errorElement` に渡しています。ページを描いている途中で例外が投げられると、React Router は、そのルートのかわりに `errorElement` を出します。`useRouteError()` で、投げられたものを受け取れます。画面全体が真っ白になるのを防ぐ、最後の受け止め役です。

### 2.4 本番では、サーバが index.html を返す

`npx vite`（と `npx vite preview`）は、ファイルの無い URL（`/tasks/2`）にも `index.html` を返してくれます。本番で `dist` を配るサーバ（nginx や、クラウドの配信の仕組み）では、これを自分で設定します。設定しないと、リンクで移るのはうまくいくのに、そのページで読み込み直すと 404 になります（練習問題4の問6）。第12部で、配るときの設定として扱います。

---

## 3. URL のパラメータ: useParams

`tasks/:id` の `:id` は、URL のその場所の文字を受け取る**パラメータ**です。`app/src/pages/TaskDetailPage.tsx` を作ります。

```tsx
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api.ts';
import { useTask } from '../queries.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

export function TaskDetailPage() {
  const { id } = useParams();
  // URL は文字。数字だけでなければ、そのタスクは無い
  const taskId = id !== undefined && /^[1-9][0-9]{0,8}$/.test(id) ? Number(id) : null;
  if (taskId === null) return <NotFoundPage />;
  return <TaskDetail id={taskId} />;
}

function TaskDetail({ id }: { id: number }) {
  const task = useTask(id);
  const navigate = useNavigate();
  if (task.isPending) return <p>読み込み中…</p>;
  if (task.isError) {
    if (task.error instanceof ApiError && task.error.status === 404) return <NotFoundPage />;
    return <p role="alert">読み込めませんでした: {task.error.message}</p>;
  }
  const t = task.data;
  return (
    <article>
      <h1>{t.title}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{t.status}</dd>
        <dt>締め切り</dt>
        <dd>{t.dueDate ?? 'なし'}</dd>
      </dl>
      <Link to="/">一覧へ</Link>{' '}
      {/* -1 は「1つ前の履歴へ」。ブラウザの戻るボタンと同じ（絞り込んだ一覧に、そのまま戻れる） */}
      <button type="button" onClick={() => void navigate(-1)}>戻る</button>
    </article>
  );
}
```

- `useParams()` は `{ id: '2' }` のように、パラメータを**文字で**返します。URL は、利用者がアドレス欄で自由に書き換えられるので、数字だけかを確かめてから数にします（`/tasks/abc` は「見つかりません」）。
- 確かめた後の `id` を受け取る部品（`TaskDetail`）を分けています。フック（`useTask`）は、`if` で `return` した後には書けない（第42章 3.5節）ので、確かめる部品と、読む部品を分けるのがよくある形です。
- API が 404 を返したとき（`/tasks/999`）も、「見つかりません」を出します。

ここまでで、`router.tsx` の、まだ無いページ（`TaskListPage`・`NewTaskPage`）の行をコメントにし、`Layout.tsx` と `main.tsx` が使う `app/src/settings.tsx` を、7.2節のとおりに先に作れば、`npx vite` で動かせます。http://localhost:5173/tasks/2 、/tasks/abc 、/zzz を開いて確かめます。

---

## 4. 絞り込みの条件は、URL に置く

### 4.1 なぜ URL に置くのか

第43章の一覧の絞り込み（「完了」だけ）は、`useState` に持っていました。すると、次のことができません。

- 「完了」で絞り込んだまま読み込み直すと、「すべて」に戻ってしまう。
- 「完了」の一覧の URL を、ほかの人に送れない。ブックマークもできない。
- 詳しいページへ移ってから「戻る」と、絞り込みが消えている。

絞り込み・並べ方・検索の文字・ページの番号のように、「**何を見ているか**」を決める条件は、URL の検索パラメータ（`?status=done&sort=title`）に置きます。URL が、その画面の state そのものになります。

### 4.2 手を動かす: 条件と URL の行き来

`app/src/filters.ts` を作ります。React も React Router も使わない、普通の関数です。

```ts
import { STATUSES, type Status } from './schemas.ts';

export const SORTS = { dueDate: '締め切り順', '-createdAt': '新しい順', title: '題名順' } as const;
export type SortKey = keyof typeof SORTS;
export type Filters = { status: Status | 'all'; sort: SortKey; q: string };

export const DEFAULT_FILTERS: Filters = { status: 'all', sort: 'dueDate', q: '' };

const isStatus = (v: string | null): v is Status => STATUSES.some((s) => s === v);
const isSort = (v: string | null): v is SortKey => v !== null && Object.hasOwn(SORTS, v);

// URL は利用者が書き換えられるので、知らない値は決まりの値にする
export function parseFilters(params: URLSearchParams): Filters {
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    status: isStatus(status) ? status : 'all',
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    q: params.get('q') ?? '',
  };
}

// 決まりの値は URL に書かない（/ と /?status=all が、同じ画面なのに別の URL にならないように）
export function toSearchParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status !== 'all') p.set('status', f.status);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  if (f.q !== '') p.set('q', f.q);
  return p;
}
```

- URL は外から来る値なので、API の入力と同じように確かめます。知らない値は、エラーにせず、決まりの値にします（古いブックマークや、書きまちがいの URL でも、画面は出るように）。
- 決まりの値は URL に書きません。`/` と `/?status=all` のように、同じ画面に URL が2つあると、キャッシュや「今のページ」の見分けがややこしくなるからです。

### 4.3 手を動かす: useFilters

`app/src/useFilters.ts` を作ります。

```ts
import { useSearchParams } from 'react-router';
import { parseFilters, toSearchParams, type Filters } from './filters.ts';

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);

  function setFilters(patch: Partial<Filters>, options?: { replace?: boolean }) {
    // 更新関数の形（第42章 2.3節）。prev は「今の URL」の検索パラメータ
    setParams((prev) => toSearchParams({ ...parseFilters(prev), ...patch }), options);
  }

  return [filters, setFilters] as const;
}
```

- `useSearchParams()` は、`[今の検索パラメータ, 変える関数]` を返します。`useState` と同じ形です。変える関数を呼ぶと、URL が変わり、それを使う部品が描き直されます。
- 変える関数に、更新関数 `(prev) => 次の値` を渡しています（第42章 2.3節と同じ考え方）。素早く続けて変えたときも、「今の URL」から次の URL を作るので、前の変更を消しません。
- `{ replace: true }` を付けると、履歴を増やさずに、今の履歴の URL を書き換えます。

`app/src/pages/TaskListPage.tsx` を作り、`router.tsx` のコメントを外します。

```tsx
import { Link } from 'react-router';
import { SORTS, type Filters, type SortKey } from '../filters.ts';
import { useTasks } from '../queries.ts';
import { useSettings } from '../settings.tsx';
import { useFilters } from '../useFilters.ts';

const STATUS_LABELS: Record<Filters['status'], string> = { all: 'すべて', todo: '未着手', doing: '作業中', done: '完了' };

export function TaskListPage() {
  const [filters, setFilters] = useFilters();
  const tasks = useTasks(filters.status, filters.sort);
  const { settings } = useSettings();
  // 検索の文字での絞り込みは、API に無いので画面で行う（計算できるので state にしない）
  const q = filters.q.trim().toLowerCase();
  const shown = tasks.data?.filter((t) => t.title.toLowerCase().includes(q));

  return (
    <section>
      <h1>タスク</h1>
      <div>
        {(Object.keys(STATUS_LABELS) as Filters['status'][]).map((s) => (
          <button key={s} type="button" aria-pressed={s === filters.status} onClick={() => setFilters({ status: s })}>
            {STATUS_LABELS[s]}
          </button>
        ))}{' '}
        <select aria-label="並べ方" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })}>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORTS[k]}
            </option>
          ))}
        </select>{' '}
        {/* 1文字ごとに履歴を増やさないように、replace で今の履歴を書き換える */}
        <input aria-label="検索" value={filters.q} onChange={(e) => setFilters({ q: e.target.value }, { replace: true })} />
      </div>
      {tasks.isPending ? (
        <p>読み込み中…</p>
      ) : tasks.isError ? (
        <p role="alert">読み込めませんでした: {tasks.error.message}</p>
      ) : (
        <ul style={{ lineHeight: settings.compact ? 1.2 : 2 }}>
          {shown?.map((t) => (
            <li key={t.id}>
              <Link to={`/tasks/${t.id}`}>{t.title}</Link> {t.status === 'done' && '（完了）'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- 絞り込みのボタンや並べ方を変えるたびに、URL が変わることを確かめます。読み込み直しても、条件が残ります。
- 検索の文字は、打つたびに履歴が増えないように `replace` にしています（練習問題4の問3）。
- 状態と並べ方は、API に頼みます（キャッシュのキーに入る）。検索の文字は、API に無いので、読んだ一覧を画面で絞り込みます。どちらも URL から計算するだけで、`useState` はありません。

---

## 5. ページを移る

### 5.1 Link

ページの中のリンクは、`<a href>` ではなく `<Link to>` で書きます。`<Link>` は `<a>` の要素を作るので、見た目や、右クリックの「新しいタブで開く」はそのままです。押したときだけ、ページ全部を読み込み直すかわりに、React Router が URL を変えて部品を差し替えます（練習問題4の問2）。

### 5.2 NavLink: 今のページの印

`Layout.tsx` のメニューの `NavLink` は、今のページへのリンクに `aria-current="page"` を付けます。スクリーンリーダーは「現在のページ」と読み上げ、CSS では `a[aria-current='page']` で太字などにできます（第45章）。`end` は「URL がぴったりのときだけ」の印です。`/` は、どの URL の先頭にも合うので、`end` が要ります。

### 5.3 useNavigate: 処理の後で移る

タスクを作ったら、そのタスクのページへ移りたい、のように、リンクを押す以外のきっかけで移るときは、`useNavigate()` が返す `navigate` 関数を使います。`app/src/pages/NewTaskPage.tsx` を作ります。

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateTask } from '../queries.ts';
import { TaskInputSchema } from '../schemas.ts';

export function NewTaskPage() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const create = useCreateTask();
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const r = TaskInputSchema.safeParse({ title, dueDate: '' });
        if (!r.success) return setError(r.error.issues[0]?.message ?? '');
        create.mutate(r.data, {
          onSuccess: (task) => void navigate(`/tasks/${task.id}`),
          onError: (err) => setError(err.message),
        });
      }}
    >
      <h1>新しいタスク</h1>
      <label>
        題名 <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button disabled={create.isPending}>作る</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

| 書き方 | 移り方 |
| --- | --- |
| `navigate('/tasks/6')` | そのページへ（履歴を1つ足す） |
| `navigate('/', { replace: true })` | 今の履歴を書き換えて移る（「戻る」で、今のページに戻らない） |
| `navigate(-1)` | 1つ前の履歴へ（ブラウザの「戻る」と同じ。`TaskDetailPage` の「戻る」ボタン） |

`TaskDetailPage` の「戻る」は、`navigate(-1)` なので、絞り込んだ一覧から来たなら、その絞り込みのまま戻れます（URL に置いたおかげです）。

---

## 6. state をどこに置くか

ここまでで、state の置き場所が5つ出てきました。新しい値を持つときは、上から順に考えます。

| 置き場所 | 向いている値 | 例 |
| --- | --- | --- |
| state にしない（計算する） | ほかの値から計算できるもの | 残りの数、検索の文字で絞り込んだ一覧（第42章 4節） |
| サーバのキャッシュ（TanStack Query） | サーバにあるデータ | タスクの一覧、1つのタスク（第43章） |
| URL | 何を見ているかを決める条件。共有・ブックマーク・「戻る」で残したいもの | 絞り込み、並べ方、ページの番号、どのタスクか |
| コンポーネントの state（`useState`・`useReducer`） | その部品の中だけの、一時的なもの | 入力中の文字、開いている編集欄、送信中か |
| Context | 遠く離れた、たくさんの部品が使うもの。あまり変わらないもの | 表示の設定、ログインしている人（第10部） |
| `localStorage` | 次に開いたときにも残したい、その人だけの設定 | 表示の設定（Context と組み合わせる） |

よくあるまちがいは、サーバのデータを `useState` にコピーして持つことです。コピーした時点からずれ始め、どちらが正しいか分からなくなります。サーバのデータは TanStack Query に、条件は URL に置き、`useState` は「その部品の中の一時的なもの」に限ると、置き場所が自然に決まります。

---

## 7. Context で、遠くの部品に配る

### 7.1 props のバケツリレー

「暗い色」の設定は、`Layout` のチェックボックスで変え、一覧のページでも使いたい値です。共通の親（`main.tsx`）に state を持ち上げて（第41章 7節）、`RouterProvider` → `Layout` → `Outlet` → `TaskListPage` と props で渡すのは、途中の部品が、自分では使わない props を受け取って渡すだけになり、大変です（**バケツリレー**、prop drilling）。ルーターが部品を出す途中には、props を渡す場所もありません。

**Context** は、Provider で包んだ中のどの部品からでも、props を通さずに値を読めるようにする仕組みです。

### 7.2 手を動かす: 表示の設定

`app/src/settings.tsx` を作ります。

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Settings = { dark: boolean; compact: boolean };
type SettingsValue = { settings: Settings; update: (patch: Partial<Settings>) => void };

// Provider の外で使われたときの値は null（useSettings で見つける）
const SettingsContext = createContext<SettingsValue | null>(null);

function load(): Settings {
  try {
    return { dark: false, compact: false, ...(JSON.parse(localStorage.getItem('settings') ?? '{}') as Partial<Settings>) };
  } catch {
    return { dark: false, compact: false };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return <SettingsContext value={{ settings, update }}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (value === null) throw new Error('useSettings は <SettingsProvider> の中で使ってください');
  return value;
}
```

| 書き方 | 意味 |
| --- | --- |
| `createContext<型>(決まりの値)` | Context を作る。決まりの値は、Provider の外で読まれたときの値 |
| `<SettingsContext value={…}>…</SettingsContext>` | 中の部品に値を配る（Provider。React 19 の書き方。古い書き方は `<SettingsContext.Provider value={…}>`） |
| `useContext(SettingsContext)` | いちばん近い Provider の値を読む。値が変わると、読んでいる部品が描き直される |

- 決まりの値を `null` にし、`useSettings` の中で確かめて投げています。Provider で包み忘れたとき、それらしい値で黙って動くのではなく、すぐ気づけます（練習問題4の問5）。
- Context そのものは外に出さず、`SettingsProvider` と `useSettings` だけを出します。使う側は、Context の仕組みを知らなくて済みます。
- 設定は `localStorage` にも保存しているので、読み込み直しても残ります。

`main.tsx` で `RouterProvider` を `SettingsProvider` で包み（完成形のとおり）、「暗い色」と「詰めて表示」を切り替えて、`Layout` と一覧の両方が変わることを確かめます。

### 7.3 Context を使いすぎない

- Context の値が変わると、それを読む部品は**全部**描き直されます。値が `{ settings, update }` のようなオブジェクトなら、描画のたびに新しいオブジェクトになるので、Provider が描き直されるたびに、読む部品も全部描き直されます。よく変わる値（入力中の文字など）を、アプリ全体の Context に入れるのは避けます。
- 変える関数（`dispatch` など）しか使わない部品が多いときは、値と関数を別々の Context に分けると、値が変わっても、関数だけを読む部品は描き直されません（練習問題8）。
- サーバのデータ（TanStack Query）と URL の条件は、それ自体がどこからでも読めるので、Context に入れ直す必要はありません。

---

## 8. テストで確かめる（練習問題の準備）

ルーターを使う部品のテストでは、ブラウザのアドレス欄のかわりに、メモリの中に URL を持つ `MemoryRouter` で包みます。

```tsx
render(
  <MemoryRouter initialEntries={['/tasks/3']}>
    <Routes>
      <Route path="/tasks/:id" element={<TaskIdPage />} />
    </Routes>
  </MemoryRouter>,
);
```

- `initialEntries` は、最初の URL（履歴）です。
- `<Routes>`・`<Route>` は、2節の `createBrowserRouter` の表を、JSX で書く形です（練習問題7）。
- テストで今の URL を確かめたいときは、`useLocation()`（今の `pathname`・`search` を返す）を使う小さな部品を、一緒に描きます。

## 9. Flask と比べる

| | Flask | React Router |
| --- | --- | --- |
| URL とページ | `@app.route('/tasks/<int:id>')` | `{ path: 'tasks/:id', element: <TaskDetailPage /> }` |
| パラメータ | `<int:id>` で数に変わる。数でなければ 404 | `useParams()` は文字。自分で確かめる |
| 検索パラメータ | `request.args.get('status')` | `useSearchParams()` |
| 共通の枠 | `{% extends 'base.html' %}` と `{% block content %}` | 親のルートの `Layout` と `<Outlet />` |
| リンク | `url_for('task', id=2)` | `<Link to="/tasks/2">` |
| 処理の後で移る | `return redirect(url_for(…))` | `navigate('/tasks/2')` |
| 見つからない | `abort(404)` | `*` のルート・`NotFoundPage` を返す |
| ページを移るとき | サーバが毎回 HTML を作る | サーバに聞かずに、部品を差し替える |

## まとめ

- SPA は、HTML が1つで、JavaScript が URL を見てページの部品を出す。本番のサーバは、どの URL でも `index.html` を返すようにする。
- React Router の `createBrowserRouter` に、URL とページの表を渡す。共通の枠は親のルートに書き、子のページは `<Outlet />` に出る。合わない URL は `*`、例外は `errorElement`。
- `useParams()` のパラメータは文字。確かめてから使う。
- 何を見ているかを決める条件は、URL の検索パラメータに置く。読み込み直し・共有・「戻る」で残る。
- リンクは `<Link>`、今のページの印は `<NavLink>`、処理の後で移るのは `useNavigate()`。
- state は、計算できるなら持たない。サーバのデータは TanStack Query、条件は URL、一時的なものは `useState`、遠くの部品に配るものは Context。
- Context は Provider で包んだ中から `useContext` で読む。包み忘れをすぐ気づけるように、決まりの値を `null` にしてカスタムフックで確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- React Router「Data Mode」の「Routing」（英語）: https://reactrouter.com/start/data/routing
- React Router「useSearchParams」（英語）: https://reactrouter.com/api/hooks/useSearchParams
- React 公式「コンテクストで深くデータを受け渡す」: https://ja.react.dev/learn/passing-data-deeply-with-context
- React 公式「リデューサとコンテクストでスケールアップ」: https://ja.react.dev/learn/scaling-up-with-reducer-and-context
- React 公式「state 構造の選択」: https://ja.react.dev/learn/choosing-the-state-structure

---

前: [第43章 データ取得とフォーム](../ch43-data-forms/README.md) ／ 次: [第45章 スタイリングとアクセシビリティ](../ch45-styling-a11y/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
