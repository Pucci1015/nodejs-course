// 第40章 練習問題2のテスト: npx vitest run env.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/env.ts で模範解答に替えられる
const mod: typeof import('./env.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './env.ts', import.meta.url).pathname);
const { readEnv, EnvError } = mod;

test('何も無ければ、決まりの値', () => {
  expect(readEnv({ MODE: 'development', DEV: true })).toEqual({ apiBase: '', pollMs: 5000, featureStats: false });
});

test('書いてあれば、その値（数と真偽値に変える）', () => {
  expect(readEnv({ VITE_API_BASE: 'http://127.0.0.1:9500', VITE_POLL_MS: '10000', VITE_FEATURE_STATS: 'true' })).toEqual({
    apiBase: 'http://127.0.0.1:9500',
    pollMs: 10000,
    featureStats: true,
  });
  expect(readEnv({ VITE_FEATURE_STATS: 'false' }).featureStats).toBe(false);
});

test('VITE_API_BASE は、空かオリジンだけ（パスや最後の / はだめ）', () => {
  expect(readEnv({ VITE_API_BASE: '' }).apiBase).toBe('');
  expect(() => readEnv({ VITE_API_BASE: 'http://127.0.0.1:9500/' })).toThrow(EnvError);
  expect(() => readEnv({ VITE_API_BASE: 'localhost:9500' })).toThrow(EnvError);
});

test('VITE_POLL_MS は 1000〜600000 の整数', () => {
  expect(() => readEnv({ VITE_POLL_MS: '999' })).toThrow(EnvError);
  expect(() => readEnv({ VITE_POLL_MS: '5s' })).toThrow(EnvError);
  expect(readEnv({ VITE_POLL_MS: '600000' }).pollMs).toBe(600000);
});

test('EnvError の names に、間違った名前が全部（重ならずに）入る', () => {
  const err: unknown = (() => {
    try {
      readEnv({ VITE_API_BASE: 'x', VITE_POLL_MS: '1', VITE_FEATURE_STATS: 'maybe' });
    } catch (e) {
      return e;
    }
  })();
  expect(err).toBeInstanceOf(EnvError);
  if (err instanceof EnvError) expect([...err.names].sort()).toEqual(['VITE_API_BASE', 'VITE_FEATURE_STATS', 'VITE_POLL_MS']);
});
