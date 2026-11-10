// 第15章 7.4節で書く、ファイルを1行ずつ読むプログラムの完成形
// 使い方（~/dev/part03/ch15-node-api で）: node samples/count-lines.mjs [ファイル] [探す言葉]
import fs from 'node:fs';
import { createInterface } from 'node:readline';

const file = process.argv[2] ?? 'README.md';
const word = process.argv[3] ?? 'Stream';

const rl = createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
let total = 0;
let hits = 0;
for await (const line of rl) {
  total++;
  if (line.includes(word)) hits++;
}
console.log(`${file}: ${total} 行、そのうち「${word}」を含む行は ${hits} 行`);
