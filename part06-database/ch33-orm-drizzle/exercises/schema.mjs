// 練習問題で使う、第33章 2節と同じスキーマ（書き換えなくてよい）
// 使い方: import { tasks, tags, taskTags } from './schema.mjs';
import { relations, sql } from 'drizzle-orm';
import { check, date, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// pgTable('表の名前', { JavaScript の名前: 列の型('列の名前') … }, (表) => [制約・インデックス])
export const tasks = pgTable(
  'tasks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    status: text().notNull().default('todo'),
    dueDate: date('due_date'), // date は '2026-11-12' の文字列のまま（第32章 4.2節の落とし穴が無い）
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    version: integer().notNull().default(1),
  },
  (t) => [
    check('tasks_title_check', sql`length(${t.title}) BETWEEN 1 AND 100`),
    check('tasks_status_check', sql`${t.status} IN ('todo', 'doing', 'done')`),
    uniqueIndex('tasks_open_title').on(t.title).where(sql`${t.status} <> 'done'`),
  ],
);

export const tags = pgTable('tags', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
});

export const taskTags = pgTable(
  'task_tags',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

// 表どうしのつながり（5節の db.query の with で使う）。SQL の外部キーとは別に、Drizzle に教える
export const tasksRelations = relations(tasks, ({ many }) => ({
  taskTags: many(taskTags),
}));
export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));
export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));
