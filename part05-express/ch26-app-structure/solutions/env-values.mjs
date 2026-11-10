// 練習問題1 の模範解答
const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

export function readPort(text) {
  if (text === undefined) return { ok: true, value: 3000 };
  if (!/^[0-9]{1,5}$/.test(text)) return { ok: false, error: 'PORT は 0〜65535 の整数です' };
  const port = Number(text);
  if (port > 65535) return { ok: false, error: 'PORT は 0〜65535 の整数です' };
  return { ok: true, value: port };
}

export function readLogLevel(text) {
  if (text === undefined) return { ok: true, value: 'info' };
  if (!LEVELS.includes(text)) return { ok: false, error: `LOG_LEVEL は ${LEVELS.join('・')} のどれかです` };
  return { ok: true, value: text };
}
