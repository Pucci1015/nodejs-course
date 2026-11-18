// 第58章: Vite の設定と、Vitest の設定（test の所）
// ポートは環境変数で変えられる（E2E のテストは、手で起動したものとぶつからない番号を使う。本文8節）
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiPort = Number(process.env.API_PORT ?? 9727);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? 9728),
    // 番号が使われていたら、別の番号にせず止まる
    strictPort: true,
    // /api で始まるリクエストを、API のサーバへ中継する（第8部 第40章 5節）
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  test: {
    // 部品のテストは jsdom（Node.js の中の、まねのブラウザ）で動かす
    environment: 'jsdom',
    // src の中の .test.ts・.test.tsx だけ。e2e/ の Playwright のテストは Vitest で動かさない
    include: ['src/**/*.test.{ts,tsx}'],
    // --coverage のとき、どのファイルを数えるか（テストと、テストの道具は数えない。本文9節）
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-helpers.tsx'],
    },
  },
});
