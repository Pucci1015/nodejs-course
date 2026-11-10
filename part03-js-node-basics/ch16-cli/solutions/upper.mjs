// 練習問題2 の模範解答
import { parseArgs } from 'node:util';

let values;
try {
  ({ values } = parseArgs({ args: process.argv.slice(2), options: { number: { type: 'boolean', short: 'n' } } }));
} catch (err) {
  console.error(`エラー: ${err.message}`);
  process.exitCode = 2;
}

if (values) {
  if (process.stdin.isTTY) {
    console.error('使い方: printf "...\\n" | node upper.mjs [-n]（標準入力をパイプで渡してください）');
    process.exitCode = 2;
  } else {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk); // Buffer のまま集める
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop(); // 最後の改行の後ろの空の要素は、行ではない
    lines.forEach((line, i) => {
      const upper = line.toUpperCase();
      console.log(values.number ? `${i + 1}: ${upper}` : upper);
    });
  }
}
