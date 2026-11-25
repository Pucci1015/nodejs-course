// 本文7.2節「手を動かす」の完成形
// 使い方: node hello.mjs   （~/dev/ch02 にコピーしてから）
const name = process.env.USER;
console.log(`こんにちは、${name} さん`);
console.log(`Node.js ${process.version}（${process.arch}）で動いています`);
