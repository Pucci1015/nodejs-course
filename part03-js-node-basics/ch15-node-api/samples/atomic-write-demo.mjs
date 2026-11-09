// 書いている途中でプロセスが落ちたら、ファイルはどうなるか（第15章 3.4節）
// 使い方: node atomic-write-demo.mjs
//   子プロセスに 20MB のファイルを書かせ、途中で強制終了（SIGKILL）する。
//   (1) そのまま上書きする書き方と、(2) 一時ファイルに書いてから rename する書き方を比べる。
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const dir = path.join(os.tmpdir(), 'ch15-atomic-demo');
const target = path.join(dir, 'settings.json');
const ORIGINAL = JSON.stringify({ theme: 'dark', fontSize: 14 });

// 子プロセスの中身: 大きな JSON を少しずつ書く（mode が atomic なら、一時ファイルに書いてから rename）
const child = `
  const fs = require('node:fs');
  const [target, mode] = process.argv.slice(1);
  const dest = mode === 'atomic' ? target + '.' + process.pid + '.tmp' : target;
  const out = fs.createWriteStream(dest);
  out.write('{"items":[');
  let i = 0;
  (function more() {
    while (i < 2_000_000) {
      if (!out.write((i++ ? ',' : '') + JSON.stringify('item-' + i))) return out.once('drain', more);
    }
    out.end(']}', () => { if (mode === 'atomic') fs.renameSync(dest, target); });
  })();
`;

for (const mode of ['direct', 'atomic']) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, ORIGINAL);

  const proc = spawn(process.execPath, ['-e', child, target, mode]);
  await sleep(200); // 書いている途中で…
  proc.kill('SIGKILL'); // 電源が落ちた、OOM で殺された、などの代わり
  await new Promise((resolve) => proc.once('exit', resolve));

  const text = await fs.readFile(target, 'utf8');
  let state;
  try {
    JSON.parse(text);
    state = text === ORIGINAL ? '元のまま（正しい JSON）' : '新しい内容（正しい JSON）';
  } catch {
    state = '壊れている（JSON として読めない）';
  }
  const leftovers = (await fs.readdir(dir)).filter((name) => name.endsWith('.tmp'));
  console.log(`${mode === 'direct' ? '(1) そのまま上書き     ' : '(2) 一時ファイル + rename'}: ${String(text.length).padStart(9)} 文字、${state}${leftovers.length ? `、残った一時ファイル ${leftovers.length} 個` : ''}`);
}
await fs.rm(dir, { recursive: true, force: true });
