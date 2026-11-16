// 第39章 練習問題7のテスト: npx vitest run store.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/store.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './store.js', import.meta.url).pathname);
const { createStore } = mod;

test('getState は最初の状態', () => {
  const store = createStore({ status: 'loading', tasks: [] });
  expect(store.getState()).toEqual({ status: 'loading', tasks: [] });
});

test('setState(オブジェクト): 足し合わせた新しい状態。前のオブジェクトは変えない', () => {
  const first = { status: 'loading', tasks: [] };
  const store = createStore(first);
  store.setState({ status: 'success' });
  expect(store.getState()).toEqual({ status: 'success', tasks: [] });
  expect(first.status).toBe('loading');
  expect(store.getState()).not.toBe(first);
});

test('setState(関数): 今の状態を受け取る', () => {
  const store = createStore({ count: 1 });
  store.setState((s) => ({ count: s.count + 1 }));
  store.setState((s) => ({ count: s.count + 1 }));
  expect(store.getState().count).toBe(3);
});

test('subscribe: 変わるたびに新しい状態で呼ぶ。やめたら呼ばない', () => {
  const store = createStore({ count: 0 });
  const seen = [];
  const unsubscribe = store.subscribe((s) => seen.push(s.count));
  store.setState({ count: 1 });
  store.setState({ count: 2 });
  unsubscribe();
  store.setState({ count: 3 });
  expect(seen).toEqual([1, 2]);
});

test('何も変わらない setState では、知らせない', () => {
  const tasks = [];
  const store = createStore({ status: 'success', tasks });
  let calls = 0;
  store.subscribe(() => calls++);
  store.setState({ status: 'success', tasks });
  expect(calls).toBe(0);
  store.setState({ tasks: [] }); // 中身が同じでも、別の配列なら変わった
  expect(calls).toBe(1);
});
