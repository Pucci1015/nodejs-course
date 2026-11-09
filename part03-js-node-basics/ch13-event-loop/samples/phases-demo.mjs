// setTimeout(0) と setImmediate の順番は、どこから呼んだかで変わる（第13章 3節）
// 使い方: node phases-demo.mjs   （何度か実行してみる）
import fs from 'node:fs';

// (1) メインのコードから: どちらが先かは決まっていない（Mac の負荷などで変わる）
setTimeout(() => console.log('(1) timeout'), 0);
setImmediate(() => console.log('(1) immediate'));

// (2) I/O のコールバックの中から: いつも setImmediate が先
fs.readFile(import.meta.filename, () => {
  setTimeout(() => console.log('(2) timeout'), 0);
  setImmediate(() => console.log('(2) immediate'));
});
