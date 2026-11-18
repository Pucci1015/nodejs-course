// 第63章 練習問題7: ファイルを受け取って BlobStore に置き、アプリが中継して返すルーター（本文 5・6節）
import express, { type ErrorRequestHandler, type Router } from 'express';
import type { BlobStore } from '../samples/blob-store.ts';
import { sniff } from '../samples/sniff.ts';

export type UploadRouterOptions = {
  store: BlobStore;
  /** 受け付ける大きさの上限（バイト） */
  maxBytes: number;
  /** 新しい ID を作る（本番は randomUUID） */
  newId: () => string;
};

type FileInfo = { id: string; name: string; type: string; size: number };

export function createUploadRouter(options: UploadRouterOptions): Router {
  const { store, maxBytes, newId } = options;
  const files = new Map<string, FileInfo>();
  const router = express.Router();
  const keyOf = (id: string) => `files/${id}`;

  router.post('/files', express.raw({ type: () => true, limit: maxBytes }), async (req, res) => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: 'ファイルがありません' });
      return;
    }
    const type = sniff(body); // 送られた Content-Type ではなく、中身で決める
    if (type === undefined) {
      res.status(415).json({ error: 'PNG・JPEG・GIF だけを受け付けます' });
      return;
    }
    const id = newId();
    await store.put(keyOf(id), body, type);
    const name = typeof req.query.name === 'string' && req.query.name !== '' ? req.query.name : 'file';
    const info: FileInfo = { id, name, type, size: body.length };
    files.set(id, info);
    res.status(201).location(`/files/${id}`).json(info);
  });

  router.get('/files/:id', async (req, res) => {
    const info = files.get(req.params.id);
    const blob = info && (await store.get(keyOf(info.id)));
    if (info === undefined || blob === undefined) {
      res.status(404).json({ error: 'ありません' });
      return;
    }
    res.set({
      'Content-Type': info.type,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(info.name)}`,
      'X-Content-Type-Options': 'nosniff', // ブラウザに、中身から種類を推測させない
      'Cache-Control': 'private, no-cache', // 共有のキャッシュ（CDN）に置かせない。毎回確かめさせる
    });
    res.send(blob.body);
  });

  router.delete('/files/:id', async (req, res) => {
    const info = files.get(req.params.id);
    if (info === undefined) {
      res.status(404).json({ error: 'ありません' });
      return;
    }
    await store.delete(keyOf(info.id));
    files.delete(info.id);
    res.status(204).end();
  });

  const onError: ErrorRequestHandler = (err: { type?: string }, _req, res, next) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: `${maxBytes} バイトまでです` });
      return;
    }
    next(err);
  };
  router.use(onError);
  return router;
}
