// 第12部の ESLint の設定（第7部の設定に、第11部 第59章のテストのファイルの例外を足したもの）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // ビルドの結果（dist）は lint しない。project-task-deploy は、~/dev/task-api にコピーして、そこの設定で lint する
  { ignores: ['**/dist/**', 'project-task-deploy/**'] },
  {
    files: ['**/*.ts'],
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
      // メモリの偽物のように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // 練習問題と模範解答のテスト: 確かめるファイルを MODULE から await import() で読む（型は any になる）
    files: ['**/exercises/**/*.test.ts', '**/solutions/**/*.test.ts', '**/samples/**/*.test.ts', '**/typecheck.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
