// Cookie を読む・書く、いちばん簡単な関数（第22章 3節。サンプルで使う）
// 練習問題5で、名前と値の確かめや、属性の決まりを足した版を作る

/** 'a=1; b=hello%20world' → { a: '1', b: 'hello world' }。同じ名前は最初のもの */
export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const name = part.slice(0, i).trim();
    if (!name || Object.hasOwn(out, name)) continue;
    let value = part.slice(i + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // %xx として読めないものは、そのまま
    }
    out[name] = value;
  }
  return out;
}

/** Set-Cookie ヘッダの値を作る。値は URL 用にエンコードする */
export function serializeCookie(name, value, { maxAge, path = '/', httpOnly = true, secure = false, sameSite = 'Lax' } = {}) {
  let s = `${name}=${encodeURIComponent(value)}; Path=${path}`;
  if (maxAge !== undefined) s += `; Max-Age=${maxAge}`;
  if (httpOnly) s += '; HttpOnly';
  if (secure) s += '; Secure';
  if (sameSite) s += `; SameSite=${sameSite}`;
  return s;
}
