// 第60章 7.1節: アプリから見た「客」（req.ip・req.protocol・req.hostname）。trust proxy で変わる
// 動かし方（章のフォルダで）: node samples/whoami.ts          → trust proxy なし
//                             TRUST_PROXY=1 node samples/whoami.ts
// 別のターミナルで: curl http://127.0.0.1:9807/   または   プロキシ（samples/proxy.ts）を通して curl http://127.0.0.1:9808/
import express from 'express';

const app = express();
// TRUST_PROXY が数字なら「前に何段のプロキシがあるか」、無ければ信じない（Express の既定）
if (process.env.TRUST_PROXY !== undefined) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.get('/', (req, res) => {
  res.json({
    socket: req.socket.remoteAddress, // TCP でつながってきた相手（プロキシの後ろなら、プロキシ）
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    hostname: req.hostname,
    xff: req.get('x-forwarded-for') ?? null,
  });
});

app.listen(9807, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9807/ で待っています（trust proxy: ${String(app.get('trust proxy'))}）`);
});
