// 第63章 7.2節: BlobStore の契約テスト（第11部 第57章）。本物（S3）と偽物（メモリ）の両方に、同じテストを当てる
// 使い方: blobStoreContract('名前', async () => 空の BlobStore)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BlobStore } from './blob-store.ts';

export function blobStoreContract(name: string, makeStore: () => Promise<BlobStore>) {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

  test(`${name}: 置いたものを、同じバイトと種類で取り出せる`, async () => {
    const store = await makeStore();
    await store.put('a/1.png', png, 'image/png');
    const got = await store.get('a/1.png');
    assert.ok(got);
    assert.deepEqual(got.body, png);
    assert.equal(got.contentType, 'image/png');
  });

  test(`${name}: 無いキーは undefined（例外にしない）`, async () => {
    const store = await makeStore();
    assert.equal(await store.get('none'), undefined);
    assert.equal(await store.head('none'), undefined);
  });

  test(`${name}: 同じキーに置くと上書き`, async () => {
    const store = await makeStore();
    await store.put('k', Buffer.from('old'), 'text/plain');
    await store.put('k', Buffer.from('new!'), 'application/json');
    assert.deepEqual(await store.head('k'), { key: 'k', size: 4, contentType: 'application/json' });
  });

  test(`${name}: 消すと無くなる。無いキーを消しても失敗しない`, async () => {
    const store = await makeStore();
    await store.put('k', png, 'image/png');
    await store.delete('k');
    assert.equal(await store.get('k'), undefined);
    await store.delete('k');
  });

  test(`${name}: 一覧は prefix で始まるものだけを、キーの順に`, async () => {
    const store = await makeStore();
    for (const k of ['u/2/b', 'u/1/a', 'u/1/c', 'u/10/x', 'v/1/a']) await store.put(k, Buffer.from(k), 'text/plain');
    assert.deepEqual(await store.list('u/1/'), [
      { key: 'u/1/a', size: 5 },
      { key: 'u/1/c', size: 5 },
    ]);
    assert.deepEqual(
      (await store.list('u/')).map((o) => o.key),
      ['u/1/a', 'u/1/c', 'u/10/x', 'u/2/b'],
    );
  });

  test(`${name}: 日本語・空白・記号を含むキー`, async () => {
    const store = await makeStore();
    const key = 'users/1/ねこ の写真 (1)+.png';
    await store.put(key, png, 'image/png');
    assert.equal((await store.head(key))?.size, png.length);
    assert.deepEqual((await store.list('users/1/')).map((o) => o.key), [key]);
  });

  test(`${name}: 取り出したバイトを書き換えても、置いてあるものは変わらない`, async () => {
    const store = await makeStore();
    const body = Buffer.from('abc');
    await store.put('k', body, 'text/plain');
    body[0] = 0x7a; // 置いた後で、渡した Buffer を書き換える
    const got = await store.get('k');
    assert.ok(got);
    got.body[1] = 0x7a; // 取り出した Buffer を書き換える
    assert.equal((await store.get('k'))?.body.toString(), 'abc');
  });
}
