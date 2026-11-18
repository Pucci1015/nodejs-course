// 画面の開発サーバと、ビルドの設定。/api は、タスク管理 API（第7部の成果物）に中継する（第40章 5節）
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // API_TARGET=http://127.0.0.1:9500 npm run dev のように、中継先を変えられる（第8部の練習用の API など）
    proxy: { '/api': process.env.API_TARGET ?? 'http://127.0.0.1:9490' },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': process.env.API_TARGET ?? 'http://127.0.0.1:9490' },
  },
});
