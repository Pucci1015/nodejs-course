// 練習問題6 の子: RUN_MS ミリ秒だけ動いてから、終了コード 1 で終わる
setTimeout(() => {
  process.exitCode = 1;
}, Number(process.env.RUN_MS ?? 100));
process.on('SIGTERM', () => process.exit(0));
