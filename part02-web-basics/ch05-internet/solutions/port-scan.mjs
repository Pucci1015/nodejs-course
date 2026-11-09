// 練習問題11 の模範解答: 127.0.0.1 の、指定した範囲のポートを調べる
// 使い方: node port-scan.mjs 開始 終了   既定: 7000 7100（一度に調べるのは 1000 個まで）
// 注意: 自分の Mac（127.0.0.1）にだけ使う。接続先は変えられないようにしてある。
import net from 'node:net';

const start = Number(process.argv[2] ?? 7000);
const end = Number(process.argv[3] ?? 7100);

if (end < start || end - start + 1 > 1000) {
  console.log('範囲は 1000 個までにしてください');
  process.exit(1);
}

const total = end - start + 1;
const open = [];
let closed = 0;
let other = 0;
let finished = 0;
const startedAt = Date.now();

// 1つのポートの結果が出るたびに呼ぶ。全部そろったら、まとめて表示する
function done() {
  finished += 1;
  if (finished === total) {
    open.sort((a, b) => a - b);
    console.log(`${start}〜${end} の ${total} 個を ${Date.now() - startedAt}ms で調べました`);
    console.log(`open ${open.length} 個: ${open.join(', ')}`);
    console.log(`closed ${closed} 個、その他 ${other} 個`);
  }
}

for (let port = start; port <= end; port++) {
  const socket = net.connect(port, '127.0.0.1');
  socket.setTimeout(1000);
  socket.on('connect', () => {
    open.push(port);
    socket.destroy();
    done();
  });
  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      closed += 1;
    } else {
      other += 1;
    }
    done();
  });
  socket.on('timeout', () => {
    other += 1;
    socket.destroy();
    done();
  });
}
