// テストの部品: テストごとに、新しいスキーマを作って渡し、終わったら消す。書き換えなくてよいファイル
// つなぐ先は DATABASE_URL（既定は ~/dev/room-booking の compose.yaml の roombooking）。アプリの表（public）には触らない
import { randomBytes } from 'node:crypto';
import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5434/roombooking';

/** 新しいスキーマを作り、search_path をそのスキーマと public（btree_gist の入る所）にした接続で fn を呼ぶ */
export async function withTestSchema(fn: (client: pg.ClientBase) => Promise<void>): Promise<void> {
  const schema = `test_${process.pid}_${randomBytes(4).toString('hex')}`;
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await fn(client);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
}

/** p が失敗したときの、エラーの code と制約の名前（失敗しなければ null） */
export async function pgError(p: Promise<unknown>): Promise<{ code: unknown; constraint: unknown } | null> {
  try {
    await p;
    return null;
  } catch (err) {
    if (typeof err !== 'object' || err === null) throw err;
    return { code: 'code' in err ? err.code : undefined, constraint: 'constraint' in err ? err.constraint : undefined };
  }
}
