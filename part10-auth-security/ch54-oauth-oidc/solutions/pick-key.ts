// 第54章 練習問題3 の模範解答: JWKS から、ID トークンを確かめる公開鍵を選ぶ（本文4節）
import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto';

export type JwtHeader = { alg?: unknown; kid?: unknown };

export function pickKey(keys: readonly JsonWebKey[], header: JwtHeader): KeyObject | null {
  // 方式は、ヘッダの値ではなく、こちらが決めた RS256 だけ
  if (header.alg !== 'RS256') return null;
  const usable = keys.filter(
    (k) =>
      k.kty === 'RSA' &&
      (k.use === undefined || k.use === 'sig') && // 暗号化（enc）のための鍵は使わない
      (k.alg === undefined || k.alg === 'RS256'),
  );
  let jwk: JsonWebKey | undefined;
  if (header.kid === undefined) {
    // kid が無いときは、使える鍵が1つだけなら、それを使う（2つ以上なら、どれか分からない）
    jwk = usable.length === 1 ? usable[0] : undefined;
  } else {
    jwk = usable.find((k) => k.kid === header.kid);
  }
  if (jwk === undefined) return null;
  try {
    return createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    return null; // n・e が壊れているなど
  }
}
