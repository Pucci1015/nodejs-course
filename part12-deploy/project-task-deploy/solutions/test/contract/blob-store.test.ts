// 追加（第12部）: ファイルの置き場所（BlobStore）の約束を、メモリの偽物と S3（練習用の mini-s3）の両方に動かす（第57章 6節・第63章 7節）
// 偽物が本物と同じように動くので、単体テスト（test/unit/sweep.test.ts）は偽物で書ける
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import type { BlobStore } from '../../src/storage/blob-store.ts';
import { createS3BlobStore } from '../../src/storage/s3-blob-store.ts';
import { createMemoryBlobStore } from '../support/memory-blob-store.ts';
import { startMiniS3 } from '../support/mini-s3.ts';

function blobStoreContract(name: string, make: () => Promise<BlobStore>) {
  describe(`BlobStore の約束（${name}）`, () => {
    test('置いたものが一覧に出る。prefix で絞れて、キーの順', async () => {
      const s = await make();
      await s.put('users/2/b.png', Buffer.from('bb'), 'image/png');
      await s.put('users/1/a.png', Buffer.from('a'), 'image/png');
      await s.put('other/c.png', Buffer.from('ccc'), 'image/png');
      const list = await s.list('users/');
      assert.deepEqual(
        list.map((b) => [b.key, b.size]),
        [
          ['users/1/a.png', 1],
          ['users/2/b.png', 2],
        ],
      );
      assert.ok(list.every((b) => b.lastModified instanceof Date));
    });

    test('同じキーなら上書き。消すと一覧から消える。無いものを消しても失敗しない', async () => {
      const s = await make();
      await s.put('users/1/x.png', Buffer.from('old'), 'image/png');
      await s.put('users/1/x.png', Buffer.from('newer'), 'image/png');
      assert.deepEqual(
        (await s.list('users/1/')).map((b) => b.size),
        [5],
      );
      await s.delete('users/1/x.png');
      await s.delete('users/1/x.png');
      assert.deepEqual(await s.list('users/1/'), []);
    });

    test('署名付き URL は文字列で、キーを含む。check() は失敗しない', async () => {
      const s = await make();
      await s.put('users/1/y.png', Buffer.from('y'), 'image/png');
      const url = await s.signedGetUrl('users/1/y.png', { expiresIn: 60, contentDisposition: 'inline' });
      assert.match(url, /users\/1\/y\.png/);
      await s.check();
    });
  });
}

blobStoreContract('メモリ', async () => createMemoryBlobStore());

// S3: テストごとに新しいバケット（mini-s3 を起動し直す）にして、前のテストのものが残らないようにする
const servers: { close: () => Promise<void> }[] = [];
const stores: { destroy: () => void }[] = [];
after(async () => {
  for (const s of stores) s.destroy();
  for (const s of servers) await s.close();
});
blobStoreContract('S3', async () => {
  const s3 = await startMiniS3({ port: 0, buckets: ['task-files'] });
  servers.push(s3);
  const store = createS3BlobStore({
    endpoint: s3.url,
    publicEndpoint: s3.url,
    region: 'us-east-1',
    bucket: 'task-files',
    accessKeyId: 'dev-only-access-key',
    secretAccessKey: 'dev-only-secret-key',
    forcePathStyle: true,
  });
  stores.push(store);
  return store;
});
