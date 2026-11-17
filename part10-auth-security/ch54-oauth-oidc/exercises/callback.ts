// 第54章 練習問題1: IdP から戻ってきた URL を読む（本文3・5節）

export type CallbackResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'state' | 'denied' | 'error' | 'missing_code'; error?: string };

export function parseCallback(url: string, expectedState: string): CallbackResult {
  // ここを書く
  throw new Error(`まだ書いていません: ${url} ${expectedState}`);
}
