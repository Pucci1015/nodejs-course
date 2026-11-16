// 練習問題8 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { createEmitter, type Emitter, type Listener } from './emitter.ts';

type Task = { id: number; title: string };
type TaskEvents = {
  created: Task;
  deleted: { id: number };
  cleared: undefined;
};

const em = createEmitter<TaskEvents>();
const off = em.on('created', (task) => {
  const title: string = task.title; // task は Task
  console.log(title);
});
em.once('deleted', ({ id }) => console.log(id + 1));
const count = em.emit('created', { id: 1, title: '牛乳を買う' });
em.emit('cleared', undefined);
const n = em.listenerCount('deleted');
off();

export type Checks = [
  Expect<Equal<typeof off, () => void>>,
  Expect<Equal<typeof count, number>>,
  Expect<Equal<typeof n, number>>,
  Expect<Equal<Parameters<Emitter<TaskEvents>['emit']>[0], 'created' | 'deleted' | 'cleared'>>,
  Expect<Equal<Listener<string>, (payload: string) => void>>,
];

// @ts-expect-error 知らないイベントの名前
em.on('updated', () => {});
// @ts-expect-error deleted の値は { id: number }
em.emit('deleted', { id: '1' });
// @ts-expect-error created の値に title が無い
em.emit('created', { id: 1 });
em.on('deleted', (payload) => {
  // @ts-expect-error deleted の値に title は無い
  console.log(payload.title);
});
