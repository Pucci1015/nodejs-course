// 問題5 解答例: URL のパスから、公開するフォルダの中のファイルのパスを、安全に作る
import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/**
 * @param {string} root 公開するフォルダ（絶対パス）
 * @param {string} urlPath URL の pathname の形（/ で始まり、%xx のまま）
 * @returns {string} root の中のファイルの絶対パス
 */
export function safePath(root, urlPath) {
  if (!urlPath.startsWith('/')) throw new HttpError(400, 'パスは / で始めてください');
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath); // %xx を戻すのは、ここで1回だけ
  } catch {
    throw new HttpError(400, 'URL の %xx の形が正しくありません');
  }
  // NUL 文字はファイル名に使えない。fs に渡すと ERR_INVALID_ARG_VALUE で失敗する
  if (decoded.includes('\0')) throw new HttpError(400, 'パスに使えない文字があります');
  // \ は Windows の区切り。Mac ではふつうの文字だが、紛らわしいので受け付けない
  if (decoded.includes('\\')) throw new HttpError(400, 'パスに使えない文字があります');

  const absRoot = path.resolve(root);
  const full = path.join(absRoot, decoded);
  // 外を指していないか。relative が .. で始まるか、絶対パスになったら外
  const rel = path.relative(absRoot, full);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new HttpError(403, 'このフォルダの外は開けません');
  }

  const segments = decoded.split('/').slice(1);
  // 途中の空のセグメント（//）は受け付けない（最後の / はフォルダの印なのでよい）
  if (segments.slice(0, -1).some((s) => s === '')) throw new HttpError(404, 'ありません');
  // . で始まる名前（.env、.git など）は、あることも知らせない
  if (segments.some((s) => s.startsWith('.'))) throw new HttpError(404, 'ありません');
  return full;
}

/**
 * safePath に加えて、ファイルがあるか、シンボリックリンクで外に出ていないかを確かめる。
 * フォルダなら、最後が / のときは index のファイルを、/ が無ければ { redirect } を返す
 * @returns {Promise<{ path: string } | { redirect: string }>}
 */
export async function resolveFile(root, urlPath, { index = 'index.html' } = {}) {
  let file = safePath(root, urlPath);
  let stat;
  try {
    stat = await fs.stat(file);
    if (stat.isDirectory()) {
      if (!urlPath.endsWith('/')) return { redirect: `${urlPath}/` };
      file = path.join(file, index);
      stat = await fs.stat(file); // フォルダの中身の一覧は見せない。index が無ければ 404
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (['ENOENT', 'ENOTDIR', 'ENAMETOOLONG'].includes(err.code)) throw new HttpError(404, 'ありません');
    if (err.code === 'EACCES') throw new HttpError(403, '開けません');
    throw err;
  }
  if (!stat.isFile()) throw new HttpError(404, 'ありません'); // ソケットなど、ふつうのファイルでないもの

  // シンボリックリンクをたどった先が、外にないか
  const [realRoot, realFile] = await Promise.all([fs.realpath(root), fs.realpath(file)]);
  const rel = path.relative(realRoot, realFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new HttpError(403, 'このフォルダの外は開けません');
  return { path: realFile };
}
