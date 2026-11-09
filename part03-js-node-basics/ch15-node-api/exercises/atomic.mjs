// 練習問題2: 途中で落ちても壊れない書き込みと、取りこぼさない更新を作ってください。
// 要件は README と atomic.test.mjs にあります。
// 確かめ方: node --test atomic.test.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * file に data を「全部書けたか、まったく書かなかったか」のどちらかになるように書く。
 * @param {string} file
 * @param {string | Buffer} data
 * @param {{ fsync?: boolean }} [options]
 */
export async function writeFileAtomic(file, data, { fsync = true } = {}) {
  // ここを書く
}

/**
 * JSON のファイルを読み、updater で変えて、壊れないように書き戻す。新しい値を返す。
 * @param {string} file
 * @param {(value: any) => any} updater  今の値を受け取り、新しい値を返す（async でもよい）
 * @param {{ defaultValue?: any }} [options]  ファイルが無いときに使う値（既定は {}）
 */
export async function updateJson(file, updater, { defaultValue = {} } = {}) {
  // ここを書く
}
