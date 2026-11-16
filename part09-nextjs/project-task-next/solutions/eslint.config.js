// ESLint の設定（第9部の設定と同じ）。tsc では見つからない間違いや、Hooks・Next.js の決まりを見張る
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['.next/**', '.next-test/**', 'next-env.d.ts'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, reactHooks.configs.flat.recommended, nextPlugin.configs['core-web-vitals']],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/require-await': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    // テストでは、偽物の関数（vi.fn）の戻り値などで any が出るので、no-unsafe-* を外す（第7部の成果物と同じ）
    files: ['test/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
