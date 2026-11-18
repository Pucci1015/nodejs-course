// 第63章 5・6節: ファイルを受け取ってオブジェクトストレージに置き、署名付き URL で渡すサーバ
// 動かし方（章のフォルダで）: node samples/upload-server.ts   （先に ~/dev/part12 で npm run s3）
//   置く:   curl -i --data-binary @cat.png --url-query 'name=ねこ.png' http://127.0.0.1:9837/files
//   取る:   curl -i http://127.0.0.1:9837/files/（id）       → 302 で署名付き URL へ
//   消す:   curl -i -X DELETE http://127.0.0.1:9837/files/（id）
// ファイルの情報は、練習なのでメモリの Map に持つ（成果物では PostgreSQL の表）
import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET, createS3Client } from './s3-client.ts';
import { sniff } from './sniff.ts';

type FileInfo = { id: string; key: string; name: string; type: string; size: number };
const files = new Map<string, FileInfo>();
const s3 = createS3Client();
const app = express();
app.disable('x-powered-by');

// ボディを Buffer で受け取る。5MB を超えたら、express.raw が 413 を返す
app.post('/files', express.raw({ type: () => true, limit: '5mb' }), async (req, res) => {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'ファイルがありません' });
    return;
  }
  const type = sniff(body);
  if (type === undefined) {
    res.status(415).json({ error: 'PNG・JPEG・GIF だけを受け付けます' });
    return;
  }
  const id = randomUUID();
  const key = `files/${id}`; // キーに、利用者が付けた名前を使わない
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type }));
  const name = typeof req.query.name === 'string' && req.query.name !== '' ? req.query.name : 'file';
  const info = { id, key, name, type, size: body.length };
  files.set(id, info);
  res.status(201).location(`/files/${id}`).json(info);
});

// 取り出すときは、ファイルをアプリで中継せず、60 秒だけ使える URL へ送る
app.get('/files/:id', async (req, res) => {
  const info = files.get(req.params.id);
  if (info === undefined) {
    res.status(404).json({ error: 'ありません' });
    return;
  }
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: info.key,
      ResponseContentType: info.type,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(info.name)}`,
    }),
    { expiresIn: 60 },
  );
  res.set('Cache-Control', 'no-store').redirect(302, url);
});

app.delete('/files/:id', async (req, res) => {
  const info = files.get(req.params.id);
  if (info === undefined) {
    res.status(404).json({ error: 'ありません' });
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: info.key }));
  files.delete(info.id);
  res.status(204).end();
});

// express.raw が投げた「大きすぎる」を 413 の JSON に。ほかは 500（中身は見せない）
const onError: ErrorRequestHandler = (err: { type?: string }, _req, res, _next) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: '5MB までです' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'サーバで失敗しました' });
};
app.use(onError);

app.listen(9837, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9837/ で待っています');
});
