// 第53章 練習問題5 の模範解答: トークンの保存場所を広げる（本文4節の token.ts）
import { createHash, randomBytes } from 'node:crypto';

export type Purpose = 'verify' | 'reset';

type TokenRecord = { userId: number; purpose: Purpose; expiresAt: number; usedAt: number | null };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createTokenStore({ now = Date.now } = {}) {
  const records = new Map<string, TokenRecord>();

  /** 使えるトークンの記録を返す（使えなければ undefined） */
  function usable(token: string, purpose: Purpose): TokenRecord | undefined {
    const record = records.get(hashToken(token));
    if (record === undefined || record.purpose !== purpose) return undefined;
    if (record.usedAt !== null || record.expiresAt <= now()) return undefined;
    return record;
  }

  return {
    issue(userId: number, purpose: Purpose, ttlMs: number): string {
      // 同じ人・同じ使い道の古いトークンは、使えなくする（メールを2通頼んだら、新しいほうだけが効く）
      for (const [hash, record] of records) {
        if (record.userId === userId && record.purpose === purpose) records.delete(hash);
      }
      const token = randomBytes(32).toString('base64url');
      records.set(hashToken(token), { userId, purpose, expiresAt: now() + ttlMs, usedAt: null });
      return token;
    },
    /** 使ったことにはせずに、userId を返す（確かめるページを表示するときなど） */
    check(token: string, purpose: Purpose): number | null {
      return usable(token, purpose)?.userId ?? null;
    },
    consume(token: string, purpose: Purpose): number | null {
      const record = usable(token, purpose);
      if (record === undefined) return null;
      record.usedAt = now();
      return record.userId;
    },
    /** その人のトークンを、使い道に関係なくすべて使えなくする（パスワードを変えたときなど） */
    revokeAll(userId: number): void {
      for (const [hash, record] of records) {
        if (record.userId === userId) records.delete(hash);
      }
    },
    /** 期限が切れたもの・使ったものを消して、消した数を返す（定期的に呼ぶ。第12部 第64章） */
    purge(): number {
      let count = 0;
      for (const [hash, record] of records) {
        if (record.usedAt !== null || record.expiresAt <= now()) {
          records.delete(hash);
          count++;
        }
      }
      return count;
    },
    /** 覚えている数（テスト用） */
    size: () => records.size,
  };
}
