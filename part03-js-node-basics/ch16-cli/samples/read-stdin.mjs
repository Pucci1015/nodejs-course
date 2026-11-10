// 第16章 4節で書く、標準入力を全部読むプログラムの完成形
// 使い方（~/dev/part03/ch16-cli で）: printf 'りんご\nみかん\n' | node samples/read-stdin.mjs
if (process.stdin.isTTY) {
  // 端末から直接打たれている（パイプでもファイルでもない）
  console.error('使い方: printf "...\\n" | node read-stdin.mjs（パイプで渡してください）');
  process.exitCode = 2;
} else {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk); // Buffer のまま集める（文字の途中で切れていても大丈夫）
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const lines = text.split('\n').filter((line) => line !== '');
  console.log(`${lines.length} 行を読みました。最初の行: ${lines[0]}`);
}
