// 第8部の ESLint の設定（第42章 3節で説明します。第7部の設定に、React の Hooks のルールを足したもの）
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // ビルドの結果（dist）と、素の JavaScript の第39章は lint しない
  { ignores: ['**/dist/**', 'ch39-vanilla-api/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // JavaScript の基本のルール、型の情報を使う TypeScript のルール、Hooks のルール
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, reactHooks.configs.flat.recommended],
    languageOptions: {
      // 型の情報を、それぞれのファイルにいちばん近い tsconfig.json から読む
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // _ で始まる引数は「使わないが、書く必要がある」
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // メモリのリポジトリのように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
    },
  },
);
