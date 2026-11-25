// 練習問題5 の模範解答: Node.js で自分の環境を表示する
// 使い方: node me.mjs   /   SHOW_PATH=1 node me.mjs
console.log(`OS: ${process.platform} / CPU: ${process.arch}`);
console.log(`Node.js: ${process.version}`);

// LTS でなければ process.release.lts は undefined になる（本文7.1節）
if (process.release.lts === undefined) {
  console.log('LTS ではありません');
} else {
  console.log(`LTS: ${process.release.lts}`);
}

// 環境変数は、無ければ undefined（本文7.1節の process.env）
if (process.env.SHOW_PATH !== undefined) {
  console.log(`場所: ${process.execPath}`);
}
