// CommonJS から ES Modules を読み込む（第14章 4節）
// 使い方: node from-cjs.cjs   （samples/interop フォルダで）

// Node.js 22.12 以降・20.19 以降では、トップレベル await を使っていない ES Modules を require できる
const modern = require('./modern.mjs');
console.log('1. require した ES Modules:', modern);
console.log('   名前付きの export:', modern.greet('alice'));
console.log('   default export   :', modern.default);

// トップレベル await を使っているものは require できない
try {
  require('./modern-tla.mjs');
} catch (err) {
  console.log('2. トップレベル await を使うものを require すると:', err.code);
}

// どの Node.js でも使える方法: 動的 import（Promise を返す）
import('./modern-tla.mjs').then((mod) => console.log('3. 動的 import なら読める:', mod.debug));
