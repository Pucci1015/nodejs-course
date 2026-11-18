// 練習問題2: テストで API を呼ぶ部品 createClient を書く

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
  // ここを書く
  void base;
  void timeoutMs;
  throw new Error('まだ書いていません');
}
