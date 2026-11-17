// 第52章 練習問題6: JWT を確かめて、失敗の理由を Result 型で返す（本文6・7節）
import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtError = 'malformed' | 'alg' | 'signature' | 'expired' | 'not_yet_valid' | 'claim';
export type VerifyResult = { ok: true; claims: Record<string, unknown> } | { ok: false; error: JwtError };
export type VerifyOptions = { now?: number; issuer?: string; audience?: string; leewaySec?: number };

export function verifyJwt(token: string, secret: string, options: VerifyOptions = {}): VerifyResult {
  // ここを書く（練習問題2 の decodePart を、このファイルにコピーして使ってよい）
  void createHmac;
  void timingSafeEqual;
  void secret;
  void options;
  throw new Error(`まだ書いていません: ${token}`);
}
