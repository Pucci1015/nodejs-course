// 練習問題7・12 の模範解答: Cookie ヘッダの解析（問題7）と、Set-Cookie ヘッダの組み立て（問題12）
// 確かめ方（~/dev/ch07/exercises で）: MODULE=../solutions/cookie.mjs node --test cookie.test.mjs

// 問題7: Cookie ヘッダ 'a=1; b=2' を { a: '1', b: '2' } にする
export function parseCookie(header) {
  const cookies = {};
  if (header === undefined) return cookies;
  for (let part of header.split(';')) {
    part = part.trim();
    if (part === '') continue; // 空の部分は飛ばす
    const eq = part.indexOf('='); // 値に = が入ることがあるので、最初の = で分ける
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    let value = part.slice(eq + 1).trim();
    if (cookies[name] !== undefined) continue; // 同じ名前は最初のものを使う
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      value = decodeURIComponent(value);
    } catch {
      // 戻せない値（%E5%B1 など）は、そのまま使う。Cookie は利用者が書き換えられるので、例外で止まらないようにする
    }
    cookies[name] = value;
  }
  return cookies;
}

// 問題12: Cookie の名前に使えない文字（空白・区切り文字など）
const BAD_NAME_CHARS = ' \t;=,"()<>@:\\/[]?{}';

function checkName(name) {
  if (name === '') throw new TypeError('Cookie の名前が空です');
  for (const ch of name) {
    // 英数字と一部の記号（ASCII の文字）だけ。日本語などは charCodeAt が 127 より大きい
    if (BAD_NAME_CHARS.includes(ch) || ch.charCodeAt(0) > 126 || ch.charCodeAt(0) < 33) {
      throw new TypeError(`Cookie の名前に使えない文字があります: ${name}`);
    }
  }
}

// 問題12: serializeCookie('sid', 'abc', { maxAge: 3600, path: '/', httpOnly: true })
//   → 'sid=abc; Max-Age=3600; Path=/; HttpOnly'
export function serializeCookie(name, value, options = {}) {
  checkName(name);
  // 値に ; や空白、日本語が入っても壊れないように、パーセントエンコードする
  let text = `${name}=${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    if (!Number.isInteger(options.maxAge)) throw new TypeError('maxAge は整数（秒）で指定してください');
    text += `; Max-Age=${options.maxAge}`;
  }
  if (options.expires !== undefined) {
    if (!(options.expires instanceof Date)) throw new TypeError('expires は Date で指定してください');
    text += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.domain) text += `; Domain=${options.domain}`;
  if (options.path) text += `; Path=${options.path}`;
  if (options.httpOnly) text += '; HttpOnly';
  if (options.secure) text += '; Secure';
  if (options.sameSite !== undefined) {
    const names = { strict: 'Strict', lax: 'Lax', none: 'None' }; // 大文字・小文字を問わないので、小文字にしてから探す
    const sameSite = names[options.sameSite.toLowerCase()];
    if (sameSite === undefined) throw new TypeError(`sameSite は Strict / Lax / None のどれかです: ${options.sameSite}`);
    if (sameSite === 'None' && !options.secure) throw new TypeError('SameSite=None には Secure が必要です');
    text += `; SameSite=${sameSite}`;
  }
  return text;
}
