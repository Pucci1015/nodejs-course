// 画面の開発サーバと、ビルドの設定。/api は、会議室の予約の API（9900）に中継する（第40章 5節）
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    // API_TARGET=http://127.0.0.1:9913 npm run dev のように、中継先を変えられる
    proxy: { '/api': process.env.API_TARGET ?? 'http://127.0.0.1:9900' },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: { '/api': process.env.API_TARGET ?? 'http://127.0.0.1:9900' },
  },
});
