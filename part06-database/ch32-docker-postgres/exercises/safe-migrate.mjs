// 練習問題8: 本文8.1節の migrate を、2つのサーバが同時に起動しても、ファイルが書き換えられても安全なものにしてください。
// 要件は README にあります。
// 確かめ方: node --test safe-migrate.test.mjs
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function migrate(pool, dir) {
  // ここを書く（動かしたファイルの名前の配列を返す）
}
