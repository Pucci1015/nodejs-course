// 練習問題3 の模範解答
export function startHeartbeat(intervalMs, onBeat) {
  let count = 0;
  const timer = setInterval(() => {
    count++;
    onBeat(count);
  }, intervalMs);
  timer.unref(); // 心拍のためだけに、プロセスを生かしておかない
  return () => clearInterval(timer);
}
