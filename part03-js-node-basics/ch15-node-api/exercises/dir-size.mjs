// 練習問題9: フォルダの中のファイルの大きさを合計する dirSize を作ってください（du の小さな版）。
// 要件は README と dir-size.test.mjs にあります。
// 確かめ方: node --test dir-size.test.mjs
//   できたら: node dir-size.mjs ~/dev
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} root
 * @param {{ concurrency?: number }} [options]  同時に開くファイル・フォルダの数の上限（既定 16）
 * @returns {Promise<{ bytes: number, files: number, dirs: number, symlinks: number,
 *                     errors: { path: string, code: string }[] }>}
 */
export async function dirSize(root, { concurrency = 16 } = {}) {
  // ここを書く
}

/** 1536 → "1.5 KiB"（1024 で割っていく。B のときは小数を付けない） */
export function formatBytes(bytes) {
  // ここを書く
}

if (import.meta.main) {
  const root = process.argv[2];
  if (!root) {
    console.error('使い方: node dir-size.mjs <フォルダ>');
    process.exitCode = 2;
  } else {
    const r = await dirSize(root);
    console.log(`${formatBytes(r.bytes)}（ファイル ${r.files}、フォルダ ${r.dirs}、リンク ${r.symlinks}）`);
    for (const e of r.errors) console.error(`読めなかった: ${e.path}（${e.code}）`);
  }
}
