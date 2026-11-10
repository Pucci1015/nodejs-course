// 練習問題3 の模範解答
export function isAllowedOrigin(origin, allowed) {
  return typeof origin === 'string' && allowed.includes(origin);
}

export function parseChatMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: 'JSON ではありません' };
  }
  if (msg === null || typeof msg !== 'object' || msg.type !== 'chat') {
    return { ok: false, error: 'type は chat です' };
  }
  if (typeof msg.text !== 'string') return { ok: false, error: 'text は文字列です' };
  const text = msg.text.trim();
  if (text.length < 1 || text.length > 500) return { ok: false, error: 'text は 1〜500 文字です' };
  return { ok: true, value: { type: 'chat', text } };
}
