// 第40章 練習問題1の模範解答: 開発サーバとプレビューの設定（アプリのフォルダでは vite.config.ts という名前にする）
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9500' },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
