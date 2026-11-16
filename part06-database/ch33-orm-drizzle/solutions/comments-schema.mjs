// 練習問題1 の模範解答
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tasks } from './schema.mjs';

export const comments = pgTable(
  'comments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // references の中は「関数」にする（() => tasks.id）。表どうしが、どちらが先に書かれていても指せるように
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('comments_body_check', sql`length(${t.body}) BETWEEN 1 AND 500`)],
);
