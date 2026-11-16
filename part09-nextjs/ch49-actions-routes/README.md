# 第49章 Server Actions と Route Handlers

第47・48章のアプリは、タスクを読むだけでした。この章では、**書き換え**を足します。第8部では、ブラウザの React が API に `POST` や `PATCH` を送りました（第43章）。Next.js では、フォームを送ると**サーバの関数がそのまま呼ばれる** Server Action と、Express のルートのように**自分で HTTP の入り口を作る** Route Handler の2つを使えます。タスクを作る・状態を変える・消す画面を作り、2つの使い分けと、気をつけるべき安全の話を、手を動かして身につけます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第48章、第43章（フォーム・楽観的な更新・412・SSE）、第5部 第25章（problem+json） |
| この章のゴール | Route Handler で GET・POST の入り口を作り、JSON と problem+json を返せる / `'use server'` の関数をフォームの `action` に渡して呼べる / `useActionState` で、エラーと打った値をフォームに返せる / `useFormStatus` で送っている間を出せる / `redirect`・`refresh()` で、書き換えた後の画面を決められる / `bind` で引数を決めた Server Action を作れる / `useOptimistic` で楽観的な更新を書ける / Server Action が「誰でも呼べる入り口」だと説明し、引数を確かめられる / SSE を Route Handler で中継できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で作るアプリの完成形（`web/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part09/ch49-actions-routes/` で実行します。手を動かして作るアプリ（`web/`）は、このフォルダの直下に作ります。
> - 第48章と同じく、ターミナルを2つ使います（1つ目で `npm run api`、2つ目で Next.js）。この章の Next.js は、ポート 9530 で動かします。
> - 3つ目のターミナルで、`curl` で Route Handler を呼びます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Route Handler（2節） | 第50章（前もって作る入り口）、第10部（ログインのコールバック）、第12部（ヘルスチェック） |
| Server Action と `useActionState`（3節） | 第9部の成果物（作る・変える・消す）、第10部（ログインのフォーム） |
| Server Action の安全（4節） | 第10部（だれが呼んだかを確かめる） |
| SSE の中継（5節） | 第9部の成果物 |

---

## 1. 準備

第48章の `web/` をコピーして始めます。

```sh
$ cd ~/dev/part09/ch49-actions-routes
$ cp -R ../ch48-server-client/samples/web web
$ cd web
$ rm -rf .next
$ npx next dev -p 9530
```

- 自分で作った `../ch48-server-client/web` をコピーしても構いません。
- `rm -rf .next` は、コピーしてきたビルドの結果を消すコマンドです（第48章 1節）。

`http://localhost:9530/tasks` を開いて、第48章と同じ一覧が出ることを確かめます。

---

## 2. Route Handler: 自分で作る HTTP の入り口

### 2.1 手を動かす: いちばん小さな入り口

`app/api/health/route.ts` を作ります（`mkdir -p app/api/health`。`-p` は、途中のフォルダもまとめて作るオプション）。

```ts
export function GET() {
  return Response.json({ status: 'ok' });
}
```

3つ目のターミナルで呼びます。

```sh
$ curl http://localhost:9530/api/health
{"status":"ok"}
$ curl -i -X DELETE http://localhost:9530/api/health
HTTP/1.1 405 Method Not Allowed
```

- **`route.ts`** は、`page.tsx` の代わりに置くファイルです。フォルダの名前が URL になるのは、ページと同じです（`app/api/health/route.ts` → `/api/health`）。
- `GET`・`POST`・`PATCH`・`DELETE` などの名前で関数を export すると、その HTTP メソッドの入り口になります。無いメソッドで呼ぶと、Next.js が 405 を返します。
- 引数は Web 標準の `Request`、返すのは `Response` です（`fetch` で使うものと同じ。第2部 第10章）。`Response.json(値)` は、JSON にして `Content-Type: application/json` を付けた応答を作ります。
- 同じフォルダに、`page.tsx` と `route.ts` を両方は置けません。ページか入り口の、どちらか一方です。

Express で書くと、次と同じです（第5部）。

```ts
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});
```

Flask の `@app.get('/api/health')` を付けた関数で `return {'status': 'ok'}` と書くのとも、同じ役目です。

### 2.2 手を動かす: API を書き換える関数

`lib/api.ts` に、API を書き換える関数を足します。まず、状態の名前（`STATUSES` など）を、新しいファイル `lib/status.ts` に移します。3.4節で、ブラウザ用の部品からも使うためです（`lib/api.ts` は `server-only` なので、ブラウザ用の部品から import できません）。

```ts
export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
```

`lib/api.ts` は、次のようにします。

```ts
import 'server-only'; // 第48章 4節: このファイルをブラウザ用の部品から import すると、エラーになる
import { z } from 'zod';
import { STATUSES, type Status } from './status.ts';

// つなぐ API の場所。API_URL=http://127.0.0.1:9536 npx next dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9500';
// 第48章 4節: API に送る合言葉（の練習）。サーバだけが知っていればよい値。dev-only- は開発用の仮の値の印
const API_TOKEN = process.env.API_TOKEN ?? 'dev-only-token';
const headers = { Authorization: `Bearer ${API_TOKEN}` };

// 状態の名前は、ブラウザ用の部品でも使うので、別のファイル（server-only でない）に置いた（第49章 3.4節）
export { STATUSES, STATUS_LABELS, isStatus, type Status } from './status.ts';

// 第7部の API の Task と同じ形（第8部の成果物の schemas.ts と同じ）
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });
export type Page = z.infer<typeof PageSchema>;

// 第49章 2節: API の失敗（problem+json）。status と、項目ごとの理由を持つ（第8部 第43章の ApiError と同じ形）
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

/** API を呼ぶ。2xx でなければ ApiError を投げる。204 なら null */
async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

const jsonInit = (method: string, body: unknown, extra: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...extra },
  body: JSON.stringify(body),
});

/** 一覧の1ページ。status を渡せば、その状態のものだけ */
export async function listTasks({ status, cursor }: { status?: Status; cursor?: string } = {}): Promise<Page> {
  const q = new URLSearchParams({ sort: 'createdAt', limit: '20' });
  if (status) q.set('status', status);
  if (cursor) q.set('cursor', cursor);
  return PageSchema.parse(await request(`/tasks?${q}`));
}

/** 1つ読む。無ければ null */
export async function getTask(id: number): Promise<Task | null> {
  try {
    return TaskSchema.parse(await request(`/tasks/${id}`));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ここから第49章: 書き換える関数。Server Action と Route Handler から呼ぶ
export type TaskInput = { title: string; dueDate: string | null };

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', jsonInit('POST', input)));
}

/** If-Match に、読んだときの version を入れる。ほかの人が先に変えていたら 412 の ApiError（第43章 6節） */
export async function updateTask(task: { id: number; version: number }, patch: Partial<TaskInput> & { status?: Status }): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${task.id}`, jsonInit('PATCH', patch, { 'If-Match': `"${task.version}"` })));
}

export async function deleteTask(task: { id: number; version: number }): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}

/** problem+json の errors を「項目の名前 → 文」にする（第43章 5.3節） */
export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    const name = e.pointer !== undefined ? (e.pointer.replace(/^#\//, '').split('/')[0] ?? '') : (e.parameter ?? '');
    out[name] ??= e.detail;
  }
  return out;
}

/** 第49章 5節: API の SSE（/api/events）につなぐ。合言葉を付けるので、サーバからだけ呼ぶ */
export async function openEvents(signal: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}/api/events`, { headers: { ...headers, Accept: 'text/event-stream' }, signal });
}
```

- `ApiError`・`request`・`toFieldErrors` は、第8部 第43章の `api.ts` と同じ考え方です。違うのは、サーバで動くので、API の場所（`API_URL`）と合言葉（`API_TOKEN`）を付けて呼べることです。
- `openEvents` は、5節で使います。

### 2.3 手を動かす: 画面のための API（BFF）

`app/api/tasks/route.ts` を作ります。

```ts
import { z } from 'zod';
import { ApiError, createTask, isStatus, listTasks } from '../../../lib/api.ts';

/** problem+json（第5部 第25章）で失敗を返す */
const problem = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Content-Type': 'application/problem+json' } });

/** GET /api/tasks?status=todo: 一覧を、画面に要る項目だけにして返す */
export async function GET(request: Request) {
  // クエリは、request.url（http://… から始まる文字）を URL にしてから読む
  const wanted = new URL(request.url).searchParams.get('status');
  if (wanted !== null && !isStatus(wanted)) return problem(400, { title: 'status は todo・doing・done のどれかです' });
  const { items } = await listTasks({ status: wanted ?? undefined });
  return Response.json(items.map(({ id, title, status }) => ({ id, title, status })));
}

const InputSchema = z.object({
  title: z.string('title は文字です').trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  dueDate: z.iso.date('dueDate は YYYY-MM-DD です').nullable().default(null),
});

/** POST /api/tasks: JSON を確かめてから、API に作ってもらう */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return problem(400, {
      title: '送られた内容が正しくありません',
      errors: parsed.error.issues.map((i) => ({ pointer: `#/${i.path.join('/')}`, detail: i.message })),
    });
  }
  try {
    const task = await createTask(parsed.data);
    return Response.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return problem(err.status, err.problem);
    throw err;
  }
}
```

```sh
$ curl http://localhost:9530/api/tasks
[{"id":1,"title":"牛乳を買う","status":"todo"},…]
$ curl 'http://localhost:9530/api/tasks?status=doing'
[{"id":2,"title":"第9部を読む","status":"doing"}]
$ curl -i -X POST http://localhost:9530/api/tasks -H 'Content-Type: application/json' -d '{"title":""}'
HTTP/1.1 400 Bad Request
content-type: application/problem+json
…
{"title":"送られた内容が正しくありません","errors":[{"pointer":"#/title","detail":"題名を入れてください"}]}
$ curl -X POST http://localhost:9530/api/tasks -H 'Content-Type: application/json' -d '{"title":"ねこにごはん"}'
{"id":6,"title":"ねこにごはん",…}
$ curl -X POST http://localhost:9530/api/tasks -H 'Content-Type: application/json' -d '{"title":"ねこにごはん"}'
{"title":"Conflict","detail":"同じ題名の、終わっていないタスクがあります"}
```

- `curl -i` は、応答のヘッダも出すオプションです。URL に `?` を含むときは、`'…'` で囲みます（zsh が `?` を特別な文字として扱うため）。
- クエリは、**`new URL(request.url).searchParams`** で読みます。`request.url` は `http://localhost:9530/api/tasks?status=doing` のような、全部入りの文字です。
- **`await request.json()`** で、送られた JSON を読みます。JSON でなければ失敗するので、`.catch(() => undefined)` で「無い」にしてから、Zod で確かめます（第7部 第38章）。
- `Response.json(値, { status, headers })` で、ステータスとヘッダを決められます。problem+json（第5部 第25章）は、`Content-Type` を `application/problem+json` にします。
- このような、**画面のために、裏の API をまとめたり、形を変えたりする入り口**を、BFF（Backend For Frontend）と呼びます。ブラウザは合言葉を知らずに、同じオリジンの `/api/tasks` を呼べます。一覧では、画面に要らない項目（`createdAt` など）を送りません。

> Next.js の画面から使うだけなら、この `/api/tasks` は要りません。ページは Server Component の中で API を読み（第47章）、書き換えは次の Server Action で行うからです。Route Handler は、**画面以外から呼ばれる入り口**（ほかのアプリ・スマホのアプリ・Webhook・ヘルスチェック・5節の SSE）に使います。

### 2.4 手を動かす: URL の中の値を受け取る

`app/api/tasks/[id]/route.ts` を作ります（`mkdir -p 'app/api/tasks/[id]'`。`[` `]` を含むので `'…'` で囲む）。

```ts
import { getTask } from '../../../../lib/api.ts';

export async function GET(_request: Request, { params }: RouteContext<'/api/tasks/[id]'>) {
  const { id } = await params;
  const task = /^[1-9][0-9]*$/.test(id) ? await getTask(Number(id)) : null;
  if (task === null) {
    return Response.json({ title: 'タスクが見つかりません' }, { status: 404, headers: { 'Content-Type': 'application/problem+json' } });
  }
  return Response.json(task);
}
```

```sh
$ curl http://localhost:9530/api/tasks/2
{"id":2,"title":"第9部を読む",…}
$ curl -i http://localhost:9530/api/tasks/abc
HTTP/1.1 404 Not Found
```

- ページと同じく、`[id]` のフォルダの名前が、URL の値の名前になります（第47章 6節）。値は、関数の**2つ目の引数**の `params` に、Promise で入っています。
- **`RouteContext<'/api/tasks/[id]'>`** は、Next.js が作る型です（`PageProps` と同じく、import せずに使えます）。`params` が `Promise<{ id: string }>` だと分かります。

---

## 3. Server Action: フォームから、サーバの関数を呼ぶ

### 3.1 'use server' は「ブラウザから呼べる、サーバの関数」の印

第48章の `'use client'` は「ここから先はブラウザでも動く」という印でした。**`'use server'`** は、その逆向きの印です。このファイルの関数は、**サーバでだけ動き、ブラウザからは呼び出すことだけができます**。

| | 中身が動く場所 | ブラウザに届くもの |
| --- | --- | --- |
| `'use client'` のファイルの部品 | サーバ（最初の HTML）とブラウザ | 部品のコード |
| `'use server'` のファイルの関数 | サーバだけ | 関数の ID（呼び出し方）だけ |

ブラウザで Server Action を呼ぶと、Next.js が、今のページの URL に `POST` を送ります。ヘッダの `Next-Action` に関数の ID、本文に引数（フォームの中身）が入ります。サーバはその ID の関数を呼び、結果と、作り直したページの中身を返します。第43章では、この `POST` と応答の読み方を、自分で `fetch` で書きました。

### 3.2 手を動かす: タスクを作るフォーム

`app/tasks/actions.ts` を作ります。この章の Server Action を、このファイルにまとめます。

```ts
'use server';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, createTask, deleteTask, isStatus, toFieldErrors, updateTask } from '../../lib/api.ts';

/** フォームの結果。エラーの文と、打った値（エラーのとき、入れ直さなくてよいように返す） */
export type FormState = {
  errors: { title?: string; dueDate?: string; form?: string };
  values: { title: string; dueDate: string };
};

// FormData の値は、文字か File。文字でなければ空とみなす
const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

const NewTaskSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  dueDate: z.union([z.literal(''), z.iso.date('締め切りは YYYY-MM-DD の形で入れてください')]),
});

/** 3.2節: タスクを作る。useActionState から呼ぶので、1つ目の引数は前の結果 */
export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { title: text(formData.get('title')), dueDate: text(formData.get('dueDate')) };
  // ブラウザで確かめていても、サーバでもう一度確かめる（4節。この関数には、誰でも POST できる）
  const parsed = NewTaskSchema.safeParse(values);
  if (!parsed.success) {
    const errors: FormState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'title' || key === 'dueDate') errors[key] ??= issue.message;
    }
    return { errors, values };
  }

  let id: number;
  try {
    const task = await createTask({ title: parsed.data.title, dueDate: parsed.data.dueDate === '' ? null : parsed.data.dueDate });
    id = task.id;
  } catch (err) {
    // API が断った理由（締め切りが過ぎている、同じ題名がある など）を、フォームに出す
    if (err instanceof ApiError && err.status < 500) {
      const fields = toFieldErrors(err.problem);
      if (fields.title === undefined && fields.dueDate === undefined) return { errors: { form: err.message }, values };
      return { errors: { title: fields.title, dueDate: fields.dueDate }, values };
    }
    throw err; // それ以外は error.tsx に任せる
  }
  // redirect は、特別なエラーを投げてここで止める。try の中で呼ぶと catch に捕まるので、外で呼ぶ
  redirect(`/tasks/${id}`);
}

/** 3.4節: 状態を変える。ボタンから、id・version・新しい状態を受け取る */
export async function setStatusAction(id: number, version: number, status: string): Promise<{ error: string | null }> {
  // 引数も、ブラウザから送られてくる値。型が付いていても、確かめる（4節）
  if (!Number.isInteger(id) || !Number.isInteger(version) || !isStatus(status)) return { error: '送られた値が正しくありません' };
  try {
    await updateTask({ id, version }, { status });
  } catch (err) {
    if (err instanceof ApiError && [404, 409, 412].includes(err.status)) {
      refresh(); // 最新の内容で、ページを作り直してもらう
      return { error: err.message };
    }
    throw err;
  }
  refresh();
  return { error: null };
}

/** 3.3節: 消す。bind で id と version を決めてから、フォームの action に渡す */
export async function deleteTaskAction(id: number, version: number): Promise<void> {
  if (!Number.isInteger(id) || !Number.isInteger(version)) return;
  try {
    await deleteTask({ id, version });
  } catch (err) {
    // ほかの人が先に変えていたら、消さずに、そのタスクのページに戻して知らせる
    if (err instanceof ApiError && err.status === 412) redirect(`/tasks/${id}?conflict=1`);
    if (!(err instanceof ApiError && err.status === 404)) throw err; // 404 は、もう消えている
  }
  redirect('/tasks');
}
```

ここでは、`createTaskAction` を見ます（`setStatusAction`・`deleteTaskAction` は3.3・3.4節）。

- 1行目の **`'use server'`** で、このファイルの export した関数が Server Action になります。export できるのは `async` の関数だけです（型は export できます）。
- 2つ目の引数の **`FormData`** は、フォームの中身です。`formData.get('title')` で、`name="title"` の入力欄の値が取れます。値は文字か File なので、`text()` で文字にそろえます。
- `z.iso.date()` は、`YYYY-MM-DD` の形の文字かを確かめる Zod の関数です。空の文字（締め切り無し）も許すために、`z.literal('')` との `union` にしています。
- 確かめて駄目なら、エラーの文と、打った値を返します。API が断ったとき（締め切りが過ぎている・同じ題名がある）も、同じ形で返します。
- 作れたら、**`redirect('/tasks/6')`** で、作ったタスクのページに移ります。`redirect` は、特別なエラーを投げて、そこで関数を止めます。`try` の中で呼ぶと `catch` に捕まってしまうので、`try` の外で呼びます。

フォームの部品 `components/TaskForm.tsx` を作ります。

```tsx
'use client';
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '../app/tasks/actions.ts';

const initialState: FormState = { errors: {}, values: { title: '', dueDate: '' } };

/** 送っている間は押せないボタン。useFormStatus は、<form> の中の部品で使う */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '作っています…' : '作る'}
    </button>
  );
}

export function TaskForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, initialState);
  const id = useId();
  const { errors, values } = state;
  return (
    // key: 結果が変わるたびに、入力欄を、返ってきた値で作り直す（React 19 は、送った後にフォームを空にするので）
    <form action={formAction} key={JSON.stringify(values)} noValidate>
      {errors.form && <p role="alert">{errors.form}</p>}
      <p>
        <label htmlFor={`${id}-title`}>題名</label>
        <br />
        <input
          id={`${id}-title`}
          name="title"
          defaultValue={values.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        {errors.title && <span id={`${id}-title-error`}> {errors.title}</span>}
      </p>
      <p>
        <label htmlFor={`${id}-due`}>締め切り</label>
        <br />
        <input
          id={`${id}-due`}
          name="dueDate"
          type="date"
          defaultValue={values.dueDate}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? `${id}-due-error` : undefined}
        />
        {errors.dueDate && <span id={`${id}-due-error`}> {errors.dueDate}</span>}
      </p>
      <SubmitButton />
    </form>
  );
}
```

- **`useActionState(action, 最初の値)`**（React 19）は、`[今の結果, フォームに渡す関数]` を返します。フォームを送ると、`action(前の結果, FormData)` が呼ばれ、返した値が次の「今の結果」になります。Server Action のエラーを、フォームに出すための Hook です。
- `<form action={formAction}>` のように、`action` に関数を渡します（第43章の `onSubmit` と `preventDefault` は要りません）。
- **`useFormStatus()`**（`react-dom`）は、自分を囲む `<form>` が送っている途中かを返します。`<form>` の**中の**部品で呼ぶ決まりなので、ボタンを `SubmitButton` に分けています。送っている間はボタンを押せないので、2回押して2つ作ってしまうことを防げます。
- エラーは、第45章と同じく、`aria-invalid` と `aria-describedby` で入力欄と結び付けます。
- React 19 は、`action` を使ったフォームを送ると、入力欄を空に戻します。エラーのときに打った値を残すため、返ってきた値を `defaultValue` に入れ、`key` を変えて、入力欄を作り直しています。
- `noValidate` は、ブラウザの組み込みの確かめ（`required` など）を止める属性です。ここでは、サーバで確かめた結果を見るために付けています。

ページ `app/tasks/new/page.tsx` を作ります（`mkdir app/tasks/new`）。

```tsx
import type { Metadata } from 'next';
import { TaskForm } from '../../../components/TaskForm.tsx';
import { createTaskAction } from '../actions.ts';

export const metadata: Metadata = { title: '新しいタスク' };

export default function NewTaskPage() {
  return (
    <>
      <h1>新しいタスク</h1>
      {/* 関数は渡せない（第48章 3.3節）が、Server Action は渡せる。ブラウザには「呼び出し方」だけが届く */}
      <TaskForm action={createTaskAction} />
    </>
  );
}
```

第48章 3.3節で、Server Component から Client Component に関数は渡せない、と学びました。**Server Action だけは例外**で、props で渡せます。ブラウザに届くのは関数の中身ではなく、呼び出し方（ID）だからです。

最後に、`app/tasks/page.tsx` の見出しの下に、`/tasks/new` へのリンクを足します。

```tsx
      <h1>タスクの一覧</h1>
      <p>
        <Link href="/tasks/new">新しいタスク</Link>
      </p>
```

`http://localhost:9530/tasks/new` を開いて、確かめます。

- 何も入れずに「作る」を押すと、「題名を入れてください」と出ます。
- 締め切りに過ぎた日を入れると、API が断った理由「締め切りが過ぎています」が出て、題名は残っています。
- 正しく入れると、作ったタスクのページに移ります。

これは、Flask で書いた次の流れと同じです。違うのは、URL とメソッドの組を自分で決めず、関数を `action` に渡すだけでよいことです。

```python
@app.post('/tasks/new')
def create_task():
    title = request.form.get('title', '').strip()
    if not title:
        return render_template('new.html', error='題名を入れてください', title=title)
    task = api.create_task(title)
    return redirect(url_for('show_task', id=task['id']))  # POST の後は、redirect（PRG）
```

### 3.3 手を動かす: 消すフォームと bind

`app/tasks/[id]/page.tsx` を、次のようにします。

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusButtons } from '../../../components/StatusButtons.tsx';
import { getTask } from '../../../lib/api.ts';
import { deleteTaskAction } from '../actions.ts';

/** URL の id を確かめて読む。数字でない・無いタスクなら notFound()（not-found.tsx を出す） */
async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const task = await loadTask(params);
  return { title: task.title };
}

export default async function TaskPage({ params, searchParams }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  const { conflict } = await searchParams;
  // bind: 1つ目の引数（this）は null。残りの引数が、前から順に決まった関数ができる
  const deleteThis = deleteTaskAction.bind(null, task.id, task.version);
  return (
    <>
      <h1>{task.title}</h1>
      {conflict !== undefined && <p role="alert">ほかの人が先に変えていたので、消しませんでした。最新の内容を出しています。</p>}
      <dl>
        <dt>締め切り</dt>
        <dd>{task.dueDate ?? 'なし'}</dd>
      </dl>
      <StatusButtons id={task.id} version={task.version} status={task.status} />
      {/* JavaScript が無くても動くフォーム。押すと、deleteThis がサーバで呼ばれる */}
      <form action={deleteThis}>
        <button type="submit">このタスクを消す</button>
      </form>
      <p>
        <Link href="/tasks">一覧に戻る</Link>
      </p>
    </>
  );
}
```

`deleteTaskAction`（3.2節の `actions.ts` の最後）は、`(id, version)` を受け取る関数です。フォームの `action` に渡す関数は、引数を受け取れません（FormData だけが来ます）。そこで、**`bind`** で引数を前もって決めます。

```ts
const deleteThis = deleteTaskAction.bind(null, task.id, task.version);
// deleteThis() と呼ぶと、deleteTaskAction(task.id, task.version) が呼ばれる
```

- `bind` は、JavaScript の関数が持つ関数です。1つ目の引数（`this` に入るもの）は使わないので `null` にします。
- 消せたら `/tasks` に移ります。ほかの人が先に変えていたら（412）、消さずに `/tasks/6?conflict=1` に移り、ページが知らせを出します。Flask の `flash()` の代わりに、URL で知らせています。

タスクのページで「このタスクを消す」を押して、一覧に戻ることを確かめます。

### 3.4 手を動かす: 状態を変えるボタンと useOptimistic

`components/StatusButtons.tsx` を作ります。

```tsx
'use client';
import { useOptimistic, useState, useTransition } from 'react';
import { setStatusAction } from '../app/tasks/actions.ts';
import { STATUSES, STATUS_LABELS, type Status } from '../lib/status.ts';

export function StatusButtons({ id, version, status }: { id: number; version: number; status: Status }) {
  // optimistic: トランジションの間だけ、仮の値。終わると、props の status（サーバで作り直した値）に戻る
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: Status) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatusAction(id, version, next);
      setError(result.error);
    });
  }

  return (
    <div>
      <p>
        状態: <strong>{STATUS_LABELS[optimistic]}</strong>
        {pending && '（保存しています…）'}
      </p>
      {STATUSES.filter((s) => s !== optimistic).map((s) => (
        <button key={s} type="button" disabled={pending} onClick={() => choose(s)}>
          {STATUS_LABELS[s]}にする
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

3.2節の `actions.ts` の `setStatusAction` を見てください。

- フォームを使わずに、ボタンの `onClick` から、普通の `async` 関数のように Server Action を呼べます（`await` すると、返した値が取れます）。
- 変えた後に **`refresh()`**（`next/cache`）を呼ぶと、ブラウザが今のページを、サーバで作り直してもらいます（第48章 6.3節の `router.refresh()` を、サーバの側から頼むもの）。ページの `task.version` も新しくなるので、続けて押せます。`refresh()` は、Server Action の中でだけ使えます。
- **`useOptimistic(値)`**（React 19）は、`[今出す値, 仮の値を決める関数]` を返します。トランジション（第48章 6.2節）の間だけ、仮の値を出し、終わると、渡した値（サーバで作り直した `status`）に戻ります。第43章 4.2節の楽観的な更新を、巻き戻しのコードを書かずにできます。失敗したときは、作り直したページの `status`（変わっていない値）に、自然に戻ります。
- `lib/api.ts` は `server-only` なので、`StatusButtons` からは、`lib/status.ts` の `STATUS_LABELS` を使います（2.2節）。

「作業中にする」を押すと、すぐに「状態: 作業中」になり、「（保存しています…）」が消えれば保存できています。`API_DELAY_MS=2000 npm run api` で API を遅くすると、違いがよく分かります。

---

## 4. Server Action の安全

Server Action は、ボタンの裏に隠れた関数に見えますが、**だれでも `POST` で呼べる入り口**です。ID はページの中に入っているので、DevTools で見て、自分で送ることができます。Express のルートを1つ作ったのと同じに考えます。

| 気をつけること | この章のコード |
| --- | --- |
| フォームの値は、ブラウザで確かめていても、サーバでもう一度確かめる | `createTaskAction` の Zod |
| `bind` した値や、関数の引数も、ブラウザを通って届く。書き換えて送れるので、確かめる | `setStatusAction`・`deleteTaskAction` の `Number.isInteger`・`isStatus` |
| 「だれが呼んだか」「その人が変えてよいか」を、関数の中で確かめる | 第10部（ログイン）で足す |
| 秘密の値を、返す値や `bind` に入れない | 合言葉は `lib/api.ts` の中だけで使う |

Next.js は、次のことはしてくれます。

- 送ってきたページのオリジン（`Origin` ヘッダ）が、このアプリと同じかを確かめます。ほかのサイトのフォームから、利用者のブラウザを使って送らせること（CSRF）を防ぎます。
- 送れる中身の大きさを、1MB までに決めています。
- どこからも使われていない Server Action は、ID を作りません（呼べません）。

---

## 5. SSE を Route Handler で中継する

第48章の練習問題8の `LiveRefresh` は、ブラウザから API（ポート 9500）に直接つなぐので、API に CORS で許してもらう必要がありました。Route Handler で中継すると、ブラウザは同じオリジンにつなぐだけで済み、合言葉も付けられます。

`app/api/events/route.ts` を作ります。

```ts
import { openEvents } from '../../../lib/api.ts';

export async function GET(request: Request) {
  // request.signal: ブラウザが接続を切ると中断される。渡しておくと、API へのつながりも一緒に切れる
  const upstream = await openEvents(request.signal);
  if (!upstream.ok || upstream.body === null) return new Response('API の知らせにつなげませんでした', { status: 502 });
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
```

- `fetch` の応答の `body` は、少しずつ届くデータの流れ（ストリーム）です。それをそのまま `new Response(body)` に入れると、届いた分から、ブラウザに流れます。
- `request.signal` は、ブラウザが接続を切ると「中断」になる印です。API への `fetch` に渡しておくと、ブラウザが切ったときに、API へのつながりも切れます。

`components/LiveRefresh.tsx`（第48章 練習問題8の模範解答と同じ）を作り、`app/layout.tsx` の `<main>` の下に置きます。

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TYPES = ['task.created', 'task.updated', 'task.deleted'];

export function LiveRefresh({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource(url);
    const onChange = () => router.refresh();
    for (const type of TYPES) source.addEventListener(type, onChange);
    return () => source.close();
  }, [url, router]);
  return null;
}
```

```tsx
        <main>{children}</main>
        {/* 同じオリジンの Route Handler（app/api/events/route.ts）につなぐ */}
        <LiveRefresh url="/api/events" />
```

`/tasks` を開いたまま、3つ目のターミナルで `curl` でタスクを足すと（第48章 6.3節）、一覧が増えます。`curl -N http://localhost:9530/api/events` で、中継された知らせを見ることもできます（`-N` は、届いた分からすぐ出すオプション。止めるのは Ctrl+C）。

---

## 6. どれを使うか

| したいこと | 使うもの |
| --- | --- |
| ページを作るためにデータを読む | Server Component の中で読む（第47章） |
| 画面から、作る・変える・消す | Server Action |
| 画面以外（ほかのアプリ・Webhook・ヘルスチェック・SSE）のための入り口 | Route Handler |
| 公開する API そのもの（いろいろなアプリから使う、たくさん呼ばれる） | Express などの、別の API のサーバ（第5〜7部） |

第8部と比べると、次のようになります。

| | 第8部（Vite + React） | Next.js（この章） |
| --- | --- | --- |
| 作る | `useMutation` で `POST /api/tasks` を `fetch` | `<form action={…}>` で Server Action |
| 送っている間 | `mutation.isPending` | `useFormStatus` の `pending` |
| エラーを出す | `mutation.error`（`ApiError`） | Server Action が返した値（`useActionState`） |
| 変えた後に読み直す | `invalidateQueries` | `refresh()`・`redirect()` |
| 楽観的な更新 | `onMutate` で書き換え、`onError` で巻き戻す | `useOptimistic`（巻き戻しは自動） |
| JavaScript が読み込まれる前 | 何もできない | `<form action>` は送れる |

最後の行は、**段階的な強化**（プログレッシブ・エンハンスメント）と呼ばれる性質です。Server Action を `action` に渡したフォームは、普通の HTML のフォームとしても送れるので、JavaScript が読み込まれる前でも動きます。Flask のフォームと同じです。

---

## まとめ

- Route Handler は `route.ts` に `GET`・`POST` などの関数を書く。`Request` を受け取り、`Response`（`Response.json`）を返す。画面以外のための入り口に使う。
- `'use server'` のファイルの `async` 関数は Server Action。サーバでだけ動き、ブラウザには呼び出し方だけが届く。
- `<form action={serverAction}>` で、フォームの中身（`FormData`）を Server Action に渡せる。`useActionState` で結果を受け取り、`useFormStatus` で送っている間を出す。
- 書き換えた後は、`redirect()` で別のページに移るか、`refresh()` で今のページを作り直してもらう。
- `bind` で引数を決めた Server Action を作れる。`useOptimistic` で、返事を待たずに新しい値を出せる。
- Server Action も Route Handler も、だれでも呼べる入り口。引数を必ず確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Next.js Docs「Mutating Data」: https://nextjs.org/docs/app/getting-started/mutating-data
- Next.js Docs「Forms」: https://nextjs.org/docs/app/guides/forms
- Next.js Docs「Route Handlers」: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js Docs「Data Security」: https://nextjs.org/docs/app/guides/data-security
- React Docs「useActionState」: https://react.dev/reference/react/useActionState
- React Docs「useFormStatus」: https://react.dev/reference/react-dom/hooks/useFormStatus
- React Docs「useOptimistic」: https://react.dev/reference/react/useOptimistic
- React Docs「'use server'」: https://react.dev/reference/rsc/use-server

---

前の章: [第48章 Server Components と Client Components](../ch48-server-client/README.md) ／ 第9部の目次: [../README.md](../README.md) ／ 次の章: [第50章 レンダリングとキャッシュの戦略](../ch50-rendering-cache/README.md)
