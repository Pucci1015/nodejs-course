// 第31章 5節で書く、ファイルのデータベースにマイグレーションをかけるプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/migrate-try.mjs   （今いるフォルダに app.db を作る）
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './migrations.mjs';

const db = new DatabaseSync('app.db');
const { from, to } = migrate(db);
console.log(from === to ? `もう最新です（版 ${to}）` : `版 ${from} → ${to} にしました`);
console.log('列:', db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name).join(', '));
db.close();
