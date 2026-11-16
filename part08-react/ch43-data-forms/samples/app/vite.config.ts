// 第43章 1節: 第41章の React のプラグインと、第40章 5節のプロキシ（/api を練習用の API に中継する）
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:9500' },
  },
});
