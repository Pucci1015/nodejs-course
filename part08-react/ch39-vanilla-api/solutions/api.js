// 第39章 練習問題3の模範解答: API を呼ぶ関数をまとめる

export class ApiError extends Error {
  constructor(status, problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

/**
 * @param {string} base  'http://127.0.0.1:9500' のような、API のオリジン
 * @param {typeof fetch} fetchFn  テストでは偽物を渡す
 */
export function createApi(base, fetchFn = fetch) {
  async function request(path, options = {}) {
    const res = await fetchFn(base + path, options);
    if (!res.ok) {
      const problem = await res.json().catch(() => ({}));
      throw new ApiError(res.status, problem);
    }
    return res.status === 204 ? null : res.json();
  }
  const json = (method, body, headers = {}) => ({ method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  return {
    async list() {
      const page = await request('/api/tasks?limit=100');
      return page.items;
    },
    create(input) {
      return request('/api/tasks', json('POST', input));
    },
    update(task, changes) {
      return request(`/api/tasks/${task.id}`, json('PATCH', changes, { 'If-Match': `"${task.version}"` }));
    },
    async remove(task) {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
    },
  };
}
