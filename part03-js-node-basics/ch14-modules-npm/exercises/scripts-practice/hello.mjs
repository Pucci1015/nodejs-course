// 練習問題3 用: 名前を受け取ってあいさつする（完成しています）
// 使い方: node hello.mjs [名前]
const name = process.argv[2] ?? 'world';
console.log(`こんにちは、${name}`);
