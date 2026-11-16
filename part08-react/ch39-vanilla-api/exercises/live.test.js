// 第39章 練習問題8のテスト: npx vitest run live.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/live.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './live.js', import.meta.url).pathname);
const { applyEvent, connectLive } = mod;

const a = { id: 1, title: 'A', status: 'todo', version: 1 };
const b = { id: 2, title: 'B', status: 'todo', version: 1 };

test('created: 後ろに足す。同じ id がもうあれば置き換える（2回届いても1つ）', () => {
  expect(applyEvent([a], 'task.created', b)).toEqual([a, b]);
  expect(applyEvent([a, b], 'task.created', b)).toEqual([a, b]);
});

test('updated: version が大きければ置き換え、古い知らせは無視する', () => {
  const a2 = { ...a, status: 'done', version: 2 };
  expect(applyEvent([a, b], 'task.updated', a2)).toEqual([a2, b]);
  expect(applyEvent([a2, b], 'task.updated', a)).toEqual([a2, b]);
});

test('deleted: 外す。知らない種類は、そのまま', () => {
  expect(applyEvent([a, b], 'task.deleted', a)).toEqual([b]);
  const list = [a];
  expect(applyEvent(list, 'ping', a)).toBe(list);
});

test('元の配列を変えない', () => {
  const list = [a];
  applyEvent(list, 'task.created', b);
  applyEvent(list, 'task.deleted', a);
  expect(list).toEqual([a]);
});

/** 偽物の EventSource。テストから dispatch でイベントを起こす */
class FakeEventSource {
  static last;
  constructor(url) {
    this.url = url;
    this.handlers = {};
    this.closed = false;
    FakeEventSource.last = this;
  }
  addEventListener(type, fn) {
    (this.handlers[type] ??= []).push(fn);
  }
  close() {
    this.closed = true;
  }
  dispatch(type, data) {
    for (const fn of this.handlers[type] ?? []) fn({ type, data: data === undefined ? '' : JSON.stringify(data) });
  }
}

function fakeStore(initial) {
  let state = initial;
  return { getState: () => state, setState: (p) => (state = { ...state, ...(typeof p === 'function' ? p(state) : p) }) };
}

test('connectLive: イベントを store の tasks に当て、reset で reload。やめる関数で close', () => {
  const store = fakeStore({ status: 'success', tasks: [a] });
  let reloads = 0;
  const stop = connectLive('http://api.test/api/events', store, { reload: () => reloads++, EventSourceImpl: FakeEventSource });
  const es = FakeEventSource.last;
  expect(es.url).toBe('http://api.test/api/events');
  es.dispatch('task.created', b);
  es.dispatch('task.deleted', a);
  expect(store.getState()).toEqual({ status: 'success', tasks: [b] });
  es.dispatch('reset');
  expect(reloads).toBe(1);
  stop();
  expect(es.closed).toBe(true);
});
