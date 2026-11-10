// 出力先が先に閉じられたとき（EPIPE）（第16章 7節）
// 使い方:
//   node epipe-demo.mjs crash | head -3    （何もしないと、EPIPE のエラーで落ちる）
//   node epipe-demo.mjs fixed | head -3    （EPIPE を受け取って、静かに終わる）
// head は3行読んだら終わり、パイプを閉じる。その後に書こうとすると EPIPE（Broken pipe）になる。
const mode = process.argv[2] ?? 'crash';

if (mode === 'fixed') {
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') process.exit(0); // 読む人がいなくなった。これ以上書いても無駄なので終わる
    throw err;
  });
}

for (let i = 1; i <= 1_000_000; i++) {
  // 背圧を守って書く（第15章 7.3節）。console.log で書き続けると、全部をメモリに溜めてしまう
  if (!process.stdout.write(`line ${i}\n`)) await new Promise((r) => process.stdout.once('drain', r));
}
console.error('最後まで書いた');
