// 問題5 解答例: アップロードされた画像を、安全に保存する
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

// ファイルの先頭のバイト（マジックナンバー）で、本当の種類を調べる
const SIGNATURES = [
  { type: 'image/png', ext: '.png', test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x) },
  { type: 'image/jpeg', ext: '.jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif', ext: '.gif', test: (b) => ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6)) },
  { type: 'image/webp', ext: '.webp', test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
];
function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/** 先頭のバイトから、画像の種類（{ type, ext }）を調べる。知らない種類なら null */
export function detectImageType(bytes) {
  const sig = SIGNATURES.find((s) => s.test(bytes));
  return sig ? { type: sig.type, ext: sig.ext } : null;
}

/**
 * formData() で受け取った File を、dir の中に新しい名前で保存する
 * @param {File} file
 * @param {string} dir
 * @returns {Promise<{ id: string, path: string, type: string, size: number, originalName: string }>}
 */
export async function saveImage(file, dir, { maxBytes = 1024 * 1024 } = {}) {
  if (!(file instanceof File)) throw new HttpError(400, 'ファイルを選んでください');
  if (file.size === 0) throw new HttpError(400, '空のファイルです');
  if (file.size > maxBytes) throw new HttpError(413, `ファイルが大きすぎます（上限 ${maxBytes} バイト）`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  // file.type（客が言っている種類）や、名前の拡張子は信じない。中身で決める
  const kind = detectImageType(bytes);
  if (!kind) throw new HttpError(415, 'PNG・JPEG・GIF・WebP の画像を選んでください');

  // 保存する名前は、こちらで作る。客の付けた名前（../../x や .htaccess）はパスに使わない
  const id = crypto.randomUUID();
  const file2 = path.join(dir, id + kind.ext);
  await fs.writeFile(file2, bytes, { flag: 'wx' }); // 同じ名前があれば失敗させる（上書きしない）
  return {
    id,
    path: file2,
    type: kind.type,
    size: bytes.length,
    // 表示のためだけに残す。制御文字を除き、長さも切る（HTML に出すときは、さらにエスケープする）
    originalName: [...file.name.replace(/[\u0000-\u001f\u007f]/g, '')].slice(0, 100).join(''),
  };
}
