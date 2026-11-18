// 第54章 練習問題3: JWKS から、ID トークンを確かめる公開鍵を選ぶ（本文4節）
import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto';

export type JwtHeader = { alg?: unknown; kid?: unknown };

export function pickKey(keys: readonly JsonWebKey[], header: JwtHeader): KeyObject | null {
  // ここを書く
  void createPublicKey;
  throw new Error(`まだ書いていません: ${keys.length} ${JSON.stringify(header)}`);
}
