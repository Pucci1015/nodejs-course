// 練習問題5のテスト。サンプルと同じ「契約」のテストに、PATCH と DELETE の確かめを足して動かす
// 使い方: node --test hono-tasks.test.mjs
//         MODULE=../solutions/hono-tasks.mjs node --test hono-tasks.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contract } from '../samples/contract.mjs';

const { listen } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './hono-tasks.mjs')).href);

contract('hono-tasks', () => listen(0), ({ call }) => {
  // 契約のテストの 1〜7 の後に動く。この時点で、タスク 1（牛乳）がある
  const patch = (p, body, type) => call('PATCH', p, { body: typeof body === 'string' ? body : JSON.stringify(body), type });

  test('8. PATCH で done を変える。変えた後のものが返る', async () => {
    const r = await patch('/tasks/1', { done: true });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { id: 1, title: '牛乳', done: true });
    assert.equal((await call('GET', '/tasks/1')).json.done, true);
  });

  test('9. PATCH で title も変えられる（前後の空白は取る）', async () => {
    assert.equal((await patch('/tasks/1', { title: ' 豆乳 ' })).json.title, '豆乳');
  });

  test('10. PATCH の中身の間違いは 422（done が真偽でない・知らない項目・空のオブジェクト）', async () => {
    for (const body of [{ done: 'yes' }, { id: 5 }, {}, { title: '' }]) {
      const r = await patch('/tasks/1', body);
      assert.equal(r.status, 422, JSON.stringify(body));
      assert.equal(r.type, 'application/problem+json');
    }
    assert.deepEqual((await call('GET', '/tasks/1')).json, { id: 1, title: '豆乳', done: true }, '間違いのときに、変わってしまった');
  });

  test('11. PATCH: 無い id は 404、壊れた JSON は 400、JSON でなければ 415', async () => {
    assert.equal((await patch('/tasks/99', { done: true })).status, 404);
    assert.equal((await patch('/tasks/abc', { done: true })).status, 404);
    assert.equal((await patch('/tasks/1', '{"done":')).status, 400);
    assert.equal((await patch('/tasks/1', 'done=true', 'text/plain')).status, 415);
  });

  test('12. DELETE は 204。もう一度消すと 404。一覧からも消える', async () => {
    assert.equal((await call('DELETE', '/tasks/1')).status, 204);
    assert.equal((await call('DELETE', '/tasks/1')).status, 404);
    assert.deepEqual((await call('GET', '/tasks')).json, { items: [] });
  });
});
