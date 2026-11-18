// 追加（第11部）: E2E のための、空のスキーマ e2e を作り直す（playwright.config.ts が、API を起動する前に動かす）
// 表は、API が起動するときのマイグレーションが作る。データベース taskapi の public（開発で使う表）には触らない
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
} catch (err) {
  console.error(
    'PostgreSQL につながりません。~/dev/part06 で docker compose up -d --wait を動かしてから、もう一度試してください',
  );
  throw err;
}
try {
  await client.query('DROP SCHEMA IF EXISTS e2e CASCADE');
  await client.query('CREATE SCHEMA e2e');
} finally {
  await client.end();
}
