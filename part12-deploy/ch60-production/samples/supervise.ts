// 第60章 4.2節: 落ちたら起動し直す、小さな見張り役（Docker の restart や PaaS がしていること）
// 動かし方（章のフォルダで）: node samples/supervise.ts samples/crash.ts
//   Ctrl+C（SIGINT）か SIGTERM を受け取ったら、子に SIGTERM を伝え、子が終わったら自分も終わる（起動し直さない）
import { spawn } from 'node:child_process';

const [script, ...args] = process.argv.slice(2);
if (script === undefined) {
  console.error('使い方: node samples/supervise.ts 動かすファイル.ts');
  process.exit(2);
}

let restarts = 0;
let stopping = false;
let child = start();

function start() {
  const c = spawn(process.execPath, [script ?? '', ...args], { stdio: 'inherit' });
  c.on('exit', (code, signal) => {
    if (stopping) {
      console.log(`[見張り] 子が終わりました（code ${code}）。見張りも終わります`);
      return;
    }
    // 1秒、2秒、4秒、… と待つ時間を延ばす（すぐ落ちるものを、休みなく起動し直さないように）。上限 30 秒
    const wait = Math.min(1000 * 2 ** restarts, 30_000);
    restarts += 1;
    console.log(`[見張り] 子が終わりました（code ${code}、signal ${signal}）。${wait} ms 後に起動し直します（${restarts} 回目）`);
    setTimeout(() => {
      child = start();
    }, wait);
  });
  return c;
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopping = true;
    console.log(`[見張り] ${sig} を受け取りました。子に SIGTERM を送ります`);
    child.kill('SIGTERM');
  });
}
