// 第13章 8節で書く、unref したタイマーがプロセスを引き止めないことを確かめるプログラムの完成形
// 使い方（~/dev/part03/ch13-event-loop で）: node samples/unref-demo.mjs

const watcher = setInterval(() => console.log('見張り中'), 300);
watcher.unref(); // この行を消すと、プロセスが終わらなくなる（Ctrl+C で止める）

setTimeout(() => console.log('1秒の仕事が終わった'), 1000);
