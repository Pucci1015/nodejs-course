// 第7部の ESLint の設定（第37章 6節で説明します）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // tsc が作った JavaScript（dist）は lint しない
  { ignores: ['**/dist/**'] },
  {
    files: ['**/*.ts'],
    // JavaScript の基本のルールと、型の情報を使う TypeScript のルール
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      // 型の情報を、それぞれのファイルにいちばん近い tsconfig.json から読む
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // node:test の test() は Promise を返すが、待たなくてよい（テストの道具が待つ）
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] }] },
      ],
      // _ で始まる引数は「使わないが、書く必要がある」（Express のエラーのミドルウェアの next など）
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // メモリのリポジトリのように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
    },
  },
);
