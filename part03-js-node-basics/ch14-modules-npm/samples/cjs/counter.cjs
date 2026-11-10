// CommonJS のモジュール（第14章 3節）
// このファイルは main.cjs から require される。

console.log('  [counter.cjs] 評価された');

let count = 0;

module.exports = {
  count, // ここで「その時点の値 0」がコピーされる（ライブバインディングではない）
  increment() {
    count++;
  },
  getCount() {
    return count;
  },
};
