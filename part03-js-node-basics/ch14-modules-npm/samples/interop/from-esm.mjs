// ES Modules から CommonJS を読み込む（第14章 4節）
// 使い方: node from-esm.mjs   （samples/interop フォルダで）
import legacy, { add, PI } from './legacy.cjs'; // default は module.exports そのもの
import * as ns from './legacy.cjs';

console.log('1. default（module.exports そのもの）:', legacy);
console.log('2. 名前付きで import した add(1, 2):', add(1, 2), '/ PI:', PI);
console.log('3. 名前付きで取れる名前:', Object.keys(ns));
// secret は、ファイルを実行せずに読み取った「exports.名前 =」の形に無いので、名前付きでは取れない
console.log('4. secret は default から取る:', legacy.secret);

// CommonJS の require も、作って使える（ES Modules の中に require は無い）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
console.log('5. createRequire で JSON を読む:', require('./data.json'));
