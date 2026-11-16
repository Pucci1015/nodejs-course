// 練習問題1: タスクに付けるコメントの表 comments を、Drizzle のスキーマで書いてください。
// 要件は README にあります。
// 確かめ方: node --test comments-schema.test.mjs
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tasks } from './schema.mjs';

// ここを書く（export const comments = pgTable('comments', { … }, (t) => [ … ]);）
export const comments = undefined;
