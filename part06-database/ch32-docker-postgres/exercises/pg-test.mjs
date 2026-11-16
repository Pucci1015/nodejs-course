// 練習問題のテストで使う部品（書き換えなくてよい）
// テストごとに、PostgreSQL の中に新しいスキーマ（テーブルを入れる箱）を作り、そこに tasks と5つのタスクを作る。
// テストが終わったら、スキーマごと消す。ほかの章や、自分で作った public の tasks には触らない
import pg from 'pg';

pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app';

export const TASKS_SQL = `
  CREATE TABLE tasks (
    id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title        text        NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
    status       text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    due_date     date,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    version      integer     NOT NULL DEFAULT 1
  );
  CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
  INSERT INTO tasks (title, status, due_date, created_at, updated_at, completed_at, version) VALUES
    ('牛乳を買う',       'done',  '2026-11-01', '2026-11-01T00:00:00Z', '2026-11-01T03:00:00Z', '2026-11-01T03:00:00Z', 2),
    ('本を返す',         'todo',  '2026-11-12', '2026-11-02T00:00:00Z', '2026-11-02T00:00:00Z', NULL, 1),
    ('部屋の掃除',       'doing', '2026-11-15', '2026-11-03T00:00:00Z', '2026-11-04T00:00:00Z', NULL, 2),
    ('Let''s ストレッチ', 'todo', NULL,         '2026-11-05T00:00:00Z', '2026-11-05T00:00:00Z', NULL, 1),
    ('報告書を書く',     'todo',  '2026-11-10', '2026-11-06T00:00:00Z', '2026-11-06T00:00:00Z', NULL, 1);
`;

async function admin(sql) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `PostgreSQL につながりません（${DATABASE_URL.replace(/:[^:@/]*@/, ':***@')}）。` +
        '~/dev/part06 で docker compose up -d --wait を動かしてから、もう一度試してください',
      { cause: err },
    );
  }
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/**
 * テスト用のプールを作る。t（テストの文脈）を渡すと、テストの後で片付ける
 * @param {import('node:test').TestContext} t
 * @param {{ seed?: boolean, max?: number, connectionTimeoutMillis?: number }} [options]
 */
export async function createTestPool(t, { seed = true, max = 5, connectionTimeoutMillis = 2000 } = {}) {
  const schema = `test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  await admin(`CREATE SCHEMA ${schema}`);
  // options の search_path で、このプールの SQL は、作ったスキーマのテーブルを使う
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max, connectionTimeoutMillis, options: `-c search_path=${schema}` });
  const clients = new Set();
  pool.on('connect', (client) => clients.add(client));
  t.after(async () => {
    // 返されていない接続があると pool.end() は終わらないので、1 秒待っても終わらなければ、接続を1本ずつ切る
    const ended = pool.end();
    const timer = new Promise((resolve) => setTimeout(resolve, 1000, 'timeout'));
    if ((await Promise.race([ended, timer])) === 'timeout') {
      await Promise.all([...clients].map((c) => c.end().catch(() => {})));
    }
    await admin(`DROP SCHEMA ${schema} CASCADE`);
  });
  if (seed) await pool.query(TASKS_SQL);
  return pool;
}
