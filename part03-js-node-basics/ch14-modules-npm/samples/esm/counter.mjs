// ES Modules の export のいろいろ（第14章 2節）
// このファイルは main.mjs から読み込まれる。直接実行しても何も表示しない。

console.log('  [counter.mjs] 評価された（何回 import されても、これは1回だけ）');

// 名前付きの export（named export）
export let count = 0;
export function increment() {
  count++; // import した側から見える count も変わる（ライブバインディング）
}

// 宣言とは別に、まとめて export する。as で名前を変えられる
const VERSION = '1.0.0';
function reset() {
  count = 0;
}
export { VERSION, reset as resetCount };

// default export（1つのモジュールに1つだけ）
export default function describe() {
  return `count は ${count}`;
}
