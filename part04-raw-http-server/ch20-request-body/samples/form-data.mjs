// multipart/form-data（ファイルのアップロード）を、組み込みの Request.formData() で読む（第20章 8節）
// 上限付きでボディを全部読んでから、Request に渡す。ファイルもメモリに入るので、上限は小さめにする
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

export async function readFormData(req, { limit = 5 * 1024 * 1024 } = {}) {
  const type = (req.headers['content-type'] ?? '').toLowerCase();
  if (!type.startsWith('multipart/form-data') && !type.startsWith('application/x-www-form-urlencoded')) {
    throw new HttpError(415, 'Content-Type は multipart/form-data にしてください');
  }
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > limit) throw new HttpError(413, `大きすぎます（上限 ${limit} バイト）`, { headers: { Connection: 'close' } });

  // 上限を数えながら読む（Content-Length は嘘をつけるので、読んだ量でも確かめる）
  const chunks = [];
  let size = 0;
  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.off('data', onData);
        req.pause();
        reject(new HttpError(413, `大きすぎます（上限 ${limit} バイト）`, { headers: { Connection: 'close' } }));
        return;
      }
      chunks.push(chunk);
    };
    req.on('data', onData);
    req.once('end', resolve);
    req.once('error', reject);
  });

  // Web 標準の Request に入れ直すと、formData() で multipart を読んでくれる
  const request = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': req.headers['content-type'] },
    body: Buffer.concat(chunks, size),
  });
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, 'フォームのデータとして読めません');
  }
}
