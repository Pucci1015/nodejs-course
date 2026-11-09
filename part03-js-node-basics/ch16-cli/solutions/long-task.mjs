// 練習問題5 解答例: 時間のかかる書き出しを、Ctrl+C（SIGINT）・SIGTERM で安全に止める
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
  process.exit(2); // まだ何も書いていないので exit で良い
}
const out = path.resolve(opts.positionals[0]);
const items = Number(opts.values.items);
const delay = Number(opts.values.delay);

// 追加: シグナルを受け取ったら、印を付けるだけ。止めるのはループの側（今の1件が終わってから）
let stopping = null; // { signal, code }
function onSignal(signal, code) {
  if (stopping) {
    // 2回目: 待たずにすぐ終わる。一時ファイルが残ることがあるが、元のファイルは無事
    console.error(`\n${signal} をもう一度受け取ったので、すぐに終わります`);
    process.exit(code);
  }
  stopping = { signal, code };
  console.error(`\n${signal} を受け取りました。今の1件が終わったら止めます（もう一度押すとすぐ終わります）`);
}
process.on('SIGINT', () => onSignal('SIGINT', 130));
process.on('SIGTERM', () => onSignal('SIGTERM', 143));

// 修正: 同じフォルダの一時ファイルに書いて、最後に rename する（第15章 3.4節）
const tmp = path.join(path.dirname(out), `.${path.basename(out)}.${process.pid}.tmp`);
const fh = await fs.open(tmp, 'wx');
try {
  for (let i = 1; i <= items; i++) {
    if (stopping) break;
    await sleep(delay); // 1件の処理（途中では止められない、とする）
    await fh.write(`item ${i}\n`);
    console.error(`${i}/${items}`);
  }
  if (!stopping) await fh.sync();
} finally {
  await fh.close();
}

if (stopping) {
  await fs.rm(tmp, { force: true });
  console.error(`中止しました。${path.basename(out)} は変えていません`);
  process.exitCode = stopping.code; // 128 + シグナルの番号
} else {
  await fs.rename(tmp, out);
  console.error(`${items} 件を ${out} に書きました`);
}
