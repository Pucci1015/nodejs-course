// 第63章 練習問題6: BlobStore のメモリの偽物（本文 7節）
import type { BlobStore } from '../samples/blob-store.ts';

export function createMemoryBlobStore(): BlobStore {
  const blobs = new Map<string, { body: Buffer; contentType: string }>();
  return {
    async put(key, body, contentType) {
      // 気をつける所: 渡された Buffer をそのまま覚えると、後で呼んだ側が書き換えたときに中身が変わる
      blobs.set(key, { body: Buffer.from(body), contentType });
    },
    async get(key) {
      const b = blobs.get(key);
      // 取り出す側にも写しを渡す（S3 は毎回新しいバイトを返すので、それに合わせる）
      return b === undefined ? undefined : { body: Buffer.from(b.body), contentType: b.contentType };
    },
    async head(key) {
      const b = blobs.get(key);
      return b === undefined ? undefined : { key, size: b.body.length, contentType: b.contentType };
    },
    async delete(key) {
      blobs.delete(key);
    },
    async list(prefix) {
      return [...blobs]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, b]) => ({ key, size: b.body.length }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    },
  };
}
