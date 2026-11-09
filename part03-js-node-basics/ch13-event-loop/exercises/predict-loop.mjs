// 練習問題1 用: 表示される順番を、実行する前に予想してください
// 使い方: node predict-loop.mjs
//
// 全体を fs.readFile のコールバックの中で動かしています。こうすると、
// setTimeout(0) と setImmediate の順番や、nextTick とマイクロタスクの順番が毎回同じになります。
import fs from 'node:fs';

const log = (s) => console.log(s);

fs.readFile(import.meta.filename, () => {
  log('A');

  setTimeout(() => {
    log('B');
    process.nextTick(() => log('C'));
    Promise.resolve().then(() => log('D'));
  }, 0);

  setImmediate(() => {
    log('E');
    setTimeout(() => log('F'), 0);
    process.nextTick(() => log('H'));
  });

  Promise.resolve()
    .then(() => {
      log('I');
      process.nextTick(() => log('J'));
    })
    .then(() => log('K'));

  process.nextTick(() => {
    log('L');
    Promise.resolve().then(() => log('M'));
    process.nextTick(() => log('N'));
  });

  queueMicrotask(() => log('O'));

  log('P');
});
