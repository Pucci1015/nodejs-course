// 第55章 練習問題1 の模範解答: CSP のヘッダの値を作る（本文3節）

export type CspOptions = {
  /** リクエストごとの nonce（base64 の文字だけ）。無ければ script-src に nonce を書かない */
  nonce?: string;
  /** fetch などでつないでよい、ほかのオリジン（例: 'https://api.example.com'） */
  connectSrc?: string[];
};

export function buildCsp(options: CspOptions = {}): string {
  const { nonce, connectSrc = [] } = options;
  // ヘッダの値に ; や空白、' が混ざると、別の指示を書き足せてしまう。決まった文字だけを許す
  if (nonce !== undefined && !/^[A-Za-z0-9+/]+={0,2}$/.test(nonce)) throw new Error('nonce は base64 の文字だけにしてください');
  for (const origin of connectSrc) {
    // URL として読めて、https で、パスもクエリも無い（元の文字列とオリジンが一致する）ものだけ
    let ok: boolean;
    try {
      const url = new URL(origin);
      ok = url.protocol === 'https:' && url.origin === origin;
    } catch {
      ok = false;
    }
    if (!ok) throw new Error(`connectSrc はオリジン（https://名前）だけにしてください: ${origin}`);
  }
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', nonce === undefined ? ["'self'"] : ["'self'", `'nonce-${nonce}'`]],
    ['style-src', ["'self'"]],
    ['img-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...connectSrc]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'none'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}
