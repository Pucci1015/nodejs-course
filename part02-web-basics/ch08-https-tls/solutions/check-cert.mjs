// 練習問題10 の模範解答: 複数のサーバの証明書をまとめて調べ、期限切れが近いものを知らせる
// 使い方: node check-cert.mjs [--warn-days 日数] [--ca ファイル]... ホスト:ポート ...
//   例: node check-cert.mjs --warn-days 10 --ca ~/dev/ch08/ca-a/ca.pem localhost:8444 example.com
// 終了ステータス: 0 すべて OK / 1 WARN がある / 2 NG がある / 3 ERROR がある（複数あれば大きい方）
import tls from 'node:tls';
import fs from 'node:fs';

const LEVELS = { OK: 0, WARN: 1, NG: 2, ERROR: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

// 引数を読む
let warnDays = 30;
const caList = [];
const targets = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--warn-days') {
    i++; // 次の引数が日数
    warnDays = Number(args[i]);
  } else if (args[i] === '--ca') {
    i++;
    caList.push(fs.readFileSync(args[i], 'utf8'));
  } else {
    targets.push(args[i]);
  }
}
if (targets.length === 0) {
  console.log('使い方: node check-cert.mjs [--warn-days 日数] [--ca ファイル]... ホスト:ポート ...');
  process.exit(64);
}

// 結果を1行表示して、終了ステータスを大きい方にする
function report(level, target, message) {
  console.log(`${level.padEnd(5)} ${target.padEnd(16)} ${message}`);
  process.exitCode = Math.max(process.exitCode ?? 0, LEVELS[level]);
}

for (const target of targets) {
  const [host, portText] = target.split(':');
  const options = {
    host,
    port: Number(portText ?? 443),
    servername: host,
    rejectUnauthorized: false, // 自分で socket.authorized を見て判定する
  };
  // ca を指定すると、組み込みの認証局の一覧の「代わり」になってしまうので、組み込みの一覧に足して使う
  if (caList.length > 0) options.ca = tls.rootCertificates.concat(caList);

  // for の中で connect するので、全部のサーバに同時に接続しに行く
  const socket = tls.connect(options, () => {
    const cert = socket.getPeerCertificate();
    const expires = new Date(cert.valid_to);
    const daysLeft = Math.floor((expires.getTime() - Date.now()) / DAY_MS);
    const date = expires.toISOString().slice(0, 10);
    if (!socket.authorized) {
      report('NG', target, socket.authorizationError); // 信頼できない、名前が合わない、期限切れなど
    } else if (daysLeft < warnDays) {
      report('WARN', target, `残り ${daysLeft} 日（期限 ${date}）`);
    } else {
      report('OK', target, `残り ${daysLeft} 日（期限 ${date}）`);
    }
    socket.end();
  });

  socket.setTimeout(5000, () => {
    report('ERROR', target, '時間切れ');
    socket.destroy();
  });
  socket.on('error', (err) => {
    report('ERROR', target, `接続できません（${err.code}）`);
  });
}
