// 第59章: 練習用の ESLint の設定の完成形
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import regexp from 'eslint-plugin-regexp';
import tseslint from 'typescript-eslint';
import noFocusedTests from './rules/no-focused-tests.ts';

export default defineConfig(
  // lint しないフォルダ
  { ignores: ['coverage/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      // 3節: 正規表現の間違いと、ReDoS になる書き方を見つける
      regexp.configs['flat/recommended'],
      // 5節: Prettier とぶつかる、書き方（見た目）のルールを止める。いちばん最後に置く
      prettier,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    // 4節: 自分で作ったルールを「local」という名前のプラグインとして登録する
    plugins: { local: { rules: { 'no-focused-tests': noFocusedTests } } },
    rules: {
      // 2.3節: == と != を使わない
      eqeqeq: 'error',
      // 2.3節: node:test の test() は Promise を返すが、待たなくてよい（テストの道具が待つ）
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] },
          ],
        },
      ],
      // 4節
      'local/no-focused-tests': 'error',
    },
  },
);
