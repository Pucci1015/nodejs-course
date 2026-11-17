// 第53章 練習問題5: トークンの保存場所を広げる（本文4節の token.ts）
import { createHash, randomBytes } from 'node:crypto';

export type Purpose = 'verify' | 'reset';

type TokenRecord = { userId: number; purpose: Purpose; expiresAt: number; usedAt: number | null };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createTokenStore({ now = Date.now } = {}) {
  const records = new Map<string, TokenRecord>();
  // ここを書く（本文4節の issue・consume から始めて、check・revokeAll・purge・size を足す）
  void records;
  void hashToken;
  void randomBytes;
  void now;
  const notYet = (): never => {
    throw new Error('まだ書いていません');
  };
  return {
    issue(userId: number, purpose: Purpose, ttlMs: number): string {
      void [userId, purpose, ttlMs];
      return notYet();
    },
    check(token: string, purpose: Purpose): number | null {
      void [token, purpose];
      return notYet();
    },
    consume(token: string, purpose: Purpose): number | null {
      void [token, purpose];
      return notYet();
    },
    revokeAll(userId: number): void {
      void userId;
      notYet();
    },
    purge(): number {
      return notYet();
    },
    size(): number {
      return notYet();
    },
  };
}
