// process.exit() は、書きかけの出力を捨てることがある（第16章 6節）
// 使い方:
//   node exit-demo.mjs exit | wc -c        （process.exit(): パイプだと途中で切れる）
//   node exit-demo.mjs exitCode | wc -c    （process.exitCode: 最後まで出る）
//   node exit-demo.mjs exit > out.txt; wc -c out.txt; rm out.txt   （ファイルなら切れない）
const mode = process.argv[2] ?? 'exitCode';
const line = `${'x'.repeat(99)}\n`;
process.stdout.write(line.repeat(100_000)); // 100 文字 × 10万行 = 10,000,000 バイト

if (mode === 'exit') {
  // その場でプロセスを終える。パイプへの書き込みは非同期なので、まだ書けていない分は捨てられる
  process.exit(3);
} else {
  // 終了コードだけ決めておき、やることが無くなったら（書き終わったら）自然に終わる
  process.exitCode = 3;
}
