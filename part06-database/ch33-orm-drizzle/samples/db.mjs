// 第33章 4節で書く、Drizzle でデータベースにつなぐ部品の完成形
// 使い方: import { db, closeDb } from './db.mjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.mjs';

// 第33章は、compose.yaml が作ったデータベース ch33 を使う（第32章の app とは別。tasks の名前がぶつからないように）
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/ch33';

// SQL_LOG=1 を付けて動かすと、Drizzle が送った SQL を表示する
export const db = drizzle(DATABASE_URL, { schema, logger: process.env.SQL_LOG === '1' });

// 中で使っている pg のプールを閉じる
export const closeDb = () => db.$client.end();
