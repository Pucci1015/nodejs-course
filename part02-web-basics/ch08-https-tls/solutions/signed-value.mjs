// 練習問題7 の模範解答: HMAC で署名した値を作り、確かめる（署名付き Cookie の中身に使う）
// 確かめ方（~/dev/ch08/exercises で）: MODULE=../solutions/signed-value.mjs node --test signed-value.test.mjs
//
// 形式: 「中身.署名」
//   中身 = JSON {"v": 値, "exp": 期限（ミリ秒）または null} を base64url にしたもの
//   署名 = 中身の文字列に対する HMAC-SHA256 を base64url にしたもの
import crypto from 'node:crypto';

function mac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function sign(value, secret, { maxAgeSec, now = Date.now() } = {}) {
  if (secret.length < 16) throw new Error('秘密の鍵は16文字以上にしてください');
  let exp = null; // 期限が無い
  if (maxAgeSec !== undefined) exp = now + maxAgeSec * 1000;
  // 期限も中身に入れて、一緒に署名する（期限だけを書き換えられないように）
  const payload = Buffer.from(JSON.stringify({ v: value, exp })).toString('base64url');
  return `${payload}.${mac(payload, secret)}`;
}

export function verify(signed, secret, { now = Date.now() } = {}) {
  if (typeof signed !== 'string') return null;
  const parts = signed.split('.');
  if (parts.length !== 2) return null;
  const payload = parts[0];
  const given = Buffer.from(parts[1]);
  const expected = Buffer.from(mac(payload, secret));

  // timingSafeEqual は、長さが違うと例外を投げるので、先に長さを比べる
  if (given.length !== expected.length) return null;
  // === は最初に違う文字で終わるので、かかった時間から「何文字目まで合っているか」を推測されうる。
  // timingSafeEqual は、いつも全体を比べる
  if (!crypto.timingSafeEqual(given, expected)) return null;

  // 署名が正しいと分かってから、中身を読む
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (data.exp !== null && now > data.exp) return null; // 期限切れ
  return data.v;
}
