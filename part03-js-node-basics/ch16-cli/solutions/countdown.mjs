// 練習問題3 の模範解答
const TICK_MS = Number(process.env.TICK_MS ?? 1000);

const arg = process.argv[2] ?? '5';
if (!/^[1-9]\d*$/.test(arg)) {
  console.error(`エラー: 秒数には 1 以上の整数を書いてください: ${arg}`);
  process.exitCode = 2;
} else {
  let n = Number(arg);
  console.log(n);
  const timer = setInterval(() => {
    n--;
    if (n > 0) {
      console.log(n);
    } else {
      clearInterval(timer);
      console.log('発射！');
    }
  }, TICK_MS);

  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) process.exit(130); // 2回目は、すぐに終わる
    stopping = true;
    clearInterval(timer);
    console.error('中止しました');
    process.exitCode = 130;
  });
}
