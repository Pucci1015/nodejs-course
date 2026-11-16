// 練習問題8 の模範解答（スキーマ）。drizzle/0001_add_priority.sql は、これを書いてから drizzle-kit generate で作った
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable(
  'tasks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    status: text().notNull().default('todo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // NOT NULL の列を、行がもうある表に足すときは、DEFAULT が要る（今ある行に入れる値）
    priority: integer().notNull().default(2),
  },
  (t) => [
    check('tasks_title_check', sql`length(${t.title}) BETWEEN 1 AND 100`),
    check('tasks_status_check', sql`${t.status} IN ('todo', 'doing', 'done')`),
    check('tasks_priority_check', sql`${t.priority} BETWEEN 1 AND 3`),
  ],
);
