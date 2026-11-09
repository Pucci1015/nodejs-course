// 練習問題2の模範解答

// 追加: Cookie の名前に使える文字（RFC 6265 の token。空白・; = , " などは使えない）
const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const name = part.slice(0, i).trim();
    if (!TOKEN.test(name) || Object.hasOwn(out, name)) continue; // 修正: 名前として正しくないものは無視。同じ名前は最初のもの
    let value = part.slice(i + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1); // 追加: "…" で囲まれた値
    try {
      value = decodeURIComponent(value);
    } catch {
      // 修正: %xx として読めない値は、例外にせず、そのまま
    }
    out[name] = value;
  }
  return out;
}

const SAME_SITE = { strict: 'Strict', lax: 'Lax', none: 'None' };

export function serializeCookie(name, value, { maxAge, expires, domain, path = '/', httpOnly = true, secure = false, sameSite = 'Lax' } = {}) {
  if (!TOKEN.test(name)) throw new TypeError(`Cookie の名前に使えない文字があります: ${JSON.stringify(name)}`);
  let s = `${name}=${encodeURIComponent(String(value))}`; // 修正: 値は必ずエンコード（; や空白や日本語が入っても壊れない）

  if (maxAge !== undefined) {
    if (!Number.isInteger(maxAge) || maxAge < 0) throw new RangeError(`Max-Age は 0 以上の整数（秒）です: ${maxAge}`);
    s += `; Max-Age=${maxAge}`;
  }
  if (expires !== undefined) {
    if (!(expires instanceof Date) || Number.isNaN(expires.getTime())) throw new TypeError('Expires は正しい Date です');
    s += `; Expires=${expires.toUTCString()}`; // 追加: 'Thu, 01 Jan 1970 00:00:00 GMT' の形
  }
  if (domain !== undefined) {
    if (!/^[A-Za-z0-9.-]+$/.test(domain)) throw new TypeError(`Domain に使えない文字があります: ${domain}`);
    s += `; Domain=${domain}`;
  }
  if (!/^\/[^;\s]*$/.test(path)) throw new TypeError(`Path は / で始まり、; や空白を含まない: ${path}`);
  s += `; Path=${path}`;
  if (httpOnly) s += '; HttpOnly';
  if (secure) s += '; Secure';

  if (sameSite !== undefined && sameSite !== null) {
    const v = SAME_SITE[String(sameSite).toLowerCase()];
    if (!v) throw new TypeError(`SameSite は Strict・Lax・None のどれか: ${sameSite}`);
    if (v === 'None' && !secure) throw new TypeError('SameSite=None には Secure が要ります'); // 追加: ブラウザが受け付けない
    s += `; SameSite=${v}`;
  }

  // 追加: 名前の頭の決まり（ブラウザは、守っていない Cookie を受け付けない）
  if (name.startsWith('__Secure-') && !secure) throw new TypeError('__Secure- で始まる Cookie には Secure が要ります');
  if (name.startsWith('__Host-') && (!secure || path !== '/' || domain !== undefined)) {
    throw new TypeError('__Host- で始まる Cookie は、Secure・Path=/・Domain 無しにします');
  }
  return s;
}

/** Cookie を消す Set-Cookie。作ったときと同じ path・domain を渡す */
export function clearCookie(name, { path = '/', domain, secure = false, sameSite = 'Lax' } = {}) {
  return serializeCookie(name, '', { maxAge: 0, expires: new Date(0), path, domain, secure, sameSite });
}
