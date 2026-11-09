// 練習問題3: 署名付きの値を作る・確かめる
// テスト: node --test signed.test.mjs
import crypto from 'node:crypto';

/**
 * 値に署名を付ける。'値.署名' の形
 *   secrets は鍵の文字列、または鍵の配列（最初の鍵で署名する）。鍵は 32 文字以上。短ければ TypeError
 */
export function sign(value, secrets) {
  // ここを書く（いまは、値と鍵をつないだものの SHA-256 で、鍵の配列も長さも見ていない）
  const sig = crypto.createHash('sha256').update(value + secrets).digest('base64url');
  return `${value}.${sig}`;
}

/**
 * 署名を確かめて、正しければ値を、正しくなければ null を返す
 *   secrets が配列なら、どの鍵で署名したものでもよい。値の中に . があってもよい
 */
export function unsign(signed, secrets) {
  // ここを書く（いまは、最初の . で分けて、=== で比べている）
  const [value, sig] = signed.split('.');
  return sign(value, secrets) === `${value}.${sig}` ? value : null;
}

/**
 * JSON にできる値に、作った時刻を付けて署名する
 *   options.now: いまの時刻（ミリ秒）を返す関数。既定は Date.now
 */
export function signJson(data, secrets, { now = Date.now } = {}) {
  // ここを書く
  return sign(JSON.stringify(data), secrets);
}

/**
 * signJson で作ったものを確かめて、data を返す。正しくない・maxAgeMs より古いときは null
 */
export function unsignJson(token, secrets, { maxAgeMs, now = Date.now } = {}) {
  // ここを書く
  const v = unsign(token, secrets);
  return v === null ? null : JSON.parse(v);
}
