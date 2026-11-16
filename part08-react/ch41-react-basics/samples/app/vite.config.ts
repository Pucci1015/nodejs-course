// 第41章 1節: React のプラグインを入れる（JSX を変換し、保存したときに state を残したまま画面を変える）
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
