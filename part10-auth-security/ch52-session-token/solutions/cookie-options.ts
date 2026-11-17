// 第52章 練習問題1 の模範解答: 環境変数から、セッションの Cookie の名前と属性を決める（本文3節）

export type Env = Record<string, string | undefined>;

export type SessionCookie = {
  name: string;
  cookie: { httpOnly: true; sameSite: 'lax'; secure: boolean; path: '/'; maxAge: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function cookieOptions(env: Env): SessionCookie {
  const production = env.NODE_ENV === 'production';
  const daysText = env.SESSION_DAYS ?? '7';
  // Number('') は 0、Number(' 3 ') は 3、Number('1e1') は 10 になるので、先に「数字だけか」を確かめる
  if (!/^[0-9]+$/.test(daysText)) throw new Error('SESSION_DAYS は 1〜30 の整数にしてください');
  const days = Number(daysText);
  if (days < 1 || days > 30) throw new Error('SESSION_DAYS は 1〜30 の整数にしてください');
  return {
    // __Host- の名前は「Secure・Path=/・Domain なし」のときだけブラウザが受け取る（第4部 第22章 2.2節）。
    // HTTPS の本番だけで使う（開発の http://127.0.0.1 では、ブラウザが受け取らない）
    name: production ? '__Host-sid' : 'sid',
    cookie: { httpOnly: true, sameSite: 'lax', secure: production, path: '/', maxAge: days * DAY_MS },
  };
}
