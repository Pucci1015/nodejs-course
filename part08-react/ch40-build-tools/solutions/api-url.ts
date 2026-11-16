// 第40章 練習問題3の模範解答: API の URL を組み立てる

export type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * @param base  '' （プロキシを使う）か 'http://127.0.0.1:9500'（最後の / はあってもなくてもよい）
 * @param path  '/api/tasks' のように / で始まる
 */
export function apiUrl(base: string, path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const q = params.toString();
  return `${base.replace(/\/+$/, '')}${path}${q === '' ? '' : `?${q}`}`;
}
