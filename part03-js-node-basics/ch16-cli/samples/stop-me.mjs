// 第16章 8節で書く、Ctrl+C を受け取って片付けてから終わるプログラムの完成形
// 使い方（~/dev/part03/ch16-cli で）: node samples/stop-me.mjs → Ctrl+C → echo $?
let count = 0;
const timer = setInterval(() => console.log(`作業中… ${++count}`), 500);

let stopping = false;
process.on('SIGINT', () => {
  if (stopping) process.exit(130); // 2回目の Ctrl+C: すぐに終わる
  stopping = true;
  console.error('\nCtrl+C を受け取った。片付けてから終わる…');
  clearInterval(timer); // 新しい仕事を始めない
  setTimeout(() => {
    console.error('片付けが終わった');
    process.exitCode = 130; // 128 + 2（SIGINT の番号）
  }, 1000);
});
