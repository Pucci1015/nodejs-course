// 第57章: 練習用の API を起動する（curl で触ってみるため）
// 使い方: node samples/server.ts            … メモリのリポジトリで 127.0.0.1:9717
//         REPO=pg node samples/server.ts    … PostgreSQL（スキーマ ch57_demo）で
import pg from 'pg';
import { createApp } from './app.ts';
import { createMemoryRepo } from './memory-repo.ts';
import { createPgRepo, SCHEMA_SQL } from './pg-repo.ts';
import { createTaskService } from './service.ts';

const PORT = 9717;
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

let repo;
let pool: pg.Pool | undefined;
if (process.env.REPO === 'pg') {
  pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=ch57_demo' });
  // 初めてなら、スキーマとテーブルを作る
  const { rowCount } = await pool.query(`SELECT 1 FROM pg_namespace WHERE nspname = 'ch57_demo'`);
  if (rowCount === 0) await pool.query(`CREATE SCHEMA ch57_demo; SET search_path = ch57_demo; ${SCHEMA_SQL}`);
  repo = createPgRepo(pool);
} else {
  repo = createMemoryRepo();
}

const app = createApp({ service: createTaskService({ repo }) });
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/api/tasks で待っています（${pool ? 'PostgreSQL' : 'メモリ'}）`);
});

process.on('SIGINT', () => {
  server.close();
  void pool?.end();
});
