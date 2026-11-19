// E2E のための、空のスキーマ e2e を作り直す（playwright.config.ts が、API を起動する前に動かす）
// 表は、API が起動するときのマイグレーションが作る。データベース roombooking の public（開発で使う表）には触らない
// Redis のキー e2e:…（仕事の列など）も消す
import pg from 'pg';
import { createClient } from 'redis';

const url = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5434/roombooking';
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
} catch (err) {
  console.error(
    'PostgreSQL につながりません。このリポジトリで docker compose up -d --wait を動かしてから、もう一度試してください',
  );
  throw err;
}
try {
  await client.query('DROP SCHEMA IF EXISTS e2e CASCADE');
  await client.query('CREATE SCHEMA e2e');
} finally {
  await client.end();
}

const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6381' });
await redis.connect();
for await (const keys of redis.scanIterator({ MATCH: 'e2e:*', COUNT: 100 })) if (keys.length > 0) await redis.del(keys);
await redis.close();
