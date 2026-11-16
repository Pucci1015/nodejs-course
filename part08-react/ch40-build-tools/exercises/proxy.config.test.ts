// 第40章 練習問題1のテスト: npx vitest run proxy.config.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/proxy.config.ts で模範解答に替えられる
const mod: typeof import('./proxy.config.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './proxy.config.ts', import.meta.url).pathname);
const config = mod.default;
if (typeof config === 'function') throw new Error('defineConfig にはオブジェクトを渡してください');

test('server: 5173 番で、使われていたら止まる', () => {
  expect(config.server?.port).toBe(5173);
  expect(config.server?.strictPort).toBe(true);
});

test('server.proxy: /api を http://127.0.0.1:9500 に中継する', () => {
  const rule = config.server?.proxy?.['/api'];
  const target = typeof rule === 'string' ? rule : rule?.target;
  expect(target).toBe('http://127.0.0.1:9500');
});

test('preview: 4173 番で、使われていたら止まる', () => {
  expect(config.preview?.port).toBe(4173);
  expect(config.preview?.strictPort).toBe(true);
});
