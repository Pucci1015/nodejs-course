// 本文4節の token.ts のコピー（練習問題8で使う。書き換えなくてよい）
// 保存するのはトークンの SHA-256 だけ。期限と使い道（purpose）を一緒に覚える
import { createHash, randomBytes } from 'node:crypto';

export type Purpose = 'verify' | 'reset';

type TokenRecord = { userId: number; purpose: Purpose; expiresAt: number; usedAt: number | null };

/** 32 バイト（256 ビット）のランダムな値。URL に入れられる base64url にする */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 保存用のハッシュ。トークンは十分に長いランダムな値なので、ソルトも遅いハッシュも要らない */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createTokenStore({ now = Date.now } = {}) {
  /** ハッシュ → 記録。データベースなら、hash の列に一意の索引を付けた表 */
  const records = new Map<string, TokenRecord>();
  return {
    /** トークンを作って、ハッシュだけを覚える。返したトークン（元の値）は、メールに入れて送ったら忘れる */
    issue(userId: number, purpose: Purpose, ttlMs: number): string {
      const token = newToken();
      records.set(hashToken(token), { userId, purpose, expiresAt: now() + ttlMs, usedAt: null });
      return token;
    },
    /** 使えるトークンなら、使ったことにして userId を返す。使えなければ null */
    consume(token: string, purpose: Purpose): number | null {
      const record = records.get(hashToken(token));
      if (record === undefined || record.purpose !== purpose) return null;
      if (record.usedAt !== null || record.expiresAt <= now()) return null;
      record.usedAt = now();
      return record.userId;
    },
  };
}
