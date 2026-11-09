// 4つのサーバが守る「約束」（契約）のテスト（第28章 6節）。contract.test.mjs と、練習問題3のテストが使う
// HTTP の外から確かめるだけなので、中でどのフレームワークを使っていても、同じテストが使える
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @param {string} name
 * @param {() => Promise<{ url: string, close: () => Promise<void> }>} start
 * @param {(t: { call: Function }) => void} [more]  ほかに確かめたいもの（練習問題3）
 */
export function contract(name, start, more) {
  describe(name, () => {
    let srv;
    before(async () => {
      srv = await start();
    });
    after(() => srv.close());

    const call = async (method, path, { body, type = 'application/json' } = {}) => {
      const res = await fetch(srv.url + path, { method, body, headers: body === undefined ? {} : { 'content-type': type }, signal: AbortSignal.timeout(2000) });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {}
      return { status: res.status, type: (res.headers.get('content-type') ?? '').split(';')[0], location: res.headers.get('location'), json };
    };

    test('1. 最初は空の一覧', async () => {
      const r = await call('GET', '/tasks');
      assert.equal(r.status, 200);
      assert.equal(r.type, 'application/json');
      assert.deepEqual(r.json, { items: [] });
    });
    test('2. 作ると 201 と Location。前後の空白は取る', async () => {
      const r = await call('POST', '/tasks', { body: JSON.stringify({ title: ' 牛乳 ' }) });
      assert.equal(r.status, 201);
      assert.equal(r.location, '/tasks/1');
      assert.deepEqual(r.json, { id: 1, title: '牛乳', done: false });
    });
    test('3. 1件を見る', async () => {
      assert.deepEqual((await call('GET', '/tasks/1')).json, { id: 1, title: '牛乳', done: false });
    });
    test('4. 無い id・形の違う id・無いパスは 404 の problem+json', async () => {
      for (const path of ['/tasks/99', '/tasks/abc', '/nothing']) {
        const r = await call('GET', path);
        assert.equal(r.status, 404, path);
        assert.equal(r.type, 'application/problem+json', path);
        assert.equal(r.json?.status, 404, path);
      }
    });
    test('5. 中身の間違い（空の title・知らない項目・配列）は 422', async () => {
      for (const body of ['{"title":"  "}', '{"title":"a","admin":true}', '[]', '{}']) {
        const r = await call('POST', '/tasks', { body });
        assert.equal(r.status, 422, body);
        assert.equal(r.type, 'application/problem+json', body);
      }
    });
    test('6. 壊れた JSON は 400、JSON でないものは 415', async () => {
      assert.equal((await call('POST', '/tasks', { body: '{"title":' })).status, 400);
      assert.equal((await call('POST', '/tasks', { body: 'title=a', type: 'text/plain' })).status, 415);
    });
    test('7. 間違いの後も、作ったのは1つだけ', async () => {
      assert.equal((await call('GET', '/tasks')).json.items.length, 1);
    });
    more?.({ call });
  });
}

