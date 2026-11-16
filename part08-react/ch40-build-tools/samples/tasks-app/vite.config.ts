// 第40章 5節: Vite の設定。/api で始まるリクエストを、練習用の API に中継する（プロキシ）
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // 5173 が使われていたら、別の番号にせず止まる
    proxy: {
      // 画面からは同じオリジン（localhost:5173）の /api に見える。CORS は要らない
      '/api': 'http://127.0.0.1:9500',
    },
  },
});
