// libuv のスレッドプール: 重い crypto や fs は、裏の別スレッドで動く（第13章 4節）
// 使い方:
//   node threadpool-demo.mjs                       スレッドプールは既定の 4 本
//   UV_THREADPOOL_SIZE=2 node threadpool-demo.mjs  2 本にする
//   UV_THREADPOOL_SIZE=8 node threadpool-demo.mjs  8 本にする
//   node threadpool-demo.mjs sync                  同期版（pbkdf2Sync）と比べる
import crypto from 'node:crypto';
import os from 'node:os';

const JOBS = 8;
const ITERATIONS = 300_000; // 1回が 100ms 前後になる回数（Mac の速さで変わる）
const mode = process.argv[2] ?? 'async';

console.log(`CPU のコア数: ${os.availableParallelism()}、UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE ?? '（未設定 = 4）'}`);
console.log(`pbkdf2 を ${JOBS} 回、${mode === 'sync' ? '同期で1つずつ' : '非同期で同時に'}実行します`);

const start = performance.now();
const t = () => `${String(Math.round(performance.now() - start)).padStart(5)}ms`;

// メインのスレッドが空いているかを確かめるため、50ms ごとに印を出す
let ticks = 0;
const timer = setInterval(() => ticks++, 50);

if (mode === 'sync') {
  for (let i = 1; i <= JOBS; i++) {
    crypto.pbkdf2Sync('password', 'salt', ITERATIONS, 64, 'sha512');
    console.log(`${t()} ${i} 番目が終わった`);
  }
  finish();
} else {
  let done = 0;
  for (let i = 1; i <= JOBS; i++) {
    crypto.pbkdf2('password', 'salt', ITERATIONS, 64, 'sha512', () => {
      console.log(`${t()} ${i} 番目が終わった`);
      if (++done === JOBS) finish();
    });
  }
  console.log(`${t()} ${JOBS} 個を頼み終わった（まだ1つも終わっていない）`);
}

function finish() {
  clearInterval(timer);
  const expected = Math.floor((performance.now() - start) / 50);
  console.log(`${t()} すべて終わった。50ms ごとのタイマーは ${ticks} 回動いた（空いていれば約 ${expected} 回）`);
}
