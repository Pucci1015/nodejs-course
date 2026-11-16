// 練習問題8 の模範解答で使う、drizzle-kit の設定（exercises/ のものと同じ）
// solutions/ で npx drizzle-kit generate を打つと、この設定が読まれる（パスは solutions/ から数える）
// この問題では、データベースにはつながない（generate は、スキーマのファイルと drizzle/ の中だけを見る）
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './app-schema.mjs',
  out: './drizzle',
});
