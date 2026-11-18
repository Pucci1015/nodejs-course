// 第59章 2.4節: 設定のオブジェクトを並べる練習（始めの形）
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig({
  files: ['**/*.js'],
  extends: [js.configs.recommended],
  rules: { 'no-console': 'error' },
});
