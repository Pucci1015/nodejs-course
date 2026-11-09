// 練習問題3のテスト
// 使い方: node --test views.test.mjs
//         MODULE=../solutions/views.mjs node --test views.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { layout, taskList, paginate, pagination } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './views.mjs')).href);

const s = (v) => String(v).replace(/\s+/g, ' ').replace(/> </g, '><').trim(); // 空白の違いは気にしない

test('layout: charset・lang・title があり、題名はエスケープする', () => {
  const page = s(layout({ title: 'Tom & Jerry', body: '' }));
  assert.match(page, /^<!doctype html>/i);
  assert.match(page, /<html lang="ja">/);
  assert.match(page, /<meta charset="utf-8">/);
  assert.match(page, /<title>Tom &amp; Jerry \| タスク<\/title>/);
});

test('layout: body は html タグの結果をそのまま入れる。flash は、あるときだけ', () => {
  const body = taskList([]);
  const page = s(layout({ title: 'x', body }));
  assert.ok(page.includes('<p class="empty">タスクはありません</p>'), '本文が二重にエスケープされている');
  assert.ok(!page.includes('class="flash"'), 'flash が無いのに出ている');
  assert.ok(!page.includes('null'));
  assert.match(s(layout({ title: 'x', body: '', flash: '保存しました <3' })), /<p class="flash">保存しました &lt;3<\/p>/);
});

test('taskList: 題名をエスケープし、完了には done の class', () => {
  const out = s(taskList([{ id: 1, title: '<p> と <div>', done: false }, { id: 2, title: 'A & B', done: true }]));
  assert.ok(out.includes('<li class="task"><a href="/tasks/1">&lt;p&gt; と &lt;div&gt;</a></li>'), out);
  assert.ok(out.includes('<li class="task done"><a href="/tasks/2">A &amp; B</a></li>'), out);
});

test('taskList: 1件も無ければ「タスクはありません」', () => {
  assert.equal(s(taskList([])), '<p class="empty">タスクはありません</p>');
});

const nums = Array.from({ length: 25 }, (_, i) => i + 1);

test('paginate: 1ページ目・最後のページ', () => {
  assert.deepEqual(paginate(nums, { page: 1, perPage: 10 }), { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], page: 1, pages: 3, total: 25, hasPrev: false, hasNext: true });
  assert.deepEqual(paginate(nums, { page: 3, perPage: 10 }), { items: [21, 22, 23, 24, 25], page: 3, pages: 3, total: 25, hasPrev: true, hasNext: false });
});

test('paginate: ちょうど割り切れるとき、0件のとき', () => {
  assert.equal(paginate(nums.slice(0, 20), { page: 2, perPage: 10 }).pages, 2);
  assert.equal(paginate(nums.slice(0, 20), { page: 2, perPage: 10 }).hasNext, false);
  assert.deepEqual(paginate([], { page: 1, perPage: 10 }), { items: [], page: 1, pages: 1, total: 0, hasPrev: false, hasNext: false });
});

test('paginate: 範囲の外・数字でない page は、いちばん近いページ', () => {
  assert.equal(paginate(nums, { page: 99, perPage: 10 }).page, 3);
  assert.equal(paginate(nums, { page: 0, perPage: 10 }).page, 1);
  assert.equal(paginate(nums, { page: -5, perPage: 10 }).page, 1);
  assert.equal(paginate(nums, { page: '2', perPage: 10 }).page, 2, 'クエリ文字列から来た "2" も数として扱う');
  assert.equal(paginate(nums, { page: 'abc', perPage: 10 }).page, 1);
  assert.equal(paginate(nums, { page: '1.5', perPage: 10 }).page, 1);
});

test('pagination: 今のページは span、ほかはリンク。前へ・次へ', () => {
  const out = s(pagination({ page: 2, pages: 3, baseUrl: '/tasks' }));
  assert.ok(out.startsWith('<nav class="pagination">'), out);
  assert.ok(out.includes('<a href="/tasks?page=1" rel="prev">前へ</a>'), out);
  assert.ok(out.includes('<a href="/tasks?page=1">1</a>'), out);
  assert.ok(out.includes('<span aria-current="page">2</span>'), out);
  assert.ok(out.includes('<a href="/tasks?page=3">3</a>'), out);
  assert.ok(out.includes('<a href="/tasks?page=3" rel="next">次へ</a>'), out);
});

test('pagination: 最初のページに「前へ」、最後のページに「次へ」は無い。1ページだけなら何も出さない', () => {
  assert.ok(!s(pagination({ page: 1, pages: 3, baseUrl: '/tasks' })).includes('前へ'));
  assert.ok(!s(pagination({ page: 3, pages: 3, baseUrl: '/tasks' })).includes('次へ'));
  assert.equal(s(pagination({ page: 1, pages: 1, baseUrl: '/tasks' })), '');
});

test('pagination: ほかの条件をリンクに残し、URL 用にエンコードする', () => {
  const out = s(pagination({ page: 1, pages: 2, baseUrl: '/tasks', query: { q: '牛乳 & パン', done: null } }));
  assert.ok(out.includes('<a href="/tasks?q=%E7%89%9B%E4%B9%B3+%26+%E3%83%91%E3%83%B3&amp;page=2">2</a>'), out);
});
