// 第46章 2節: 画面用（dist/client）と、サーバ用（dist/server）の2回ビルドする
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
