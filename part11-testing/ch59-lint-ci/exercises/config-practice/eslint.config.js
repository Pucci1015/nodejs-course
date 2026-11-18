// 練習問題2: 決まりどおりに ESLint を設定する
// 確かめ方（exercises で）: node --test config-practice.test.ts
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // ここを書く
  { files: ['**/*.js'] },
);
