// 練習問題6 用: keyset-page.mjs のテスト
// 使い方: node --test keyset-page.test.mjs
//   模範解答を試す: MODULE=../solutions/keyset-page.mjs node --test keyset-page.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const { listByDueDate } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './keyset-page.mjs')).href);

test('1 ページ目: 締め切りの早い順に limit 個と、次のページのカーソル', () => {
  const page = listByDueDate(createTasksDb(), { limit: 3 });
  assert.deepEqual(page, {
    items: [
      { id: 1, title: '牛乳を買う', dueDate: '2026-11-01' },
      { id: 6, title: '洗濯', dueDate: '2026-11-02' },
      { id: 4, title: '報告書を書く', dueDate: '2026-11-10' },
    ],
    next: { dueDate: '2026-11-10', id: 4 },
  });
});

test('カーソルを渡すと、その続きから。最後のページの next は null', () => {
  const db = createTasksDb();
  const p2 = listByDueDate(db, { limit: 3, after: { dueDate: '2026-11-10', id: 4 } });
  assert.deepEqual(p2.items.map((t) => t.id), [2, 3, 7]);
  assert.deepEqual(p2.next, { dueDate: '2026-12-01', id: 7 });
  const p3 = listByDueDate(db, { limit: 3, after: p2.next });
  assert.deepEqual(p3, { items: [{ id: 8, title: '年賀状', dueDate: '2026-12-20' }], next: null });
});

test('ちょうど割り切れるときも、空のページを作らない（最後のページの next は null）', () => {
  const db = createTasksDb();
  const p1 = listByDueDate(db, { limit: 7 });
  assert.equal(p1.items.length, 7);
  assert.equal(p1.next, null);
});

test('締め切りの無いタスク（歯医者の予約）は出ない', () => {
  const p = listByDueDate(createTasksDb(), { limit: 100 });
  assert.ok(!p.items.some((t) => t.id === 5));
});

test('同じ締め切りが並んでも、重ならず、抜けない（id で順を決める）', () => {
  const db = createTasksDb();
  db.exec(`INSERT INTO tasks (id, user_id, title, due_date, minutes) VALUES (9, 4, '同じ日 A', '2026-11-10', 5), (10, 4, '同じ日 B', '2026-11-10', 5)`);
  const seen = [];
  let after = null;
  do {
    const p = listByDueDate(db, { limit: 2, after });
    seen.push(...p.items.map((t) => t.id));
    after = p.next;
  } while (after);
  assert.deepEqual(seen, [1, 6, 4, 9, 10, 2, 3, 7, 8]);
});

test('ページを読んでいる途中で、前のページに行が足されても、重ならない', () => {
  const db = createTasksDb();
  const p1 = listByDueDate(db, { limit: 3 });
  db.exec(`INSERT INTO tasks (user_id, title, due_date, minutes) VALUES (4, '割り込み', '2026-10-01', 5)`);
  const p2 = listByDueDate(db, { limit: 3, after: p1.next });
  assert.deepEqual(p2.items.map((t) => t.id), [2, 3, 7]);
});
