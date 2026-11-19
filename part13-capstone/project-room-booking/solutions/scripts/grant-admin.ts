// 管理者を決める（第68章 2節）。画面からは決められないので、サーバで動かす
// 使い方: npm run grant-admin -- alice@example.com          （管理者にする）
//         npm run grant-admin -- alice@example.com --revoke （メンバーに戻す）
// 本番では、PaaS のシェル（Render の Shell など）で動かす（docs/runbook.md）
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config.ts';
import { migrate } from '../src/db/migrate.ts';
import { createPool, redactUrl } from '../src/db/pool.ts';
import { createPgUserRepo } from '../src/repositories/pg-users.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { revoke: { type: 'boolean', default: false } },
});
const email = positionals[0]?.trim().toLowerCase();
if (email === undefined || positionals.length !== 1) {
  console.error('使い方: npm run grant-admin -- メールアドレス [--revoke]');
  process.exit(2);
}

const config = loadConfig(process.env);
const pool = createPool({ url: config.databaseUrl, schema: config.databaseSchema, max: 1 });
try {
  await migrate(pool); // サーバをまだ起動していなくても、表があるように（動かしてあれば何もしない）
  const role = values.revoke ? 'member' : 'admin';
  if (await createPgUserRepo(pool).setRole(email, role)) {
    console.log(`${email} を ${role} にしました`);
  } else {
    console.error(`${email} のユーザーはいません（先に画面から登録してください）`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`データベースを使えませんでした（${redactUrl(config.databaseUrl)}）`);
  throw err;
} finally {
  await pool.end();
}
