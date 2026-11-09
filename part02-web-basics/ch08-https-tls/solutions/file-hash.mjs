// 練習問題1 の模範解答: ファイルの中身の SHA-256 を、shasum -a 256 と同じ形で表示する
// 使い方: node file-hash.mjs ファイル ...
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

for (const file of process.argv.slice(2)) {
  const data = await fs.readFile(file); // バイト列のまま読む
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  console.log(`${hash}  ${file}`); // shasum と同じく、空白2つで区切る
}
