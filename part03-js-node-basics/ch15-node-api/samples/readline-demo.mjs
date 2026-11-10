// 大きなファイルを1行ずつ読む: readFile と readline のメモリの違い（第15章 7.4節）
// 使い方: node readline-demo.mjs [行数]     既定 1000000 行（約 60MB のファイルを一時フォルダに作る）
//   それぞれ別の子プロセスで実行し、メモリ（RSS）の最大を比べる。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LINES = Number(process.argv[2] ?? 1_000_000);
const file = path.join(os.tmpdir(), 'ch15-readline-demo.log');

if (process.argv[3] === 'child') {
  const mode = process.argv[4];
  let errors = 0;
  if (mode === 'readFile') {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) if (line.includes(' 500 ')) errors++;
  } else {
    const { createInterface } = await import('node:readline');
    const rl = createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) if (line.includes(' 500 ')) errors++;
  }
  // maxRSS は KiB 単位（このプロセスで使ったメモリの最大）
  console.log(JSON.stringify({ errors, maxRssMiB: Math.round(process.resourceUsage().maxRSS / 1024) }));
} else {
  const out = fs.createWriteStream(file);
  for (let i = 0; i < LINES; i++) {
    const status = i % 50 === 0 ? 500 : 200;
    if (!out.write(`2026-11-04T12:00:00Z GET /items/${i} ${status} ${(i * 37) % 9000}\n`)) {
      await new Promise((r) => out.once('drain', r));
    }
  }
  await new Promise((r) => out.end(r));
  console.log(`${LINES.toLocaleString()} 行、${Math.round(fs.statSync(file).size / 1024 / 1024)} MiB のファイルを作った`);

  for (const mode of ['readFile', 'readline']) {
    const start = performance.now();
    const r = spawnSync(process.execPath, [import.meta.filename, String(LINES), 'child', mode], { encoding: 'utf8' });
    const { errors, maxRssMiB } = JSON.parse(r.stdout);
    console.log(`${mode.padEnd(8)}: 500 の行 ${errors.toLocaleString()} 件、${Math.round(performance.now() - start)}ms、メモリの最大 ${maxRssMiB} MiB`);
  }
  fs.rmSync(file);
}
