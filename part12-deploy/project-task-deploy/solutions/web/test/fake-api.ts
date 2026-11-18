// テストのための、偽のタスク管理 API。fetch の代わりに使い、メモリの上で第7部の API と同じように答える
// （本物と同じ: ページ分け・If-Match・412・409（作業中は3個まで）・422・冪等キー）
// 追加（第10部）: ログイン。/api/auth/… に答え、ログインしていなければ /api/tasks と /api/events は 401
// 追加（第12部）: 添付ファイル（/api/tasks/:id/attachments）。中身は見ず、名前と大きさだけを覚える

export type FakeTask = {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  version: number;
};

export type Call = { method: string; path: string; body: unknown; headers: Headers };

/** 追加（第12部） */
export type FakeAttachment = {
  id: string;
  taskId: number;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
};
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
const problem = (status: number, detail: string, errors?: { pointer: string; detail: string }[]) =>
  json(status, { type: 'about:blank', title: String(status), status, detail, ...(errors ? { errors } : {}) });

/** 追加（第10部）: 偽の API が知っている人（パスワードは平文。テストのためだけ） */
type Account = { id: number; email: string; password: string; verified: boolean };
export const PASSWORD = 'purple-otter-rides-91';
/** メールのリンクの #token= に入っている、使えるトークン（43 文字） */
export const VERIFY_TOKEN = 'v'.repeat(43);
export const RESET_TOKEN = 'r'.repeat(43);

/**
 * @param options.loggedIn  追加（第10部）: 最初からログインしているか（既定は alice としてログインしている）
 */
export function createFakeApi(seed: Partial<FakeTask>[] = [], { loggedIn = true }: { loggedIn?: boolean } = {}) {
  const accounts: Account[] = [
    { id: 1, email: 'alice@example.com', password: PASSWORD, verified: true },
    { id: 2, email: 'carol@example.com', password: PASSWORD, verified: false }, // 確認がまだ
  ];
  let me: Account | null = loggedIn ? (accounts[0] ?? null) : null;
  let nextId = 1;
  const tasks = new Map<number, FakeTask>();
  const keys = new Map<string, FakeTask>();
  const calls: Call[] = [];
  let failNext: Response | null = null;
  const attachments: FakeAttachment[] = []; // 追加（第12部）

  function add(t: Partial<FakeTask>): FakeTask {
    const id = nextId++;
    const now = new Date(Date.now() - (1000 - id) * 60_000).toISOString(); // 後に足したものほど新しい
    const task: FakeTask = {
      id,
      title: `タスク${id}`,
      status: 'todo',
      dueDate: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      version: 1,
      ...t,
    };
    tasks.set(task.id, task);
    return task;
  }
  seed.forEach(add);

  function change(task: FakeTask, patch: Partial<FakeTask>): FakeTask {
    const updated = { ...task, ...patch, updatedAt: new Date().toISOString(), version: task.version + 1 };
    tasks.set(task.id, updated);
    return updated;
  }

  async function handle(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      'http://localhost',
    );
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname + url.search, body, headers });
    await Promise.resolve();
    if (failNext) {
      const r = failNext;
      failNext = null;
      return r;
    }

    // 追加（第10部）: ログイン
    if (url.pathname.startsWith('/api/auth/')) {
      const b = (body ?? {}) as { email?: string; password?: string; token?: string };
      const account = accounts.find((a) => a.email === b.email?.trim().toLowerCase());
      switch (`${method} ${url.pathname}`) {
        case 'GET /api/auth/me':
          return me ? json(200, { id: me.id, email: me.email }) : problem(401, 'ログインしてください');
        case 'POST /api/auth/login':
          if (!account || account.password !== b.password) return problem(401, 'メールアドレスかパスワードが違います');
          if (!account.verified)
            return json(403, {
              type: 'urn:task-api:email-not-verified',
              title: '403',
              status: 403,
              detail: 'メールアドレスの確認がまだです',
            });
          me = account;
          return new Response(null, { status: 204 });
        case 'POST /api/auth/logout':
          me = null;
          return new Response(null, { status: 204 });
        case 'POST /api/auth/register':
          if ((b.password ?? '').length < 12)
            return problem(422, '入力が正しくありません', [
              { pointer: '#/password', detail: 'パスワードは 12 文字以上にしてください' },
            ]);
          return json(202, { detail: 'メールを送りました' });
        case 'POST /api/auth/resend-verification':
        case 'POST /api/auth/forgot-password':
          return json(202, { detail: 'メールを送りました' });
        case 'POST /api/auth/verify-email':
          return b.token === VERIFY_TOKEN
            ? new Response(null, { status: 204 })
            : problem(400, 'リンクが正しくないか、期限が切れています');
        case 'POST /api/auth/reset-password':
          if (b.token !== RESET_TOKEN) return problem(400, 'リンクが正しくないか、期限が切れています');
          if ((b.password ?? '').length < 12)
            return problem(422, '入力が正しくありません', [
              { pointer: '#/password', detail: 'パスワードは 12 文字以上にしてください' },
            ]);
          return new Response(null, { status: 204 });
      }
      return problem(404, 'ありません');
    }
    if (me === null && (url.pathname.startsWith('/api/tasks') || url.pathname === '/api/events'))
      return problem(401, 'ログインしてください');

    if (url.pathname === '/api/tasks' && method === 'GET') {
      const statuses = url.searchParams.get('status')?.split(',');
      const sort = url.searchParams.get('sort') ?? '-createdAt';
      const limit = Number(url.searchParams.get('limit') ?? '20');
      const offset = Number(url.searchParams.get('cursor') ?? '0');
      const key = sort.replace(/^-/, '') as 'createdAt' | 'dueDate' | 'title';
      const dir = sort.startsWith('-') ? -1 : 1;
      const list = [...tasks.values()]
        .filter((t) => !statuses || statuses.includes(t.status))
        .sort((a, b) => {
          const x = a[key];
          const y = b[key];
          if (x === y) return a.id - b.id;
          if (x === null) return 1; // 締め切りの無いものは最後
          if (y === null) return -1;
          return x < y ? -dir : dir;
        });
      const items = list.slice(offset, offset + limit);
      return json(200, { items, nextCursor: offset + limit < list.length ? String(offset + limit) : null });
    }

    if (url.pathname === '/api/tasks' && method === 'POST') {
      const key = headers.get('Idempotency-Key');
      const old = key === null ? undefined : keys.get(key);
      if (old) return json(201, old);
      const { title, dueDate } = body as { title: string; dueDate: string | null };
      const t = title.trim();
      if (t.length < 1 || t.length > 100)
        return problem(422, '入力が正しくありません', [{ pointer: '#/title', detail: '題名は 1〜100 文字です' }]);
      if (dueDate !== null && dueDate < today())
        return problem(422, '入力が正しくありません', [{ pointer: '#/dueDate', detail: '締め切りが過ぎています' }]);
      if ([...tasks.values()].some((x) => x.title === t && x.status !== 'done'))
        return problem(409, '同じ題名の、終わっていないタスクがあります');
      const task = add({ title: t, dueDate, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      if (key !== null) keys.set(key, task);
      return json(201, task);
    }

    // 追加（第12部）: 添付ファイル。種類は、送られた Content-Type で見る（本物は中身で見る）
    const am = /^\/api\/tasks\/(\d+)\/attachments(?:\/([^/]+))?$/.exec(url.pathname);
    if (am) {
      const taskId = Number(am[1]);
      if (!tasks.has(taskId)) return problem(404, 'タスクがありません');
      if (am[2] === undefined && method === 'GET')
        return json(200, { items: attachments.filter((a) => a.taskId === taskId) });
      if (am[2] === undefined && method === 'POST') {
        const file = init.body instanceof Blob ? init.body : null;
        if (file === null || file.size === 0) return problem(400, 'ファイルがありません');
        if (!IMAGE_TYPES.includes(headers.get('Content-Type') ?? ''))
          return problem(415, 'PNG・JPEG・GIF・WebP の画像だけを受け付けます');
        const id = `00000000-0000-4000-8000-${String(attachments.length + 1).padStart(12, '0')}`;
        const a: FakeAttachment = {
          id,
          taskId,
          fileName: url.searchParams.get('name') ?? 'file',
          contentType: headers.get('Content-Type') ?? '',
          size: file.size,
          createdAt: new Date().toISOString(),
          url: `/api/tasks/${taskId}/attachments/${id}/content`,
        };
        attachments.push(a);
        return json(201, a);
      }
      const i = attachments.findIndex((a) => a.taskId === taskId && a.id === am[2]);
      if (i !== -1 && method === 'DELETE') {
        attachments.splice(i, 1);
        return new Response(null, { status: 204 });
      }
      return problem(404, '添付ファイルはありません');
    }

    const m = /^\/api\/tasks\/(\d+)$/.exec(url.pathname);
    const task = m ? tasks.get(Number(m[1])) : undefined;
    if (m && !task) return problem(404, 'タスクがありません');
    if (task) {
      if (method === 'GET') return json(200, task);
      const ifMatch = headers.get('If-Match');
      if (ifMatch === null) return problem(428, 'If-Match に、読んだときの ETag を入れて送ってください');
      if (ifMatch !== `"${task.version}"`) return problem(412, 'ほかの人が先に変えました。読み直してください');
      if (method === 'DELETE') {
        tasks.delete(task.id);
        return new Response(null, { status: 204 });
      }
      if (method === 'PATCH') {
        const patch = body as Partial<FakeTask>;
        if (patch.title !== undefined && patch.title.trim() === '')
          return problem(422, '入力が正しくありません', [{ pointer: '#/title', detail: '題名は 1〜100 文字です' }]);
        if (
          patch.status === 'doing' &&
          task.status !== 'doing' &&
          [...tasks.values()].filter((x) => x.status === 'doing').length >= 3
        ) {
          return problem(409, '作業中のタスクは 3 個までです');
        }
        const completedAt =
          patch.status === undefined ? task.completedAt : patch.status === 'done' ? new Date().toISOString() : null;
        return json(200, change(task, { ...patch, completedAt }));
      }
    }
    return problem(404, 'ありません');
  }

  return {
    fetch: handle,
    tasks,
    calls,
    attachments, // 追加（第12部）
    /** ほかの人が、そのタスクの題名を変えたことにする（version が上がる） */
    changeByOther: (id: number, title: string) => change(tasks.get(id)!, { title }),
    /** 追加（第10部）: セッションが切れたことにする（この後は 401） */
    expireSession: () => {
      me = null;
    },
    /** 次の1回だけ、この応答を返す */
    failNext: (status: number, detail: string) => {
      failNext = problem(status, detail);
    },
  };
}
