# 第43章 データ取得とフォーム

第41・42章のタスクは、画面の中の state にありました。この章では、第8部の練習用の API（第7部の成果物と同じ API）からタスクを読み、フォームから送ります。まず `useEffect` と `fetch` で自分で書いて、「読み込み中・失敗・古い応答」の扱いがどれだけ大変かを見ます。そのうえで、それを引き受けてくれる **TanStack Query** を使い、書き込み・楽観的な更新・412 の扱い・SSE までつなぎます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜7時間 |
| 前提 | 第42章、第5部（REST API・ETag・problem+json・SSE）、第7部 第38章（Zod） |
| この章のゴール | 読み込みの状態をユニオンで持ち、出し分けられる / `useEffect` の fetch で、古い応答を捨てられる / TanStack Query の `useQuery`・`useMutation` で読み書きできる / キャッシュのキーと「古いことにする」（invalidate）を説明できる / 楽観的な更新と巻き戻しを書ける / Zod のスキーマでフォームを確かめ、API の 422 を項目ごとに出せる / 412 を利用者に知らせられる / SSE で一覧を新しくできる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch43-data-forms/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch43-data-forms
>   ```
>
> - この章では、**ターミナルを2つ**使います。1つ目で練習用の API を、2つ目で Vite を動かします。
>
>   ```sh
>   # 1つ目のターミナル（Ctrl+C で止める）
>   $ cd ~/dev/part08
>   $ npm run api
>   練習用の API: http://127.0.0.1:9500/api/tasks （止めるのは Ctrl+C）
>   ```
>
>   API はデータをメモリに置くので、止めると、足したタスクは消えます。動かすたびに、例のタスクが5つ入ります。
> - `API_DELAY_MS=1500 npm run api` のように動かすと、API の応答がわざと 1.5 秒遅れます。「読み込み中…」を確かめるときに使います。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 読み込みの状態のユニオン（2.2節） | 第44章（画面ごとの読み込み）、第46章（サーバで読む） |
| TanStack Query（3・4節） | 第44章（URL の条件をキャッシュのキーにする）、第8部の成果物 |
| 楽観的な更新（4.2節） | 第8部の成果物（完了の切り替え） |
| 画面とサーバで同じスキーマ（5節） | 第8部の成果物、第9部（画面とサーバを1つのプロジェクトで書く） |
| 412 を利用者に知らせる（6節） | 第8部の成果物（編集の衝突） |
| SSE で読み直す（7節） | 第8部の成果物 |

---

## 1. 準備: API とつながる app を作る

### 1.1 手を動かす: app を作る

```sh
$ mkdir -p app/src
$ cp ../ch42-hooks/app/tsconfig.json ../ch42-hooks/app/index.html app/
$ cd app
```

`app/vite.config.ts` を作ります。第41章の React のプラグインに、第40章 5節のプロキシを足したものです。画面からは `/api/…` と書けば、Vite が練習用の API（`127.0.0.1:9500`）に中継します。同じオリジンに見えるので、CORS（第4部）を気にせずに済みます。

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:9500' },
  },
});
```

コピーした `app/index.html` の `<title>` を、`タスク（API とつなぐ）` に変えます。

### 1.2 手を動かす: 応答の形と、API を呼ぶ関数

API の応答は、画面の外から来るデータです。第38章と同じように、**形を Zod で確かめてから**使います。`app/src/schemas.ts` を作ります（後半の `TaskInputSchema` は5節で使います）。

```ts
import { z } from 'zod';

z.config(z.locales.ja());

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

export const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });

// 5節: フォームから送る前に確かめる。API の決まり（題名は 1〜100 文字、締め切りは YYYY-MM-DD）と同じにする
export const TaskInputSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  // <input type="date"> は、空なら '' を返す。'' は「締め切り無し」（null）にする
  dueDate: z
    .string()
    .transform((s) => (s === '' ? null : s))
    .pipe(z.iso.date('締め切りは YYYY-MM-DD の日付です').nullable()),
});
// フォームから受け取る形（入力）と、確かめた後の形（出力）
export type TaskFormValues = z.input<typeof TaskInputSchema>;
export type TaskInput = z.output<typeof TaskInputSchema>;
```

`app/src/api.ts` を作ります。第39章の `request` を TypeScript にしたものです。

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
    // problem+json でない応答（プロキシの 502 など）でも ApiError にする
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

const json = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

export async function listTasks(status: Status | 'all', signal?: AbortSignal): Promise<Task[]> {
  const q = new URLSearchParams({ sort: 'dueDate', limit: '100' });
  if (status !== 'all') q.set('status', status);
  return PageSchema.parse(await request(`/tasks?${q}`, { signal })).items;
}

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', json('POST', input)));
}

// If-Match に、読んだときの version（ETag は "version" の形）を入れる。ほかの人が先に変えていたら 412
export async function updateTask(task: Pick<Task, 'id' | 'version'>, patch: Partial<Pick<Task, 'title' | 'status' | 'dueDate'>>): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${task.id}`, json('PATCH', patch, { 'If-Match': `"${task.version}"` })));
}

export async function deleteTask(task: Pick<Task, 'id' | 'version'>): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}
```

- 失敗（2xx 以外）は、problem+json（第5部 第25章）の中身を持った `ApiError` にします。画面は `error.status` で 412 や 422 を見分け、`error.problem.errors` で項目ごとの間違いを読めます。
- 成功の応答は、`PageSchema.parse` や `TaskSchema.parse` で確かめます。形が違えば `ZodError` が投げられ、「読み込めませんでした」として扱われます。
- `signal` は、リクエストを途中で止めるための印です（2.3節）。

### 1.3 クエリを作る: URLSearchParams

`listTasks` の `new URLSearchParams({ sort: 'dueDate', limit: '100' })` は、`?` の後ろのクエリを作る道具です（第2部）。`q.set('status', 'done')` で足し、`` `/tasks?${q}` `` のように文字の中に入れると、`sort=dueDate&limit=100&status=done` になります。`,` や日本語は、自動でエスケープされます（練習問題3）。

---

## 2. useEffect で読む

### 2.1 手を動かす: PlainList

まず、第42章の `useEffect` だけで一覧を読みます。`app/src/PlainList.tsx` を作ります。

```tsx
import { useEffect, useState } from 'react';
import { listTasks } from './api.ts';
import type { Status, Task } from './schemas.ts';

type Filter = Status | 'all';
type Load = { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; tasks: Task[] };

export function PlainList() {
  const [filter, setFilter] = useState<Filter>('all');
  // 結果と一緒に「どの絞り込みの結果か」を覚えておく
  const [result, setResult] = useState<{ filter: Filter; load: Load } | null>(null);
  // 今の絞り込みの結果がまだ無ければ「読み込み中」。state にせず、計算で決める（第42章 4節）
  const load: Load = result?.filter === filter ? result.load : { status: 'pending' };

  useEffect(() => {
    // 後片付けで止める。filter を素早く切り替えたとき、前のリクエストの応答で上書きしない
    const controller = new AbortController();
    listTasks(filter, controller.signal).then(
      (tasks) => setResult({ filter, load: { status: 'success', tasks } }),
      (error: unknown) => {
        if (controller.signal.aborted) return; // 止めたのは自分なので、エラーにしない
        setResult({ filter, load: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } });
      },
    );
    return () => controller.abort();
  }, [filter]);

  return (
    <section>
      <h2>useEffect で読む</h2>
      <select aria-label="状態" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
        <option value="all">すべて</option>
        <option value="todo">未着手</option>
        <option value="doing">作業中</option>
        <option value="done">完了</option>
      </select>
      {load.status === 'pending' && <p>読み込み中…</p>}
      {load.status === 'error' && <p role="alert">読み込めませんでした: {load.error.message}</p>}
      {load.status === 'success' && (
        <ul>
          {load.tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`app/src/main.tsx` と `app/src/App.tsx` は、3節で TanStack Query を入れるときに完成させます。今は、次の形で `PlainList` だけを出します。

```tsx
// app/src/main.tsx（今だけの形）
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PlainList } from './PlainList.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlainList />
  </StrictMode>,
);
```

```sh
$ npx vite
```

http://localhost:5173/ を開くと、例のタスクが5つ並びます。選ぶ欄で絞り込めます。

### 2.2 読み込みの状態は3つ（ユニオン）

`Load` 型は、「読み込み中」「失敗」「成功」の3つの状態のユニオンです（第36章 2節の判別できるユニオン）。

```ts
type Load = { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; tasks: Task[] };
```

`loading: boolean`・`error: Error | null`・`tasks: Task[]` の3つの state に分けると、「読み込み中なのに error もある」のような、ありえない組み合わせが作れてしまいます。ユニオンにすると、`load.status === 'success'` のときだけ `load.tasks` が使えるので、tsc がまちがいを見つけます。

API を止める（1つ目のターミナルで Ctrl+C）と、`読み込めませんでした: HTTP 502` が出ることを確かめます。Vite のプロキシが、つながらない相手のかわりに 502 Bad Gateway を返しています。確かめたら、API をもう一度動かします。

### 2.3 古い応答を捨てる

API を `API_DELAY_MS=1500 npm run api` で動かし直し、選ぶ欄を素早く「未着手」→「完了」と変えるとします。リクエストは2つ飛び、応答の届く順は決まっていません。後から届いた「未着手」の応答で画面を書き換えると、選ぶ欄は「完了」なのに、未着手の一覧が出てしまいます（**競争**、race condition）。

`PlainList` は、これを2つの方法で防いでいます。

| 方法 | 書き方 |
| --- | --- |
| 前のリクエストを止める | Effect の中で `new AbortController()` を作り、`signal` を fetch に渡す。後片付けで `controller.abort()`（第42章 3.2節）。止められた fetch は `AbortError` で失敗するので、そのときはエラーにしない |
| どの条件の結果かを覚える | `setResult({ filter, load })` と、結果に条件を付けておく。描画のときに今の `filter` と比べ、違えば「読み込み中」として扱う |

2つ目の方法は、「読み込み中に戻す」ための `setLoad({ status: 'pending' })` を Effect の中で呼ばずに済ませるためでもあります（第42章 4節。ESLint の `set-state-in-effect`）。

### 2.4 自分で書くと、まだ足りないもの

`PlainList` は動きますが、本物の画面では、さらに次のことが欲しくなります。

- 同じ一覧を使う部品が2つあるとき、リクエストを1回にまとめる。
- 一度読んだ一覧を覚えておき、「完了」→「すべて」と戻ったとき、すぐ出す（キャッシュ）。
- 一瞬つながらなかったときは、何回かやり直す。
- タブに戻ってきたとき、古くなっていれば読み直す。
- タスクを足したら、一覧を読み直す。

これを毎回自分で書くのは大変で、まちがいやすい部分です。次の節の TanStack Query が、これらを引き受けます。

---

## 3. TanStack Query で読む

**TanStack Query**（`@tanstack/react-query`）は、サーバから読んだデータ（**サーバの状態**）を、キーを付けてキャッシュし、読み込み・やり直し・読み直しを受け持つライブラリです。第8部のフォルダに入っています。

### 3.1 手を動かす: QueryClient を渡す

`app/src/main.tsx` を、次の形にします。

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    // 読んでから 10 秒は「新しい」とみなし、同じキーを使う画面が増えても読み直さない
    queries: { staleTime: 10_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- `QueryClient` が、キャッシュを持つ本体です。`QueryClientProvider` で包むと、その中のどのコンポーネントからも使えます（この仕組みは、第44章の Context です）。
- `staleTime` は、読んでから「新しい」とみなす時間です。これを過ぎると「古い」（stale）になり、次に使われたときに裏で読み直します。決まりの値は `0`（読んだらすぐ古い）です。

### 3.2 手を動かす: カスタムフックにまとめる

TanStack Query の呼び出しは、画面の部品に直接書かず、カスタムフック（第42章 7節）にまとめます。`app/src/queries.ts` を作ります。この節で使うのは最初の `taskKeys` と `useTasks` です。残りは4・6・7節で説明します。

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createTask, deleteTask, listTasks, updateTask } from './api.ts';
import type { Status, Task, TaskInput } from './schemas.ts';

// 3.2節: キャッシュの名前（キー）。['tasks'] で始まるものを、まとめて「古い」にできる
export const taskKeys = {
  all: ['tasks'] as const,
  list: (status: Status | 'all') => ['tasks', 'list', status] as const,
};

// 3節: 一覧を読む。queryFn に渡される signal で、要らなくなったリクエストを止める
export function useTasks(status: Status | 'all') {
  return useQuery({
    queryKey: taskKeys.list(status),
    queryFn: ({ signal }) => listTasks(status, signal),
  });
}

// 4.1節: 作る。成功したら一覧を「古い」にして、読み直させる
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 4.2節: 完了と未着手を切り替える。応答を待たずに画面を変え（楽観的な更新）、失敗したら戻す
export function useToggleDone(status: Status | 'all') {
  const queryClient = useQueryClient();
  const key = taskKeys.list(status);
  return useMutation({
    mutationFn: (task: Task) => updateTask(task, { status: task.status === 'done' ? 'todo' : 'done' }),
    onMutate: async (task) => {
      // 読み込みの途中なら止める（古い応答で、今から書く値を上書きされないように）
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (tasks) =>
        tasks?.map((t) => (t.id === task.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)),
      );
      return { previous }; // onError に渡る
    },
    onError: (_error, _task, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    // 成功しても失敗しても、最後に読み直して、サーバと合わせる
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 6節: 題名を変える。If-Match の version が古ければ 412（ApiError）
export function useRenameTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, title }: { task: Task; title: string }) => updateTask(task, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => deleteTask(task),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 7節: ほかの人（ほかのタブ）が変えたら、SSE で知らせてもらい、一覧を読み直す
export function useTaskEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    for (const type of ['task.created', 'task.updated', 'task.deleted']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}
```

`useQuery({ queryKey, queryFn })` の2つが要点です。

| 項目 | 意味 |
| --- | --- |
| `queryKey` | キャッシュの名前（配列）。`['tasks', 'list', 'done']` のように、何の一覧か、どの条件かを全部入れる。キーが変わると、別のデータとして読む |
| `queryFn` | データを読む関数。Promise を返す。失敗したら投げる。渡される `signal` を fetch に渡すと、要らなくなったリクエストを止めてくれる（2.3節の1つ目の方法を、自動でしてくれる） |

キーの配列は、前から順に「大きい分類 → 細かい条件」にします。`['tasks']` で始まるキャッシュを全部まとめて「古いことにする」ことができるからです（4.1節）。キーは `taskKeys` のように1か所で作ると、書きまちがいを防げます。

### 3.3 手を動かす: 一覧を出す

`app/src/TaskList.tsx` を作ります（完了の切り替えと削除は4節、`EditTitle` は6節で作ります。作るまでは、その行をコメントにしておきます）。

```tsx
import { useState } from 'react';
import { useDeleteTask, useTasks, useToggleDone } from './queries.ts';
import type { Status, Task } from './schemas.ts';
import { EditTitle } from './EditTitle.tsx';

const FILTERS: Record<Status | 'all', string> = { all: 'すべて', todo: '未着手', doing: '作業中', done: '完了' };

export function TaskList() {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useTasks(filter);
  const toggle = useToggleDone(filter);
  const remove = useDeleteTask();

  return (
    <section>
      <h2>
        タスク {tasks.isFetching && <small>（更新中…）</small>}
      </h2>
      <div>
        {(Object.keys(FILTERS) as (Status | 'all')[]).map((f) => (
          <button key={f} type="button" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {FILTERS[f]}
          </button>
        ))}
      </div>
      {toggle.isError && <p role="alert">変えられませんでした: {toggle.error.message}</p>}
      {remove.isError && <p role="alert">消せませんでした: {remove.error.message}</p>}
      {tasks.isPending ? (
        <p>読み込み中…</p>
      ) : tasks.isError ? (
        <p role="alert">
          読み込めませんでした: {tasks.error.message}{' '}
          <button type="button" onClick={() => void tasks.refetch()}>再試行</button>
        </p>
      ) : tasks.data.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul>
          {tasks.data.map((t) => (
            <li key={t.id}>
              <label>
                <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle.mutate(t)} /> {t.title}
              </label>
              {t.dueDate && <small> 締め切り: {t.dueDate}</small>}{' '}
              <button type="button" onClick={() => setEditing(t)}>題名を変える</button>{' '}
              <button type="button" onClick={() => remove.mutate(t)}>削除</button>
            </li>
          ))}
        </ul>
      )}
      {/* key: 別のタスクを選んだら、編集欄を作り直す（第42章 4節） */}
      {editing && <EditTitle key={editing.id} task={editing} onDone={() => setEditing(null)} />}
    </section>
  );
}
```

`useTasks(filter)` が返すオブジェクトの、よく使う項目です。

| 項目 | 意味 |
| --- | --- |
| `isPending` | まだデータが1つも無い（最初の読み込み中） |
| `isError`・`error` | 失敗した（やり直しも全部失敗した）。`error` は投げられたもの |
| `data` | 読んだデータ。`isPending` でも `isError` でもなければ、必ずある |
| `isFetching` | 裏で読んでいる最中（データがあっても、読み直し中なら `true`） |
| `refetch()` | すぐ読み直す |

`isPending` と `isError` の後ろの `tasks.data` は、tsc が `Task[]` だと分かっています（`useQuery` の戻り値も、`status` で区別するユニオンだからです）。

`app/src/App.tsx` を、`TaskList` と `PlainList` を並べる形にします（`NewTaskForm` と `useTaskEvents` は5・7節で足します）。

```tsx
import { NewTaskForm } from './NewTaskForm.tsx';
import { PlainList } from './PlainList.tsx';
import { useTaskEvents } from './queries.ts';
import { TaskList } from './TaskList.tsx';

export function App() {
  useTaskEvents(); // 7節
  return (
    <main>
      <h1>タスク（API とつなぐ）</h1>
      <NewTaskForm />
      <TaskList />
      <PlainList />
    </main>
  );
}
```

「完了」→「すべて」と押すと、2回目からはすぐ出ます。キャッシュがあるからです。

| TanStack Query の決まりの動き | 意味 |
| --- | --- |
| 失敗したら3回までやり直す | 1秒・2秒・4秒と間を空ける。一瞬つながらなかっただけなら、利用者は気づかない |
| 同じキーを使う部品が同時にいくつあっても、リクエストは1回 | キャッシュを共有する |
| 古いキャッシュを先に見せ、裏で読み直す | 「読み込み中…」で待たせない（stale-while-revalidate） |
| タブに戻ったとき、古ければ読み直す | `refetchOnWindowFocus` |
| 使われなくなったキャッシュは、5分後に消す | `gcTime` |

---

## 4. 書き込む: useMutation

### 4.1 作ったら、一覧を「古いことにする」

読み込み（`useQuery`）と違い、作る・変える・消すは、利用者の操作で1回だけ動かすものです。これには `useMutation` を使います。`queries.ts` の `useCreateTask` の部分です。

```ts
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
```

- `useQueryClient()` で、`main.tsx` で作った `QueryClient` を受け取ります。
- `mutation.mutate(値)` で `mutationFn(値)` が動きます。`isPending`・`isError`・`error` は `useQuery` と同じです。
- `invalidateQueries({ queryKey: ['tasks'] })` は、`['tasks']` で始まるキャッシュを全部「古いことにする」命令です。今画面に出ている一覧はすぐ読み直され、出ていない一覧（ほかの絞り込み）は、次に出たときに読み直されます。新しいタスクがどの一覧に入るかを、画面で計算しなくて済みます。

### 4.2 楽観的な更新

チェックボックスを押してから、応答が届くまでチェックが付かないと、遅い回線では、押したかどうか分からなくなります。そこで、**応答を待たずに画面を変え**、失敗したら元に戻します（**楽観的な更新**、optimistic update）。`queries.ts` の `useToggleDone` がこれです。

| 関数 | いつ | すること |
| --- | --- | --- |
| `onMutate` | `mutationFn` の前 | 読み込みの途中なら止め（`cancelQueries`）、今のキャッシュを覚えてから、キャッシュを変える（`setQueryData`）。覚えたものを返す |
| `onError` | 失敗したとき | `onMutate` が返したもの（3つ目の引数）で、キャッシュを元に戻す |
| `onSettled` | 成功でも失敗でも、最後に | 読み直して、サーバの本当の値に合わせる |

`setQueryData` に渡す関数の中では、第42章 2.4節のとおり、配列もオブジェクトも新しく作ります。

`API_DELAY_MS=1500 npm run api` で動かし直し、チェックボックスを押すと、すぐにチェックが付くことを確かめます。

楽観的な更新は、**ほぼ必ず成功し、失敗しても戻せる操作**に使います。お金を払う、メールを送るのように、失敗したときに「一度は成功したように見えた」ことが問題になる操作には使いません。

---

## 5. フォーム

### 5.1 画面とサーバで、同じ決まりを使う

`schemas.ts` の `TaskInputSchema` は、API と同じ決まり（題名は前後の空白を除いて 1〜100 文字、締め切りは `YYYY-MM-DD` か無し）を、Zod のスキーマにしたものです。

- `<input type="date">` の値は、空なら `''` です。`.transform` で `null` にしてから、`.pipe` で日付かを確かめます。
- `z.input<typeof TaskInputSchema>` はフォームが持つ形（`dueDate: string`）、`z.output<…>` は確かめた後の形（`dueDate: string | null`）です。

画面で確かめるのは、送る前に**すぐ**知らせるためです。守るのはサーバです（練習問題4の問6）。決まりを同じにしておくと、画面で通った値がサーバで断られることが、ほとんど無くなります。第9部では、画面とサーバを1つのプロジェクトにして、このスキーマのファイルそのものを共有します。

### 5.2 手を動かす: 確かめて送るフォーム

`app/src/fieldErrors.ts` と `app/src/NewTaskForm.tsx` を作り、`App.tsx` の `NewTaskForm` のコメントを外します。

```ts
import type { Problem } from './api.ts';

export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    // pointer は '#/title' の形（第25章）。'#/' を除いた残りが項目の名前
    const name = e.pointer?.replace(/^#\//, '') ?? '';
    out[name] ??= e.detail;
  }
  return out;
}
```

```tsx
import { useState, type FormEvent } from 'react';
import { ApiError } from './api.ts';
import { toFieldErrors } from './fieldErrors.ts';
import { useCreateTask } from './queries.ts';
import { TaskInputSchema, type TaskFormValues } from './schemas.ts';

const empty: TaskFormValues = { title: '', dueDate: '' };

export function NewTaskForm() {
  const [values, setValues] = useState<TaskFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateTask();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 5.2節: 送る前に、同じ決まりで確かめる（画面ですぐ知らせるため。API も必ず確かめる）
    const r = TaskInputSchema.safeParse(values);
    if (!r.success) {
      const fe: Record<string, string> = {};
      for (const issue of r.error.issues) fe[String(issue.path[0])] ??= issue.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    create.mutate(r.data, {
      onSuccess: () => setValues(empty),
      onError: (error) => {
        // 5.3節: 422 は項目ごと、それ以外（409 など）はフォーム全体の間違い
        if (error instanceof ApiError && error.status === 422) setErrors(toFieldErrors(error.problem));
        else setErrors({ '': error.message });
      },
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2>タスクを足す</h2>
      <label>
        題名 <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} aria-invalid={errors.title !== undefined} />
      </label>
      {errors.title && <p role="alert">{errors.title}</p>}
      <label>
        締め切り <input type="date" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} aria-invalid={errors.dueDate !== undefined} />
      </label>
      {errors.dueDate && <p role="alert">{errors.dueDate}</p>}
      {errors[''] && <p role="alert">{errors['']}</p>}
      <button disabled={create.isPending}>{create.isPending ? '送信中…' : '追加'}</button>
    </form>
  );
}
```

- 入力は、第41章と同じ制御されたコンポーネントです。2つの値を1つのオブジェクトの state に入れ、`{ ...values, title: … }` で変えます。
- 送られたら、まず `safeParse` で確かめます。間違いは `issue.path[0]`（項目の名前）ごとに、最初の1つを `errors` に入れます。
- `mutate(値, { onSuccess, onError })` のように、`mutate` の2つ目の引数にも `onSuccess`・`onError` を書けます。`useCreateTask` の中の `onSuccess`（一覧の読み直し）は、どの画面から使っても動き、こちらは、このフォームだけの処理（入力を空にする・間違いを出す）です。
- 送っている間は、ボタンを押せなくし、「送信中…」にします。2回押して、同じタスクが2つできることを防ぎます。
- `aria-invalid` は、「この入力欄の値は間違っている」の印です。スクリーンリーダーが読み上げます（第45章）。
- `<form noValidate>` は、ブラウザが自分で出す確かめの吹き出し（`required` などの属性のもの）を止め、確かめ方と文をこのフォームにそろえるための属性です。

### 5.3 API の間違いを、項目ごとに出す

画面の確かめを通っても、サーバでしか分からない間違いがあります。

| 試すこと | API の応答 | 出し方 |
| --- | --- | --- |
| 締め切りに昨日の日付 | 422。`errors: [{ pointer: '#/dueDate', detail: '締め切りが過ぎています' }]` | `toFieldErrors` で `{ dueDate: '…' }` にし、締め切りの欄の下に出す |
| 「牛乳を買う」をもう1つ足す | 409。`detail: '同じ題名の、終わっていないタスクがあります'` | フォーム全体の間違い（`errors['']`）として出す |

`pointer` は、ボディの中の場所を指す JSON Pointer（第25章）です。`#/dueDate` の `#/` を除けば、フォームの項目の名前になります。サーバの間違いの形を、画面の項目の名前にそろえておくと、この変換は数行で済みます。

---

## 6. 412: ほかの人が先に変えたとき

第5部の API は、変える・消すリクエストに、読んだときの ETag（`"version"`）を `If-Match` に入れることを求めます。ほかの人が先に変えていれば、412 Precondition Failed が返ります（第25章 7.3節）。`api.ts` の `updateTask` は、`If-Match` を付けて送っています。

`app/src/EditTitle.tsx` を作り、`TaskList.tsx` の `EditTitle` のコメントを外します。

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from './api.ts';
import { taskKeys, useRenameTask } from './queries.ts';
import type { Task } from './schemas.ts';

export function EditTitle({ task, onDone }: { task: Task; onDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const rename = useRenameTask();
  const queryClient = useQueryClient();
  const conflict = rename.error instanceof ApiError && rename.error.status === 412;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        rename.mutate({ task, title }, { onSuccess: onDone });
      }}
    >
      <h3>「{task.title}」の題名を変える（version {task.version}）</h3>
      <label>
        新しい題名 <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button disabled={rename.isPending}>保存</button>{' '}
      <button type="button" onClick={onDone}>やめる</button>
      {conflict ? (
        <p role="alert">
          ほかの人が先に変えました。{' '}
          <button
            type="button"
            onClick={() => {
              // 一覧を読み直し、編集欄を閉じる。もう一度選ぶと、新しい version で編集できる
              void queryClient.invalidateQueries({ queryKey: taskKeys.all });
              onDone();
            }}
          >
            読み直す
          </button>
        </p>
      ) : (
        rename.isError && <p role="alert">{rename.error.message}</p>
      )}
    </form>
  );
}
```

412 を確かめます。

1. 「部屋の掃除」の「題名を変える」を押す（編集欄が開き、version が出る）。
2. 別のターミナルで、同じタスクを先に変える。`-H` で `If-Match` を付けます（`"1"` の数は、画面に出た version）。

   ```sh
   $ curl -X PATCH http://127.0.0.1:9500/api/tasks/3 -H 'Content-Type: application/json' -H 'If-Match: "1"' -d '{"title":"部屋の掃除（別の人）"}'
   ```

3. 画面の編集欄で題名を変えて「保存」を押す → 「ほかの人が先に変えました。」と「読み直す」が出る。

412 のとき、画面がしてはいけないのは、黙って上書きすることと、利用者の入力を黙って捨てることです。この例では、知らせて、読み直してから、もう一度編集してもらいます。

---

## 7. SSE で、ほかの人の変更を知る

第5部の API は、タスクが作られた・変えられた・消されたときに、`/api/events` で SSE（第27章）を送ります。`queries.ts` の `useTaskEvents` は、それを受け取ったら `invalidateQueries` で一覧を読み直させるフックです。

```ts
export function useTaskEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    for (const type of ['task.created', 'task.updated', 'task.deleted']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}
```

- SSE で届いたタスクの中身を、キャッシュに直接書き込むこともできます。ここでは、「変わった」という知らせとしてだけ使い、中身は読み直します。どの一覧に入るか（絞り込み・並び順）を画面で計算しなくて済み、キャッシュがサーバとずれません。
- `EventSource` を開いたら、後片付けで閉じます（第42章 3.2節）。
- `void` は、「返ってきた Promise を待たない」ことを、ESLint に伝える書き方です（第37章 6節）。

`App.tsx` で `useTaskEvents()` を呼び、ブラウザのタブを2つ開いて、片方で足したタスクが、もう片方にも出ることを確かめます。

---

## 8. テストで確かめる（練習問題の準備）

練習問題のテストは、本物の API を使わずに、`fetch` を偽物に替えます（[exercises/test-helpers.tsx](exercises/test-helpers.tsx)）。

| 道具 | すること |
| --- | --- |
| `mockFetch((url, init) => jsonResponse(本文, 状態))` | `vi.stubGlobal('fetch', …)` で `fetch` を替え、決めた応答を返す。呼ばれた URL と `init` は `fetch.mock.calls` で見られる |
| `deferred()` | `resolve` を呼ぶまで届かない応答。「応答の順番」や「待っている間」を確かめる |
| `createWrapper()` | テストごとに新しい `QueryClient`（やり直し無し）を作り、それで包む部品を返す。テストの間でキャッシュが混ざらない |
| `await waitFor(() => expect(…))` | 通るまで少しずつ待ちながら、何回か確かめる（読み込みが終わるのを待つ） |

## 9. Flask と比べる

| | Flask | React + TanStack Query |
| --- | --- | --- |
| データを読む | ビューの関数の中で、データベースから読んでテンプレートに渡す | 画面が API を呼ぶ。`useQuery` がキャッシュとやり直しを受け持つ |
| フォームを確かめる | Flask-WTF のフォームのクラス（サーバで確かめ、間違いをテンプレートで出す） | 画面で Zod のスキーマで確かめ、サーバでも確かめる |
| 送った後 | リダイレクトして、ページを作り直す（PRG） | `invalidateQueries` で、変わった一覧だけ読み直す |
| ほかの人の変更 | ページを読み込み直すまで見えない | SSE で知らせてもらい、読み直す |

## まとめ

- 読み込みの状態は「読み込み中・失敗・成功」のユニオンで持ち、`status` で出し分ける。
- `useEffect` の fetch は、後片付けで止め（`AbortController`）、どの条件の結果かを覚えて、古い応答を出さない。
- TanStack Query は、サーバの状態をキーごとにキャッシュし、やり直し・まとめ・読み直しを受け持つ。読むのは `useQuery`、書くのは `useMutation`。書いたら `invalidateQueries` で「古いことにする」。
- 楽観的な更新は、`onMutate` でキャッシュを変え、`onError` で戻し、`onSettled` で読み直す。
- フォームは、サーバと同じ決まりの Zod のスキーマで送る前に確かめ、API の 422 は `pointer` で項目ごとに、409 などはフォーム全体に出す。守るのはサーバ。
- 412 は、黙って上書きせず、知らせて読み直してもらう。
- SSE は「変わった」という知らせとして使い、一覧を読み直す。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- React 公式「エフェクトを使って同期を行う」（データの取得）: https://ja.react.dev/learn/synchronizing-with-effects#fetching-data
- TanStack Query「Overview」（英語）: https://tanstack.com/query/latest/docs/framework/react/overview
- TanStack Query「Important Defaults」（決まりの動き。英語）: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- TanStack Query「Query Keys」（英語）: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- TanStack Query「Optimistic Updates」（英語）: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- MDN「AbortController」: https://developer.mozilla.org/ja/docs/Web/API/AbortController

---

前: [第42章 Hooks と再描画の仕組み](../ch42-hooks/README.md) ／ 次: [第44章 ルーティングと状態の設計](../ch44-routing-state/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
