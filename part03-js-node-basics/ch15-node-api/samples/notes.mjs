// 第15章 3.2節・3.3節で書く、fs/promises でファイルとフォルダを扱うプログラムの完成形
// 使い方（~/dev/part03/ch15-node-api で）: node samples/notes.mjs
// OS の一時フォルダの中に作業用のフォルダを作り、最後に消す
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch15-notes-'));
console.log('作業フォルダ:', dir);

const file = path.join(dir, 'memos', 'a.md');
await fs.mkdir(path.dirname(file), { recursive: true }); // memos フォルダを作る
await fs.writeFile(file, '# メモA\n');
await fs.appendFile(file, '追記した行\n');
console.log('1. 読んだ中身:', JSON.stringify(await fs.readFile(file, 'utf8')));

const entries = await fs.readdir(path.join(dir, 'memos'), { withFileTypes: true });
console.log('2. memos の中:', entries.map((e) => `${e.name}（${e.isFile() ? 'ファイル' : 'フォルダ'}）`));

try {
  await fs.readFile(path.join(dir, 'no-such.md'), 'utf8');
} catch (err) {
  console.log('3. 無いファイルを読むと:', err.code);
}

await fs.rm(dir, { recursive: true, force: true }); // 作業フォルダを中身ごと消す
console.log('4. 片付けた');
