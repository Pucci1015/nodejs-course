// 練習問題2の模範解答: 決まりどおりの ESLint の設定
// 確かめ方（exercises で）: MODULE=../solutions/config-practice/eslint.config.js node --test config-practice.test.ts
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // 追加: 道具が作ったファイルは lint しない（files の無い ignores だけのオブジェクトは、全体から外す）
  { ignores: ['generated/**'] },
  {
    files: ['**/*.js'],
    // 追加: JavaScript のおすすめのルール（no-unused-vars・no-undef など）
    extends: [js.configs.recommended],
    // 追加: console を「読むだけのグローバル変数」として知らせる（知らせないと no-undef になる）
    languageOptions: { globals: { console: 'readonly' } },
    rules: {
      eqeqeq: 'error',
      'no-console': 'error',
      'prefer-const': 'warn',
    },
  },
  // 追加: 後に書いた設定が勝つ。scripts/ だけ no-console を止める
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
);
