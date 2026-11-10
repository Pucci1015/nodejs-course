// プロセスは、いつ終わるのか（第13章 8節）
// 使い方: node exit-demo.mjs 番号
//   1: タイマーが残っている間は終わらない
//   2: unref したタイマーは、プロセスを引き止めない
//   3: 解決されない Promise は、プロセスを引き止めない（トップレベル await なら終了コード 13）
//   4: サーバ（listen 中のソケット）は、close するまで引き止める
import http from 'node:http';

const start = performance.now();
const t = () => `${String(Math.round(performance.now() - start)).padStart(5)}ms`;
process.on('exit', (code) => console.log(`${t()} exit イベント（終了コード ${code}）`));

switch (process.argv[2]) {
  case '1':
    setTimeout(() => console.log(`${t()} 1秒のタイマーが動いた`), 1000);
    console.log(`${t()} 同期のコードは終わった。タイマーが残っているので、まだ終わらない`);
    break;

  case '2': {
    // 例: 1秒ごとに状態をログに出すが、それだけのためにプロセスを生かしておきたくはない
    const timer = setInterval(() => console.log(`${t()} 定期的な処理`), 1000);
    timer.unref();
    setTimeout(() => console.log(`${t()} 2.5秒の仕事が終わった`), 2500);
    break;
  }

  case '3':
    // 誰も resolve しない Promise。await しても、イベントループに待つものが無ければプロセスは終わる
    console.log(`${t()} 解決されない Promise を await する`);
    await new Promise(() => {});
    console.log('この行は表示されない');
    break;

  case '4': {
    const server = http.createServer((req, res) => res.end('ok\n'));
    server.listen(9132, '127.0.0.1', () => console.log(`${t()} 127.0.0.1:9132 で待っている`));
    setTimeout(() => {
      console.log(`${t()} server.close() を呼ぶ`);
      server.close();
    }, 1500);
    break;
  }

  default:
    console.log('使い方: node exit-demo.mjs 1〜4');
}
