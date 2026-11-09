// 練習問題5: アップロードされた画像を、安全に保存する
// 仕様は README の練習問題5を見てください。
// 確かめる: node --test upload.test.mjs
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/** 先頭のバイトから、画像の種類（{ type, ext }）を調べる。知らない種類なら null */
export function detectImageType(bytes) {
  // ここを書く
  return null;
}

export async function saveImage(file, dir, { maxBytes = 1024 * 1024 } = {}) {
  // ここを書く（下は、よく見る書き方です。危ないところがいくつもあります）
  const file2 = path.join(dir, file.name);
  await fs.writeFile(file2, Buffer.from(await file.arrayBuffer()));
  return { id: file.name, path: file2, type: file.type, size: file.size, originalName: file.name };
}
