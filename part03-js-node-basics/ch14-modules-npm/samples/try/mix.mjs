// 第14章 4.2節で書く、ES Modules から CommonJS を import するファイルの完成形
// 使い方（~/dev/part03/ch14-modules-npm で）: node samples/try/mix.mjs
import greetCjs from './greet.cjs'; // default は module.exports そのもの
import { greet } from './greet.cjs'; // 名前付きでも取れる

console.log(greetCjs);
console.log(greet('carol'));
