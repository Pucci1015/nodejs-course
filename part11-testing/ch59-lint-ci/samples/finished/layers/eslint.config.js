// 第59章 2.4節: 設定のオブジェクトを並べた完成形（samples/layers にコピーして試す）
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // 道具が作ったファイルは lint しない
  { ignores: ['generated/**'] },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    // console は Node.js が用意する変数だと教える
    languageOptions: { globals: { console: 'readonly' } },
    rules: { 'no-console': 'error' },
  },
  // 後に書いたものほど強い。scripts/ だけ no-console を止める
  { files: ['scripts/**'], rules: { 'no-console': 'off' } },
);
