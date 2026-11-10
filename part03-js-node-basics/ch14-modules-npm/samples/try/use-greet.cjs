// 第14章 3節で書く、greet.cjs を require するファイルの完成形
// 使い方（~/dev/part03/ch14-modules-npm で）: node samples/try/use-greet.cjs
const { greet, shout } = require('./greet.cjs');

console.log(greet());
console.log(shout(greet('bob')));
console.log('__dirname:', __dirname);
