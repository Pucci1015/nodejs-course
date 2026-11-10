// CommonJS の require のいろいろ（第14章 3節）
// 使い方: node main.cjs   （samples/cjs フォルダで）
const counter = require('./counter.cjs');
const again = require(__dirname + '/counter.cjs'); // 書き方が違っても、同じファイルなら同じもの
// 拡張子の省略: require('./counter') は counter.js・counter.json・counter.node の順に探す（.cjs は探さない）

console.log('1. 2回 require したものは同じオブジェクト:', counter === again);

counter.increment();
counter.increment();
console.log('2. increment() を2回呼んだ後: counter.count =', counter.count, '/ getCount() =', counter.getCount());

// require は、ただの関数。if の中でも、実行中に決めた名前でも呼べる
const name = process.argv[2] === 'os' ? 'node:os' : 'node:path';
console.log(`3. require('${name}') の export の数:`, Object.keys(require(name)).length);

// CommonJS のファイルは、Node.js が関数で包んでから実行している
//   (function (exports, require, module, __filename, __dirname) { …ファイルの中身… })
console.log('4. このファイルを包んでいる関数の引数の数:', arguments.length);
console.log('   __filename:', __filename.replace(/^.*\/samples\//, '…/samples/'));
console.log('   __dirname :', __dirname.replace(/^.*\/samples\//, '…/samples/'));

// require したモジュールは require.cache に入っている
console.log('5. require.cache に入っているファイル:', Object.keys(require.cache).map((p) => p.replace(/^.*\/samples\//, '…/samples/')));
