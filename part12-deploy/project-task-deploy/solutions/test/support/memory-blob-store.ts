// 追加（第12部）: BlobStore のメモリの偽物（第63章 練習問題6）。単体テスト・契約テストで使う
// 署名付き URL は本物ではないので、memory://キー?… の形の文字列を返す
import type { BlobStore } from '../../src/storage/blob-store.ts';

export function createMemoryBlobStore(now: () => Date = () => new Date()): BlobStore & {
  /** テストで中身を見るため */
  get(key: string): { body: Buffer; contentType: string } | undefined;
} {
  const blobs = new Map<string, { body: Buffer; contentType: string; lastModified: Date }>();
  return {
    async put(key, body, contentType) {
      blobs.set(key, { body: Buffer.from(body), contentType, lastModified: now() }); // 写しを覚える
    },
    async delete(key) {
      blobs.delete(key);
    },
    async list(prefix) {
      return [...blobs]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, b]) => ({ key, size: b.body.length, lastModified: b.lastModified }));
    },
    async signedGetUrl(key, { expiresIn, contentDisposition }) {
      const q = new URLSearchParams({ expires: String(expiresIn), disposition: contentDisposition });
      return `memory://${key}?${q.toString()}`;
    },
    async check() {},
    get(key) {
      const b = blobs.get(key);
      return b === undefined ? undefined : { body: Buffer.from(b.body), contentType: b.contentType };
    },
  };
}
