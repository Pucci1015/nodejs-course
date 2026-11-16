// 練習問題8 で使う、drizzle-kit の設定（書き換えなくてよい）
// exercises/ で npx drizzle-kit generate を打つと、この設定が読まれる（パスは exercises/ から数える）
// この問題では、データベースにはつながない（generate は、スキーマのファイルと drizzle/ の中だけを見る）
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './app-schema.mjs',
  out: './drizzle',
});
