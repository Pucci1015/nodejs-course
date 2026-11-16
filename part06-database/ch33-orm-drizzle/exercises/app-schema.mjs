// 練習問題8: この表に、優先度の列 priority を足し、drizzle-kit でマイグレーションを作ってください。
// 要件と手順は README にあります。drizzle/ の中のファイルは、手で書き換えないでください（drizzle-kit に作らせます）。
// 確かめ方: node --test app-schema.test.mjs
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable(
  'tasks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    status: text().notNull().default('todo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // ここに priority を足す
  },
  (t) => [
    check('tasks_title_check', sql`length(${t.title}) BETWEEN 1 AND 100`),
    check('tasks_status_check', sql`${t.status} IN ('todo', 'doing', 'done')`),
    // ここに tasks_priority_check を足す
  ],
);
