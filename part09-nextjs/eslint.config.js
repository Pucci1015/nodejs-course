// 第9部の ESLint の設定（第47章 9節）。第8部の設定に、Next.js のルール（@next/eslint-plugin-next）を足したもの
// ESLint は、このファイルを、lint するファイルのフォルダから上にたどって見つける
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // ビルドの結果（.next・.next-test）と、Next.js が作るファイルは lint しない
  { ignores: ['**/.next/**', '**/.next-test/**', '**/next-env.d.ts', 'try/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // JavaScript の基本、型の情報を使う TypeScript、Hooks、Next.js（<img> より next/image を、など）のルール
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, reactHooks.configs.flat.recommended, nextPlugin.configs['core-web-vitals']],
    languageOptions: {
      // 型の情報を、それぞれのファイルにいちばん近い tsconfig.json から読む
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // _ で始まる引数は「使わないが、書く必要がある」
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // メモリのリポジトリのように、形をそろえるために async にする関数があるので、await が無くてもよい
      '@typescript-eslint/require-await': 'off',
      // pages/ フォルダ（古い作り方）のためのルール。第9部は app/ だけなので使わない
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
);
