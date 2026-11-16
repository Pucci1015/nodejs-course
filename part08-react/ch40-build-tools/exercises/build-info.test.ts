// 第40章 練習問題7のテスト: npx vitest run build-info.test.ts
import { expect, test } from 'vitest';
import type { ResolvedConfig } from 'vite';
// 確かめるファイル。MODULE=../solutions/build-info.ts で模範解答に替えられる
const mod: typeof import('./build-info.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './build-info.ts', import.meta.url).pathname);
const { buildInfo } = mod;

// プラグインのフックは、関数か { handler } のどちらでも書ける。ここでは関数として呼ぶ
type Fn = (...args: unknown[]) => unknown;
function hook(plugin: object, name: string): Fn {
  const h: unknown = Reflect.get(plugin, name);
  if (typeof h === 'function') return (...args) => Reflect.apply(h, plugin, args);
  throw new Error(`${name} がありません`);
}

const fixed = () => new Date('2026-11-20T09:00:00.000Z');

test('name は build-info', () => {
  expect(buildInfo().name).toBe('build-info');
});

test('resolveId: virtual:build-info だけを \\0virtual:build-info にする', () => {
  const p = buildInfo();
  expect(hook(p, 'resolveId')('virtual:build-info')).toBe('\0virtual:build-info');
  expect(hook(p, 'resolveId')('./main.ts')).toBeFalsy();
});

test('load: builtAt と mode を export するコードを返す', async () => {
  const p = buildInfo({ now: fixed });
  hook(p, 'configResolved')({ mode: 'production' } as ResolvedConfig);
  const code = hook(p, 'load')('\0virtual:build-info');
  expect(typeof code).toBe('string');
  // 返したコードを、本当にモジュールとして読んでみる
  const m: unknown = await import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(String(code))}`);
  expect(m).toMatchObject({ builtAt: '2026-11-20T09:00:00.000Z', mode: 'production' });
});

test('load: ほかの id には何も返さない', () => {
  expect(hook(buildInfo(), 'load')('/src/main.ts')).toBeFalsy();
});
