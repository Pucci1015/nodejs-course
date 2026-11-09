// Ctrl+C（SIGINT）や kill（SIGTERM）を受け取って、片付けてから終わる（第16章 8節）
// 使い方: node signal-demo.mjs        （実行中に Ctrl+C。もう一度押すとすぐに終わる）
//         別のターミナルから: kill <表示された PID>   （SIGTERM）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = path.join(os.tmpdir(), `ch16-signal-demo-${process.pid}.tmp`);
fs.writeFileSync(tmp, '作業中のファイル\n');
console.error(`PID ${process.pid}。一時ファイル ${tmp} を作った。Ctrl+C で止めてください`);

let stopping = false;
function shutdown(signal, code) {
  if (stopping) {
    console.error(`\n${signal} をもう一度受け取ったので、片付けずにすぐ終わる`);
    process.exit(code);
  }
  stopping = true;
  console.error(`\n${signal} を受け取った。片付けてから終わる…`);
  clearInterval(timer);
  setTimeout(() => {
    fs.rmSync(tmp, { force: true }); // 片付け（本物なら、接続を閉じる、書きかけを消す、など）
    console.error('一時ファイルを消した');
    process.exitCode = code; // 128 + シグナルの番号（SIGINT は 2、SIGTERM は 15）
  }, 500);
}
process.on('SIGINT', () => shutdown('SIGINT', 130));
process.on('SIGTERM', () => shutdown('SIGTERM', 143));

let n = 0;
const timer = setInterval(() => console.log(`作業中… ${++n}`), 300);
