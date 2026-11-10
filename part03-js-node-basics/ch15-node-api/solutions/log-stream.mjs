// 練習問題8 の解答: 大きなアクセスログ（.gz も）を、少しずつ読みながら集計する
// 使い方: node log-stream.mjs ログのファイル [--top 5]
// 確かめ方: cd ../exercises && MODULE=../solutions/log-stream.mjs node --test log-stream.test.mjs
import fs from 'node:fs';
import { createInterface } from 'node:readline';
import zlib from 'node:zlib';
import { parseLine } from '../../ch11-js-refresher/solutions/log-summary.mjs'; // 第11章 練習問題6

export async function summarizeLogFile(file, { top = 3 } = {}) {
  // .gz なら、読む → 展開する、をつなぐ。展開した後も Stream なので、全体をメモリに載せない
  let input = fs.createReadStream(file);
  if (file.endsWith('.gz')) {
    const gunzip = zlib.createGunzip();
    input.on('error', (err) => gunzip.destroy(err)); // 読む側の失敗（ENOENT など）を、展開する側に伝える
    input = input.pipe(gunzip);
  }
  const rl = createInterface({ input, crlfDelay: Infinity });

  // 行を全部ためずに、1行ごとに「数えるもの」だけを更新する
  const summary = { total: 0, invalid: 0, byStatusClass: {}, bytesTotal: 0, first: null, last: null };
  const pathCounts = new Map();
  for await (const line of rl) {
    if (line.trim() === '') continue;
    const entry = parseLine(line);
    if (!entry) {
      summary.invalid++;
      continue;
    }
    summary.total++;
    const cls = `${Math.floor(entry.status / 100)}xx`;
    summary.byStatusClass[cls] = (summary.byStatusClass[cls] ?? 0) + 1;
    summary.bytesTotal += entry.bytes;
    pathCounts.set(entry.path, (pathCounts.get(entry.path) ?? 0) + 1);
    // Math.min(...times) は、引数が多すぎるとコールスタックがあふれる。1件ずつ比べる
    if (!summary.first || entry.time < summary.first) summary.first = entry.time;
    if (!summary.last || entry.time > summary.last) summary.last = entry.time;
  }

  summary.topPaths = [...pathCounts]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .slice(0, top);
  return summary;
}

if (import.meta.main) {
  const [file, flag, n] = process.argv.slice(2);
  if (!file) {
    console.error('使い方: node log-stream.mjs ログのファイル [--top 5]');
    process.exitCode = 2;
  } else {
    console.log(await summarizeLogFile(file, { top: flag === '--top' ? Number(n) : 3 }));
  }
}
