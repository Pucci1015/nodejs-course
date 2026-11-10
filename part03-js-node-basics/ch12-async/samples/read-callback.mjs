// 第12章 2.1節で書く、コールバックでファイルを読むプログラムの完成形
// 使い方（~/dev/part03/ch12-async で）: node samples/read-callback.mjs
import fs from 'node:fs';

console.log('1. 読み始める');

// 最後の引数がコールバック。読み終わったら (err, 中身) の順で呼んでもらう
fs.readFile('README.md', 'utf8', (err, text) => {
  if (err) {
    console.log('読めませんでした:', err.code);
    return;
  }
  console.log(`3. README.md は ${text.length} 文字`);
});

fs.readFile('no-such-file.txt', 'utf8', (err, text) => {
  if (err) {
    console.log('3. no-such-file.txt は読めませんでした:', err.code);
    return;
  }
  console.log(text);
});

console.log('2. readFile の次の行（読み終わるのを待たない）');
