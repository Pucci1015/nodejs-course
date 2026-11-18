// 第52章 練習問題1: 環境変数から、セッションの Cookie の名前と属性を決める（本文3節）

export type Env = Record<string, string | undefined>;

export type SessionCookie = {
  name: string;
  cookie: { httpOnly: true; sameSite: 'lax'; secure: boolean; path: '/'; maxAge: number };
};

export function cookieOptions(env: Env): SessionCookie {
  // ここを書く
  void env;
  throw new Error('まだ書いていません');
}
