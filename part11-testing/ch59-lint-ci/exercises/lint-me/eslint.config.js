// 練習問題1の ESLint の設定（書き換えなくてよい）
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import regexp from 'eslint-plugin-regexp';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, regexp.configs['flat/recommended']],
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    eqeqeq: 'error',
  },
});
