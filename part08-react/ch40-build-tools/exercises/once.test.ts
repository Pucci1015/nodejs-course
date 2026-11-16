// 第40章 練習問題5のテスト: npx vitest run once.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/once.ts で模範解答に替えられる
const mod: typeof import('./once.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './once.ts', import.meta.url).pathname);
const { once } = mod;

test('初めて呼ばれたときだけ loader を動かし、同じ結果を返す', async () => {
  let calls = 0;
  const load = once(async () => {
    calls++;
    return { value: 42 };
  });
  expect(calls).toBe(0); // 作っただけでは動かさない
  const [a, b] = await Promise.all([load(), load()]);
  expect(a).toBe(b);
  expect(await load()).toBe(a);
  expect(calls).toBe(1);
});

test('読み込み中に何回呼ばれても、loader は1回', async () => {
  let calls = 0;
  let resolve: (v: string) => void = () => {};
  const load = once(() => {
    calls++;
    return new Promise<string>((r) => (resolve = r));
  });
  const p1 = load();
  const p2 = load();
  expect(p1).toBe(p2);
  resolve('ok');
  expect(await p2).toBe('ok');
  expect(calls).toBe(1);
});

test('失敗したら覚えず、次に呼ばれたときにやり直す', async () => {
  let calls = 0;
  const load = once(async () => {
    calls++;
    if (calls === 1) throw new Error('つながりません');
    return 'ok';
  });
  await expect(load()).rejects.toThrow('つながりません');
  expect(await load()).toBe('ok');
  expect(await load()).toBe('ok');
  expect(calls).toBe(2);
});
