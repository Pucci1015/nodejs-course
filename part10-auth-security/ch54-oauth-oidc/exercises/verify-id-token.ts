// 第54章 練習問題5: ID トークンを確かめて、失敗の理由を値で返す（本文4節の verifyIdToken を変える）
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';

export type IdTokenError = 'malformed' | 'alg' | 'key' | 'signature' | 'iss' | 'aud' | 'expired' | 'iat' | 'nonce';
export type IdTokenResult = { ok: true; claims: Record<string, unknown> } | { ok: false; error: IdTokenError };
export type IdTokenOptions = { issuer: string; clientId: string; nonce: string; now?: number; leewaySec?: number };

export function verifyIdToken(idToken: string, keys: readonly JsonWebKey[], options: IdTokenOptions): IdTokenResult {
  // ここを書く（練習問題3 の pickKey や、第52章 練習問題2 の decodePart を、このファイルにコピーして使ってよい）
  void createPublicKey;
  void verify;
  void keys;
  void options;
  throw new Error(`まだ書いていません: ${idToken}`);
}
