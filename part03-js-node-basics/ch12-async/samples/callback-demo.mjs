// コールバックから Promise へ（第12章 2節・3節）
// 使い方: node callback-demo.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const here = import.meta.dirname;
const work = path.join(os.tmpdir(), 'ch12-callback-demo'); // 書き出し先（教材のフォルダを汚さない）

console.log('1. readFile を2つ呼ぶ（結果はまだ来ない）');

// Node.js の昔からの形: 最後の引数にコールバックを渡し、(err, 結果) の順で呼んでもらう（エラーファースト）
fs.readFile(`${here}/callback-demo.mjs`, 'utf8', (err, text) => {
  if (err) {
    console.error('読めませんでした:', err.message);
    return;
  }
  console.log(`(A) 読み終わった: ${text.split('\n').length} 行`);
});

fs.readFile(`${here}/no-such-file.txt`, 'utf8', (err) => {
  // 失敗しても例外は投げられない。err に入ってくるので、必ず調べる
  console.log(`(B) 無いファイル: ${err.code}`);
});

console.log('2. readFile の次の行（ファイルを待たずに先へ進む）。(A) と (B) は、終わった順に表示される');

// コールバックを入れ子にすると、右へ右へと深くなる（コールバック地獄）
function copyUpperCase(src, dest, done) {
  fs.readFile(src, 'utf8', (err, text) => {
    if (err) return done(err);
    fs.mkdir(work, { recursive: true }, (err) => {
      if (err) return done(err);
      fs.writeFile(dest, text.toUpperCase(), (err) => {
        if (err) return done(err);
        fs.stat(dest, (err, stat) => {
          if (err) return done(err);
          done(null, stat.size);
        });
      });
    });
  });
}

// 同じことを Promise と async/await で書くと、上から下へ読める
const readFile = promisify(fs.readFile); // コールバックの関数を Promise を返す関数に変える
async function copyUpperCaseAsync(src, dest) {
  const text = await readFile(src, 'utf8');
  await fs.promises.mkdir(work, { recursive: true }); // fs.promises には最初から Promise 版がある
  await fs.promises.writeFile(dest, text.toUpperCase());
  const stat = await fs.promises.stat(dest);
  return stat.size;
}

setTimeout(() => {
  copyUpperCase(`${here}/callback-demo.mjs`, path.join(work, 'upper1.txt'), (err, size) => {
    console.log(`3. コールバック版: ${err ? err.message : `${size} バイト`}`);
    copyUpperCaseAsync(`${here}/callback-demo.mjs`, path.join(work, 'upper2.txt'))
      .then((size2) => console.log(`4. async/await 版: ${size2} バイト`))
      .catch((err2) => console.error(err2));
  });
}, 50);
