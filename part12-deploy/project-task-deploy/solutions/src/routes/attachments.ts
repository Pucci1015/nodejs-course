// 追加（第12部）: タスクの添付ファイル（画像）のルート（第63章 5・6節、練習問題7）
//   GET    /api/tasks/:taskId/attachments              一覧
//   POST   /api/tasks/:taskId/attachments?name=…       画像を置く（ボディは画像のバイトそのもの）
//   GET    /api/tasks/:taskId/attachments/:id/content  署名付き URL へ 302（?download=1 なら、保存する名前を付ける）
//   DELETE /api/tasks/:taskId/attachments/:id          消す
// app.use('/api/tasks', …) で、タスクのルーターより前に置く。パスの形をルートに全部書くのは、
// /metrics で数えるときに、req.baseUrl に本物の id が入らないようにするため（第66章 練習問題6）
import express, { type Request, type Response } from 'express';
import type { Logger } from 'pino';
import { contentDisposition } from '../lib/content-disposition.ts';
import { objectKey } from '../lib/object-key.ts';
import { sniffFile } from '../lib/sniff-file.ts';
import { HttpProblem } from '../middleware/problem.ts';
import type { Attachment, AttachmentRepo } from '../repositories/pg-attachments.ts';
import type { TaskService } from '../services/tasks.ts';
import type { BlobStore } from '../storage/blob-store.ts';

/** 受け付ける種類（中身で決める）。SVG は中にスクリプトを書けるので、受け付けない（第63章 5.2節） */
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
/** 署名付き URL が使える秒数 */
const URL_SECONDS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type AttachmentsRouterDeps = {
  serviceFor: (req: Request) => TaskService;
  attachmentsFor: (req: Request) => AttachmentRepo;
  blobs: BlobStore;
  maxBytes: number;
  perTask: number;
  newId: () => string;
  now: () => Date;
  logger: Logger;
};

type Params = { taskId: string; id?: string };

/** API の応答の形。中身を取り出す URL を足す */
const view = (a: Attachment) => ({ ...a, url: `/api/tasks/${a.taskId}/attachments/${a.id}/content` });

/** 名前の形を確かめる。無ければ 'file'。/ や制御文字は Content-Disposition を作るときに _ になる */
function fileNameOf(req: Request): string {
  const name = req.query.name;
  if (name === undefined) return 'file';
  if (typeof name !== 'string' || name.length < 1 || name.length > 200)
    throw new HttpProblem(400, { errors: [{ parameter: 'name', detail: '1〜200 文字で 1 つだけ指定してください' }] });
  return name;
}

export function createAttachmentsRouter(deps: AttachmentsRouterDeps): express.Router {
  const { serviceFor, attachmentsFor, blobs, maxBytes, perTask, newId, now, logger } = deps;
  const router = express.Router();
  const base = '/:taskId/attachments';

  /** パスの taskId を数にし、そのタスクがこの人のものかを確かめる（ほかの人のものなら NotFoundError → 404） */
  async function ownedTaskId(req: Request<Params>): Promise<number> {
    if (!/^[1-9][0-9]{0,8}$/.test(req.params.taskId))
      throw new HttpProblem(404, { detail: `タスク ${req.params.taskId} はありません` });
    const task = await serviceFor(req).get(Number(req.params.taskId));
    return task.id;
  }
  function attachmentId(req: Request<Params>): string {
    const id = req.params.id ?? '';
    if (!UUID.test(id)) throw new HttpProblem(404, { detail: `添付ファイル ${id} はありません` });
    return id;
  }

  router.get(base, async (req: Request<Params>, res: Response) => {
    const taskId = await ownedTaskId(req);
    const items = await attachmentsFor(req).list(taskId);
    res.set('Cache-Control', 'private, no-cache').json({ items: items.map(view) });
  });

  // ボディは、どの Content-Type でもバイトのまま受け取る（種類は中身で決める）。上限を超えると 413
  router.post(base, express.raw({ type: () => true, limit: maxBytes }), async (req: Request<Params>, res: Response) => {
    const taskId = await ownedTaskId(req);
    const fileName = fileNameOf(req);
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new HttpProblem(400, { detail: 'ファイルがありません' });
    const kind = sniffFile(body);
    if (kind === undefined || !IMAGE_TYPES.has(kind.type))
      throw new HttpProblem(415, { detail: 'PNG・JPEG・GIF・WebP の画像だけを受け付けます' });

    const repo = attachmentsFor(req);
    // 同時に送られると、上限を少し超えることがある（厳しくするなら、タスクの行を FOR UPDATE でロックする。第32章 6節）
    if ((await repo.count(taskId)) >= perTask)
      throw new HttpProblem(409, { detail: `1つのタスクに付けられるのは ${perTask} 個までです` });

    const id = newId();
    const userId = req.user?.id ?? 0;
    // キーに利用者の名前は使わない。拡張子は、中身から決めたもの（第63章 5.1節）
    const key = objectKey({ userId, fileName: `x${kind.ext}`, id, now: now() });
    // 先にストレージに置き、次に行を入れる。行が入らなかったら、置いたものを消す（消せなくても、孤児の掃除が後で消す）
    await blobs.put(key, body, kind.type);
    let saved: Attachment;
    try {
      saved = await repo.insert({ id, taskId, objectKey: key, fileName, contentType: kind.type, size: body.length });
    } catch (err) {
      await blobs.delete(key).catch((e: unknown) => logger.warn({ err: e, key }, '置いたファイルを消せませんでした'));
      throw err;
    }
    res
      .status(201)
      .location(view(saved).url.replace(/\/content$/, ''))
      .json(view(saved));
  });

  router.get(`${base}/:id/content`, async (req: Request<Params>, res: Response) => {
    const taskId = await ownedTaskId(req);
    const a = await attachmentsFor(req).get(taskId, attachmentId(req));
    if (a === null) throw new HttpProblem(404, { detail: '添付ファイルはありません' });
    const url = await blobs.signedGetUrl(a.objectKey, {
      expiresIn: URL_SECONDS,
      contentDisposition: contentDisposition(a.fileName, { inline: req.query.download !== '1' }),
    });
    // 署名付き URL は、ログインしている人だけのもの。共有のキャッシュにも、ブラウザにも覚えさせない
    res.set('Cache-Control', 'private, no-store').redirect(302, url);
  });

  router.delete(`${base}/:id`, async (req: Request<Params>, res: Response) => {
    const taskId = await ownedTaskId(req);
    const key = await attachmentsFor(req).remove(taskId, attachmentId(req));
    if (key === null) throw new HttpProblem(404, { detail: '添付ファイルはありません' });
    // 行を消した後で、中身を消す。失敗しても 204（行はもう無いので、孤児の掃除が後で消す）
    await blobs.delete(key).catch((err: unknown) => logger.warn({ err, key }, 'ファイルを消せませんでした'));
    res.sendStatus(204);
  });

  return router;
}
