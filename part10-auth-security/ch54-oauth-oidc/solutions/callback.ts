// 第54章 練習問題1 の模範解答: IdP から戻ってきた URL を読む（本文3・5節）

export type CallbackResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'state' | 'denied' | 'error' | 'missing_code'; error?: string };

export function parseCallback(url: string, expectedState: string): CallbackResult {
  const params = new URL(url).searchParams;
  // 自分が始めたログインでなければ、ほかの値（error も code も）は見ない
  if (expectedState === '' || params.get('state') !== expectedState) return { ok: false, reason: 'state' };
  const error = params.get('error');
  if (error === 'access_denied') return { ok: false, reason: 'denied', error };
  if (error !== null) return { ok: false, reason: 'error', error };
  const code = params.get('code');
  if (code === null || code === '') return { ok: false, reason: 'missing_code' };
  return { ok: true, code };
}
