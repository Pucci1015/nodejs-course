// 練習問題1 用（CommonJS 版）: 表示される行を、実行する前に予想してください
// 使い方: node cycle-cjs/main.cjs   （exercises フォルダで）
console.log('main: 始まり');
const a = require('./a.cjs');
console.log('main:', a.a, a.getB());
