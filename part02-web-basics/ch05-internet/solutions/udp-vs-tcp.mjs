// 練習問題12 の模範解答: だれも待ち受けていないポートに、TCP と UDP で送ってみる
// 使い方: node udp-vs-tcp.mjs [ポート]   既定: 7999（先に lsof で使われていないことを確かめる）
import net from 'node:net';
import dgram from 'node:dgram';

const port = Number(process.argv[2] ?? 7999);

// TCP: 接続を作ろうとする
const socket = net.connect(port, '127.0.0.1');
socket.on('connect', () => {
  console.log('TCP: 接続できた（だれかが待ち受けている）');
  socket.destroy();
});
socket.on('error', (err) => {
  console.log(`TCP: エラー ${err.code} → 相手の OS が「だれもいない」と拒否した`);
});

// UDP: 接続を作らず、いきなり送る
const udp = dgram.createSocket('udp4');
udp.send('hello', port, '127.0.0.1', (err) => {
  if (err) {
    console.log(`UDP: 送れなかった ${err.code}`);
  } else {
    console.log('UDP: エラーなしで送り終わった → 届いたかどうかは分からない');
  }
  udp.close();
});
