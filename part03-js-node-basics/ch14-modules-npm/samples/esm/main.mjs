// ES Modules の import のいろいろ（第14章 2節）
// 使い方: node main.mjs   （samples/esm フォルダで）
import describe, { count, increment, VERSION, resetCount } from './counter.mjs'; // 拡張子 .mjs は省略できない
import * as counter from './counter.mjs'; // 名前空間 import。同じモジュールなので、もう一度は評価されない

console.log('1. import した値:', { count, VERSION });

increment();
increment();
console.log('2. increment() を2回呼んだ後の count:', count, '/', counter.count, '/', describe());

try {
  count = 100; // import した名前には代入できない（読み取り専用の「窓」）
} catch (err) {
  console.log('3. 代入しようとすると:', err.constructor.name, '-', err.message);
}

resetCount();
console.log('4. resetCount() の後:', count);

// import.meta: このモジュール自身の情報
console.log('5. import.meta.url     :', import.meta.url.replace(/^.*\/samples\//, '…/samples/'));
console.log('   import.meta.filename:', import.meta.filename.replace(/^.*\/samples\//, '…/samples/'));
console.log('   import.meta.dirname :', import.meta.dirname.replace(/^.*\/samples\//, '…/samples/'));

// 動的 import: 実行中に、必要になってから読み込む。Promise を返す
const name = process.argv[2] === 'os' ? 'node:os' : 'node:path';
const mod = await import(name); // トップレベル await（ES Modules だけで使える）
console.log(`6. 動的に読み込んだ ${name} の export の数:`, Object.keys(mod).length);
