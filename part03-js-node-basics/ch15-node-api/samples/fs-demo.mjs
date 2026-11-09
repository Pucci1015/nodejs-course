// node:fs/promises でファイルとフォルダを扱う（第15章 3節）
// 使い方: node fs-demo.mjs
//   OS の一時フォルダの中に ch15-fs-demo を作って試し、最後に消す。
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.join(os.tmpdir(), 'ch15-fs-demo');
await fs.rm(root, { recursive: true, force: true }); // 前回の残りを消す（force: 無くてもエラーにしない）
console.log('作業フォルダ:', root);

// mkdir: recursive なら、途中のフォルダもまとめて作り、既にあってもエラーにしない
await fs.mkdir(path.join(root, 'memos', '2026'), { recursive: true });

// writeFile / appendFile / readFile
const file = path.join(root, 'memos', '2026', 'a.md');
await fs.writeFile(file, '# メモA\n');
await fs.appendFile(file, '追記した行\n');
console.log('1. readFile:', JSON.stringify(await fs.readFile(file, 'utf8')));

// flag: 'wx' は「無ければ作る。あればエラー」。確かめてから書くと、その間に別の誰かが作るかもしれない
try {
  await fs.writeFile(file, '上書き？', { flag: 'wx' });
} catch (err) {
  console.log('2. flag wx で既にあるファイルに書くと:', err.code);
}

// エラーの code で、何が起きたかを見分ける
for (const [label, fn] of [
  ['無いファイルを読む', () => fs.readFile(path.join(root, 'none.md'))],
  ['フォルダを readFile', () => fs.readFile(root)],
  ['空でないフォルダを rmdir', () => fs.rmdir(path.join(root, 'memos'))],
]) {
  try {
    await fn();
  } catch (err) {
    console.log(`3. ${label}: ${err.code}`);
  }
}

// stat: 大きさ・種類・更新時刻
const st = await fs.stat(file);
console.log('4. stat:', { size: st.size, isFile: st.isFile(), isDirectory: st.isDirectory(), mtime: st.mtime instanceof Date });

// readdir: withFileTypes で種類も一緒に。recursive で下のフォルダまで（Node.js 20 以降）
await fs.writeFile(path.join(root, 'memos', 'b.md'), '# メモB\n');
await fs.symlink(file, path.join(root, 'memos', 'link-to-a.md'));
const entries = await fs.readdir(path.join(root, 'memos'), { withFileTypes: true });
console.log('5. readdir:', entries.map((e) => `${e.name}（${e.isDirectory() ? 'フォルダ' : e.isSymbolicLink() ? 'リンク' : 'ファイル'}）`).sort());
console.log('   recursive:', (await fs.readdir(root, { recursive: true })).sort());

// rename: 同じディスクの中なら、一瞬で（途中の状態なしに）名前を変える
await fs.rename(path.join(root, 'memos', 'b.md'), path.join(root, 'memos', 'b-renamed.md'));

// access ではなく、使ってみてエラーを受け取る（確かめてから使うと、その間に変わるかもしれない）
const exists = await fs.stat(path.join(root, 'memos', 'b.md')).then(() => true, (err) => (err.code === 'ENOENT' ? false : Promise.reject(err)));
console.log('6. b.md はまだあるか:', exists);

await fs.rm(root, { recursive: true });
console.log('7. 片付けた:', await fs.stat(root).then(() => 'まだある', () => '消えた'));
