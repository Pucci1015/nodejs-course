// ESLint の設定（第37章 6節・第59章 3節）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import regexp from 'eslint-plugin-regexp';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // tsc が作った JavaScript（dist）は lint しない
  // 画面（web/）は、web/ の中で npm run lint する（設定も node_modules も別）
  // Playwright が作るフォルダも lint しない
  { ignores: ['**/dist/**', 'web/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['**/*.ts'],
    // JavaScript の基本のルールと、型の情報を使う TypeScript のルール
    // 正規表現の間違いと ReDoS（regexp）、Prettier とぶつかるルールを止める（prettier。いちばん最後）
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      regexp.configs['flat/recommended'],
      prettier,
    ],
    languageOptions: {
      // 型の情報を、それぞれのファイルにいちばん近い tsconfig.json から読む
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // node:test の test() は Promise を返すが、待たなくてよい（テストの道具が待つ）
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] },
          ],
        },
      ],
      // _ で始まる引数は「使わないが、書く必要がある」（Express のエラーのミドルウェアの next など）
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // メモリのリポジトリのように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
      // regexp のおすすめのうち、書き方の好みだけのもの（[0-9] を \d に、など）は止める。
      //   これまでの章の書き方（[0-9]、[A-Za-z]）のほうが、初めて読む人に分かりやすいため（第59章 2.3節）
      'regexp/prefer-d': 'off',
      'regexp/prefer-w': 'off',
      'regexp/use-ignore-case': 'off',
    },
  },
  // テストは、応答の JSON を any のまま読む（形を確かめるのは assert の仕事）。
  // そのため、any を使うことへの注意（no-unsafe-…）は、test フォルダだけ止める
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
