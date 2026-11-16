// 第32章のサンプルで使う、PostgreSQL につなぐ部品
// 使い方: import { createPool } from './db.mjs';  const pool = createPool();
import pg from 'pg';

// DATE 型（締め切りなど、時刻の無い日付）は、JavaScript の Date にせず、'2026-11-12' の文字列のまま受け取る（4.2節）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

// つなぎ先。環境変数 DATABASE_URL があればそれを、無ければ compose.yaml の PostgreSQL を使う
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app';

export function createPool(options = {}) {
  return new pg.Pool({ connectionString: DATABASE_URL, ...options });
}
