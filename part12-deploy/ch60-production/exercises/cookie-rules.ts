// 第60章 練習問題7: 本番の Cookie の設定と、名前の頭の決まり（本文7.3節）

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path?: string;
  domain?: string;
};

export function sessionCookie(env: 'development' | 'test' | 'production'): { name: string; options: CookieOptions } {
  // ここを書く
  throw new Error(`まだ書いていません: ${env}`);
}

export function cookieProblems(name: string, options: CookieOptions): string[] {
  // ここを書く
  throw new Error(`まだ書いていません: ${name} ${JSON.stringify(options)}`);
}

export function hstsHeader(env: 'development' | 'test' | 'production', maxAgeDays: number): string | undefined {
  // ここを書く
  throw new Error(`まだ書いていません: ${env} ${maxAgeDays}`);
}
