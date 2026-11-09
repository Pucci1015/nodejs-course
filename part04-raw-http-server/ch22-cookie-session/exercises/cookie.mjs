// 練習問題2: Cookie を読む・書く関数を、決まりどおりにする
// テスト: node --test cookie.test.mjs

/**
 * Cookie ヘッダを読む。'a=1; b=hello%20world' → { a: '1', b: 'hello world' }
 *   名前として正しくないものは無視する。同じ名前は最初のもの。"…" で囲まれた値は外す
 *   %xx として読めない値は、そのまま
 */
export function parseCookies(header = '') {
  // ここを書く
  const out = {};
  for (const part of header.split('; ')) {
    const [name, value] = part.split('=');
    out[name] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Set-Cookie ヘッダの値を作る
 *   options: maxAge（秒）、expires（Date）、domain、path（既定 '/'）、httpOnly（既定 true）、secure（既定 false）、sameSite（既定 'Lax'）
 *   決まりに合わないときは TypeError か RangeError（README の表）
 */
export function serializeCookie(name, value, { maxAge, expires, domain, path = '/', httpOnly = true, secure = false, sameSite = 'Lax' } = {}) {
  // ここを書く
  let s = `${name}=${value}; Path=${path}`;
  if (maxAge) s += `; Max-Age=${maxAge}`;
  if (expires) s += `; Expires=${expires}`;
  if (domain) s += `; Domain=${domain}`;
  if (httpOnly) s += '; HttpOnly';
  if (secure) s += '; Secure';
  if (sameSite) s += `; SameSite=${sameSite}`;
  return s;
}

/** Cookie を消す Set-Cookie（Max-Age=0 と、1970年の Expires）。作ったときと同じ path・domain を渡す */
export function clearCookie(name, { path = '/', domain, secure = false, sameSite = 'Lax' } = {}) {
  // ここを書く
  return serializeCookie(name, '', { path, domain, secure, sameSite });
}
