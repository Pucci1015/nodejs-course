// 練習問題5: URL のパスから、公開するフォルダの中のファイルのパスを、安全に作る
// 仕様は README の練習問題5を見てください。
// 確かめる: node --test safe-path.test.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/**
 * @param {string} root 公開するフォルダ（絶対パス）
 * @param {string} urlPath URL の pathname の形（/ で始まり、%xx のまま）
 * @returns {string} root の中のファイルの絶対パス
 */
export function safePath(root, urlPath) {
  // ここを書く（下は、よく見る書き方です）
  return path.join(root, decodeURIComponent(urlPath));
}

/**
 * safePath に加えて、ファイルがあるか、シンボリックリンクで外に出ていないかを確かめる
 * @returns {Promise<{ path: string } | { redirect: string }>}
 */
export async function resolveFile(root, urlPath, { index = 'index.html' } = {}) {
  // ここを書く
  const file = safePath(root, urlPath);
  await fs.stat(file);
  return { path: file };
}
