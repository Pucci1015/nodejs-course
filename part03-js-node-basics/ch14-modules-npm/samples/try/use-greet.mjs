// 第14章 2.1節で書く、greet.mjs を import するファイルの完成形
// 使い方（~/dev/part03/ch14-modules-npm で）: node samples/try/use-greet.mjs
import shout, { greet, DEFAULT_NAME } from './greet.mjs';

console.log(greet());
console.log(shout(greet('bob')));
console.log('既定の名前:', DEFAULT_NAME);
