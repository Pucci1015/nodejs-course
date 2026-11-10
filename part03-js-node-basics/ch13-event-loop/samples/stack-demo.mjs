// 1つのスレッドは、今の処理が終わるまで次へ進まない（第13章 1節）
// 使い方: node stack-demo.mjs

const start = performance.now();
const t = () => `${String(Math.round(performance.now() - start)).padStart(4)}ms`;

console.log(`${t()} 10ms 後に呼ぶタイマーを予約する`);
setTimeout(() => console.log(`${t()} タイマーが呼ばれた（10ms のはずが…）`), 10);

console.log(`${t()} 500ms かかる計算を始める`);
let n = 0;
while (performance.now() - start < 500) n++; // 500ms のあいだ、CPU を使い続ける
console.log(`${t()} 計算が終わった（${n.toLocaleString()} 回まわった）`);

// 関数の呼び出しは「コールスタック」に積まれる。深すぎると溢れる
function depth(k) {
  try {
    return depth(k + 1);
  } catch {
    return k; // RangeError: Maximum call stack size exceeded
  }
}
console.log(`${t()} コールスタックには、およそ ${depth(0).toLocaleString()} 段まで積める`);
console.log(`${t()} 同期のコードが終わった。ここからタイマーの番`);
