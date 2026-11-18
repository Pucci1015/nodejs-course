// 練習問題6 のテスト: コマンドを子プロセスとして動かし、出力と終了コードを確かめる
// 使い方: node --test wait-for-version.test.ts
//   模範解答を試す: MODULE=../solutions/wait-for-version.ts node --test wait-for-version.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './wait-for-version.ts');

// 応答を、頼まれた順に replies から1つずつ返す偽のアプリ（最後のものを繰り返す）
// 'down' は接続をすぐ切る、数字はその状態の空の応答、文字列はその版
function fakeApp(replies: (string | number)[]) {
  let i = 0;
  const server = http.createServer((_req, res) => {
    const r = replies[Math.min(i, replies.length - 1)]!;
    i += 1;
    if (r === 'down') {
      res.socket?.destroy();
    } else if (typeof r === 'number') {
      res.writeHead(r).end();
    } else {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ version: r }));
    }
  });
  server.listen(0, '127.0.0.1');
  return server;
}
const servers: http.Server[] = [];
after(() => {
  for (const s of servers) s.close();
});

async function urlOf(replies: (string | number)[]) {
  const s = fakeApp(replies);
  servers.push(s);
  await new Promise((r) => s.once('listening', r));
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}/version`;
}

function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, [file, ...args], { timeout: 10_000 }, (err, stdout, stderr) => {
      const code = err === null ? 0 : typeof err.code === 'number' ? err.code : -1;
      resolve({ code, stdout, stderr });
    });
  });
}

test('すぐに新しい版なら、1 回目で終了コード 0', async () => {
  const url = await urlOf(['abc123']);
  const r = await run([url, 'abc123', '--interval', '0.05']);
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '新しい版 abc123 が動いています（1 回目）\n');
});

test('古い版・失敗の応答・つながらない を待って、4 回目で来る', async () => {
  const url = await urlOf(['old999', 502, 'down', 'abc123']);
  const r = await run([url, 'abc123', '--interval', '0.05']);
  assert.equal(r.code, 0);
  assert.equal(
    r.stdout,
    [
      '待っています: 今の版は old999（1 回目）',
      '待っています: 応答 502（2 回目）',
      '待っています: つながりません（3 回目）',
      '新しい版 abc123 が動いています（4 回目）',
      '',
    ].join('\n'),
  );
});

test('時間切れなら終了コード 1', async () => {
  const url = await urlOf(['old999']);
  const started = Date.now();
  const r = await run([url, 'abc123', '--interval', '0.1', '--timeout', '0.5']);
  const took = Date.now() - started;
  assert.equal(r.code, 1);
  assert.match(r.stdout, /^待っています: 今の版は old999（1 回目）\n/);
  assert.match(r.stderr, /^時間切れ: 0\.5 秒たっても版 abc123 になりません\n$/);
  assert.ok(took < 3000, `時間がかかりすぎです: ${took}ms`);
});

test('404 も「待つ」（まだ /version の無い古い版）', async () => {
  const url = await urlOf([404, 'abc123']);
  const r = await run([url, 'abc123', '--interval', '0.05']);
  assert.equal(r.code, 0);
  assert.equal(r.stdout.split('\n')[0], '待っています: 応答 404（1 回目）');
});

test('使い方の間違いは、標準エラー出力に書いて終了コード 2', async () => {
  for (const args of [[], ['http://127.0.0.1:1/version'], ['http://x/', 'v1', '--timeout', 'abc'], ['http://x/', 'v1', '--nope']]) {
    const r = await run(args);
    assert.equal(r.code, 2, args.join(' '));
    assert.equal(r.stdout, '', args.join(' '));
    assert.match(r.stderr, /使い方: node wait-for-version\.ts <URL> <版> \[--timeout 秒\] \[--interval 秒\]/, args.join(' '));
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
