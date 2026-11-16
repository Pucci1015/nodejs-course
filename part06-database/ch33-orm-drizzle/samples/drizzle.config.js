// 第33章 3節で書く、drizzle-kit の設定の完成形
// drizzle-kit は、この設定の schema を読んで、out のフォルダにマイグレーションの SQL を作る
// 使い方（~/dev/part06/ch33-orm-drizzle で）: npx drizzle-kit generate --config samples/drizzle.config.js
//   本文で自分で書く drizzle.config.js（章のフォルダに置く）では、schema は './schema.mjs'、out は './drizzle' にする
//   （drizzle-kit は、パスを「コマンドを打ったフォルダ」から数えるため。ここは samples/ の中のものを指している）
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './samples/schema.mjs',
  out: './samples/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/ch33',
  },
});
