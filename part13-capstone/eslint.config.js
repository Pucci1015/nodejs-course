// 第13部の練習問題の ESLint の設定（第12部と同じ形）
// アプリ（base・各章の solutions/app・project-room-booking/solutions）は、それぞれ自分の eslint.config.js を持つので、ここでは見ない
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      'base/**',
      '**/solutions/app/**',
      '**/solutions/extend/**',
      '**/exercises/app-tests/**',
      'project-room-booking/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // 練習問題のテスト: 確かめるファイルを MODULE から await import() で読む（型は any になる）
    files: ['**/exercises/**/*.test.ts', '**/typecheck.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
