// 練習問題5: 時間のかかる書き出し。途中で Ctrl+C すると、出力ファイルが中途半端になる
// 仕様は README の練習問題5を見てください。
// 確かめる: bash check-long-task.sh
// 使い方: node long-task.mjs <出力ファイル> [--items 件数] [--delay ミリ秒]
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

let opts;
try {
  opts = parseArgs({ options: { items: { type: 'string', default: '20' }, delay: { type: 'string', default: '200' } }, allowPositionals: true });
  if (opts.positionals.length !== 1) throw new Error('出力ファイルを1つ指定してください');
} catch (err) {
  console.error(`long-task: ${err.message}\n使い方: long-task <出力ファイル> [--items 件数] [--delay ミリ秒]`);
  process.exit(2);
}
const out = path.resolve(opts.positionals[0]);
const items = Number(opts.values.items);
const delay = Number(opts.values.delay);

// ここを書き換える
await fs.writeFile(out, '');
for (let i = 1; i <= items; i++) {
  await sleep(delay); // 1件の処理（途中では止められない、とする）
  await fs.appendFile(out, `item ${i}\n`);
  console.error(`${i}/${items}`);
}
console.error(`${items} 件を ${out} に書きました`);
