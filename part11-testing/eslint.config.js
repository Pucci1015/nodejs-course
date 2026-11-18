// 第11部の ESLint の設定（第7部の設定に、第8部の React の Hooks のルールを足したもの。第59章で1行ずつ読み直します）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // ビルドの結果（dist）と、Playwright が作る結果のフォルダは lint しない
  // samples/finished は、samples/app にコピーして動かすテストの完成形（それだけでは import 先が無い）
  // project-task-quality は、~/dev/task-api にコピーして、そこの設定で lint する
  { ignores: ['**/dist/**', '**/playwright-report/**', '**/test-results/**', '**/samples/finished/**', 'project-task-quality/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // JavaScript の基本のルール、型の情報を使う TypeScript のルール、Hooks のルール
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, reactHooks.configs.flat.recommended],
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
  {
    // 練習問題と模範解答のテスト: 確かめるファイルを MODULE から await import() で読む（型は any になる）。
    // ひな形には、これから使うために用意した import がある
    files: ['**/exercises/**/*.test.{ts,tsx}', '**/solutions/**/*.test.{ts,tsx}', '**/samples/**/*.test.ts', '**/typecheck.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // ミュータント: 正しい実装をわざと壊したもの。使わなくなった変数が残ってよい
    files: ['**/mutants/**'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
);
