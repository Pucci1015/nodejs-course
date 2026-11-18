// 第60章 練習問題7の模範解答: 本番の Cookie の設定と、名前の頭の決まり（本文7.3節）

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path?: string;
  domain?: string;
};

export function sessionCookie(env: 'development' | 'test' | 'production'): { name: string; options: CookieOptions } {
  const production = env === 'production';
  return {
    // __Host- は「HTTPS で、このホストだけ、パスは /」をブラウザに守らせる名前（第4部 第22章 2.2節）
    name: production ? '__Host-sid' : 'sid',
    options: { httpOnly: true, secure: production, sameSite: 'lax', path: '/' },
  };
}

export function cookieProblems(name: string, options: CookieOptions): string[] {
  const problems: string[] = [];
  if (name.startsWith('__Host-')) {
    if (!options.secure) problems.push('__Host- には Secure が要ります');
    if (options.path !== '/') problems.push('__Host- の path は / だけです');
    if (options.domain !== undefined) problems.push('__Host- には domain を付けられません');
  } else if (name.startsWith('__Secure-')) {
    if (!options.secure) problems.push('__Secure- には Secure が要ります');
  }
  if (options.sameSite === 'none' && !options.secure) problems.push('SameSite=None には Secure が要ります');
  return problems;
}

export function hstsHeader(env: 'development' | 'test' | 'production', maxAgeDays: number): string | undefined {
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0) throw new Error('日数は 0 以上の整数にしてください');
  // ブラウザは http の応答の HSTS を無視するが、mkcert で https://localhost を使っているときに送ると、
  // localhost のほかのアプリまで https でしか開けなくなる。だから本番だけで送る
  if (env !== 'production') return undefined;
  return `max-age=${maxAgeDays * 24 * 60 * 60}; includeSubDomains`;
}
