// 練習問題2 の模範解答: テストで API を呼ぶ部品

export interface ApiResponse {
  status: number;
  headers: Headers;
  /** JSON なら読んだ値、本文が空なら undefined、ほかは文字列 */
  body: unknown;
}

export interface Client {
  get(path: string): Promise<ApiResponse>;
  post(path: string, body: unknown): Promise<ApiResponse>;
  put(path: string, body: unknown): Promise<ApiResponse>;
  delete(path: string): Promise<ApiResponse>;
}

export function createClient(base: string, { timeoutMs = 5000 }: { timeoutMs?: number } = {}): Client {
  // 追加: 4つのメソッドの共通の部分
  async function request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const init: RequestInit = { method, signal: AbortSignal.timeout(timeoutMs) };
    if (body !== undefined) {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(`${base}${path}`, init);
    const text = await res.text();
    const type = res.headers.get('content-type') ?? '';
    let parsed: unknown;
    if (text === '') parsed = undefined;
    // application/json も application/problem+json も、「json」を含む
    else if (type.includes('json')) parsed = JSON.parse(text);
    else parsed = text;
    return { status: res.status, headers: res.headers, body: parsed };
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
  };
}
