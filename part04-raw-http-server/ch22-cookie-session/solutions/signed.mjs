// 練習問題6の模範解答
import crypto from 'node:crypto';

const MIN_SECRET = 32; // 追加: 短い鍵は、総当たりで見つけられやすい

function checkSecret(secret) {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET) throw new TypeError(`鍵は ${MIN_SECRET} 文字以上の文字列にしてください`);
}

// 修正: 「値 + 鍵」の SHA-256 ではなく、HMAC を使う（鍵付きのハッシュのための、決まった作り方）
const mac = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

export function sign(value, secrets) {
  const [current] = [secrets].flat(); // 追加: 鍵の配列なら、最初（いまの鍵）で署名する
  checkSecret(current);
  return `${value}.${mac(String(value), current)}`;
}

export function unsign(signed, secrets) {
  const list = [secrets].flat();
  list.forEach(checkSecret);
  if (typeof signed !== 'string') return null;
  const i = signed.lastIndexOf('.'); // 修正: 値の中に . があってもよいように、最後の . で分ける
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const given = Buffer.from(signed.slice(i + 1));
  // 追加: 前の鍵でも確かめる（鍵を取り替えた直後に、前の鍵で署名した Cookie を持っている人のため）
  for (const secret of list) {
    const expected = Buffer.from(mac(value, secret));
    // 修正: === ではなく timingSafeEqual。長さが違うと例外なので、先に比べる
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return value;
  }
  return null;
}

export function signJson(data, secrets, { now = Date.now } = {}) {
  // 追加: 作った時刻（iat）を入れておき、確かめるときに古すぎないかを見る
  const payload = Buffer.from(JSON.stringify({ d: data, iat: now() })).toString('base64url');
  return sign(payload, secrets);
}

export function unsignJson(token, secrets, { maxAgeMs, now = Date.now } = {}) {
  const payload = unsign(token, secrets);
  if (payload === null) return null;
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed?.iat !== 'number') return null;
  if (maxAgeMs !== undefined && now() - parsed.iat > maxAgeMs) return null; // 追加: 古すぎる
  return parsed.d;
}
