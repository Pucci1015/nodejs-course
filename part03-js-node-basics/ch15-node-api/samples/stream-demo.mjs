// Stream: データを少しずつ流して処理する（第15章 7節）
// 使い方: node stream-demo.mjs
//   OS の一時フォルダの中に ch15-stream-demo を作って試し、最後に消す。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

const dir = path.join(os.tmpdir(), 'ch15-stream-demo');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
const src = path.join(dir, 'log.txt');
fs.writeFileSync(src, Array.from({ length: 100_000 }, (_, i) => `line ${i} ok\n`).join(''));

// 1. pipeline: 読む → 圧縮する → 書く を、つないで流す。どこかで失敗したら全部を片付けて reject
await pipeline(fs.createReadStream(src), zlib.createGzip(), fs.createWriteStream(`${src}.gz`));
console.log(`1. gzip: ${fs.statSync(src).size} バイト → ${fs.statSync(`${src}.gz`).size} バイト`);

// 2. 自分で Transform を作る: 流れてくるチャンクを変えて、次に渡す
let chunks = 0;
const upper = new Transform({
  transform(chunk, _encoding, callback) {
    chunks++;
    callback(null, chunk.toString('latin1').toUpperCase()); // ここでは ASCII だけなので latin1 で十分
  },
});
await pipeline(fs.createReadStream(src), upper, fs.createWriteStream(path.join(dir, 'upper.txt')));
console.log(`2. Transform: ${chunks} 個のチャンク（1つ 64KiB まで）で流れた。先頭: ${fs.readFileSync(path.join(dir, 'upper.txt'), 'utf8').slice(0, 9)}`);

// 3. 背圧（backpressure）: 書く側が遅いとき、write() は false を返して「待って」と伝える
const slow = new Writable({
  highWaterMark: 4, // 4 個までしか溜めない（objectMode なので「個」）
  objectMode: true,
  write(_item, _enc, callback) {
    setTimeout(callback, 1); // 1件に 1ms かかる
  },
});
let falses = 0;
let drains = 0;
slow.on('drain', () => drains++);
for (let i = 0; i < 20; i++) {
  if (!slow.write(i)) {
    falses++;
    await new Promise((resolve) => slow.once('drain', resolve)); // 空くまで待つ
  }
}
slow.end();
await new Promise((resolve) => slow.once('finish', resolve));
console.log(`3. 背圧: write() が false を返した回数 ${falses}、drain の回数 ${drains}`);

// 4. 読む側は for await で読める（async iterator）
let total = 0;
for await (const chunk of fs.createReadStream(src)) total += chunk.length;
console.log(`4. for await で読んだバイト数: ${total}`);

// 5. 配列やジェネレータから Readable を作る
async function* numbers() {
  for (let i = 1; i <= 3; i++) yield `${i}\n`;
}
const collected = [];
await pipeline(Readable.from(numbers()), new Writable({
  write(chunk, _enc, cb) {
    collected.push(chunk.toString());
    cb();
  },
}));
console.log('5. Readable.from(ジェネレータ):', collected);

// 6. pipeline の途中で失敗すると: エラーで reject され、他のストリームも閉じられる
const broken = new Transform({
  transform(chunk, _enc, cb) {
    cb(new Error('途中で失敗'));
  },
});
const out = fs.createWriteStream(path.join(dir, 'never.txt'));
try {
  await pipeline(fs.createReadStream(src), broken, out);
} catch (err) {
  console.log('6. pipeline の失敗:', err.message, '/ 書く側は閉じられた:', out.destroyed);
}

fs.rmSync(dir, { recursive: true });
