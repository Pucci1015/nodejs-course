// テストのための、偽のタスク管理 API（第8部の成果物の test/fake-api.ts と同じ）。メモリの上で、第7部の API と同じように答える
// （本物と同じ: ページ分け・If-Match・412・409（作業中は3個まで）・422・冪等キー）

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

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' } });
const problem = (status: number, detail: string, errors?: { pointer: string; detail: string }[]) =>
  json(status, { type: 'about:blank', title: String(status), status, detail, ...(errors ? { errors } : {}) });

export function createFakeApi(seed: Partial<FakeTask>[] = []) {
  let nextId = 1;
  const tasks = new Map<number, FakeTask>();
  const keys = new Map<string, FakeTask>();
  const calls: Call[] = [];
  let failNext: Response | null = null;

  function add(t: Partial<FakeTask>): FakeTask {
    const id = nextId++;
    const now = new Date(Date.now() - (1000 - id) * 60_000).toISOString(); // 後に足したものほど新しい
    const task: FakeTask = { id, title: `タスク${id}`, status: 'todo', dueDate: null, createdAt: now, updatedAt: now, completedAt: null, version: 1, ...t };
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
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://localhost');
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
      if (t.length < 1 || t.length > 100) return problem(422, '入力が正しくありません', [{ pointer: '#/title', detail: '題名は 1〜100 文字です' }]);
      if (dueDate !== null && dueDate < today()) return problem(422, '入力が正しくありません', [{ pointer: '#/dueDate', detail: '締め切りが過ぎています' }]);
      if ([...tasks.values()].some((x) => x.title === t && x.status !== 'done')) return problem(409, '同じ題名の、終わっていないタスクがあります');
      const task = add({ title: t, dueDate, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      if (key !== null) keys.set(key, task);
      return json(201, task);
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
        if (patch.title !== undefined && patch.title.trim() === '') return problem(422, '入力が正しくありません', [{ pointer: '#/title', detail: '題名は 1〜100 文字です' }]);
        if (patch.status === 'doing' && task.status !== 'doing' && [...tasks.values()].filter((x) => x.status === 'doing').length >= 3) {
          return problem(409, '作業中のタスクは 3 個までです');
        }
        const completedAt = patch.status === undefined ? task.completedAt : patch.status === 'done' ? new Date().toISOString() : null;
        return json(200, change(task, { ...patch, completedAt }));
      }
    }
    return problem(404, 'ありません');
  }

  return {
    fetch: handle,
    tasks,
    calls,
    /** ほかの人が、そのタスクの題名を変えたことにする（version が上がる） */
    changeByOther: (id: number, title: string) => change(tasks.get(id)!, { title }),
    /** 次の1回だけ、この応答を返す */
    failNext: (status: number, detail: string) => {
      failNext = problem(status, detail);
    },
  };
}
