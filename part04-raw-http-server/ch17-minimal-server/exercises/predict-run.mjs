// 練習問題1: predict-handlers.mjs のハンドラを1つずつ、別のプロセスのサーバ（127.0.0.1:9176）で動かし、
// 客として HTTP で開いた結果を表示する
// 使い方: node predict-run.mjs <番号|all>
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { handlers } from './predict-handlers.mjs';

const PORT = 9176;

if (process.argv[2] === '--serve') {
  // 子プロセス: サーバとして動く
  const { default: http } = await import('node:http');
  const n = process.argv[3];
  http.createServer((req, res) => handlers[n](req, res)).listen(PORT, '127.0.0.1', () => process.send('ready'));
} else {
  const which = process.argv[2];
  const nums = which === 'all' ? Object.keys(handlers) : [which];
  if (!nums.every((n) => Object.hasOwn(handlers, n))) {
    console.error(`使い方: node predict-run.mjs <${Object.keys(handlers).join('|')}|all>`);
    process.exit(2);
  }
  for (const n of nums) await run(n);
}

// HTTP のバイトをそのまま見たいので、fetch ではなく TCP で送って、届いたものを全部表示する
async function run(n) {
  const child = spawn(process.execPath, [import.meta.filename, '--serve', n], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
  await new Promise((resolve, reject) => {
    child.once('message', resolve);
    child.once('exit', () => reject(new Error('サーバが起動しませんでした')));
  });
  const method = n === '9' ? 'HEAD' : 'GET';
  const got = await new Promise((resolve) => {
    let data = '';
    const sock = net.connect(PORT, '127.0.0.1', () => sock.write(`${method} / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`));
    sock.setEncoding('utf8');
    sock.on('data', (d) => (data += d));
    sock.on('error', () => {});
    const timer = setTimeout(() => {
      sock.destroy();
      resolve({ data, note: '（2秒待っても終わらなかったので、こちらから切った）' });
    }, 2000);
    sock.on('close', () => {
      clearTimeout(timer);
      resolve({ data, note: '' });
    });
  });
  await sleep(100);
  const alive = child.exitCode === null;
  child.kill();
  console.log(`===== ${n}（${method}）`);
  console.log(got.data.replace(/^Date: .*\r\n/m, '').replaceAll('\r\n', '\n') || '（何も届かなかった）');
  if (got.note) console.log(got.note);
  console.log(alive ? '[サーバ] 動いている' : '[サーバ] プロセスが終わった');
  const firstErr = stderr.split('\n').find((l) => /Error|ERR_/.test(l));
  if (firstErr) console.log(`[サーバの stderr] ${firstErr.trim()}`);
  console.log();
}
