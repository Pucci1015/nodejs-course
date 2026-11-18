// 練習問題6 の子: SIGTERM を受け取るまで動き続ける
const timer = setInterval(() => {}, 1000);
process.on('SIGTERM', () => {
  clearInterval(timer);
  process.exitCode = 0;
});
