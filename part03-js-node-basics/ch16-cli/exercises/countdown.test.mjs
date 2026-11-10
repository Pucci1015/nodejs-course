// 練習問題3 用: countdown.mjs のテスト（CLI を子プロセスとして動かし、途中で SIGINT を送る）
// 使い方: node --test countdown.test.mjs
//   模範解答を試す: MODULE=../solutions/countdown.mjs node --test countdown.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CLI = path.resolve(import.meta.dirname, process.env.MODULE ?? './countdown.mjs');

// stopAfterMs が数なら、その時間の後に SIGINT を送る
function run(args, { stopAfterMs } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], { env: { PATH: process.env.PATH, TICK_MS: '100' } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (s) => (stdout += s));
    child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
    child.on('error', reject);
    const killer = setTimeout(() => child.kill('SIGKILL'), 5000); // 終わらないときの保険
    if (stopAfterMs !== undefined) setTimeout(() => child.kill('SIGINT'), stopAfterMs);
    child.on('close', (code, signal) => {
      clearTimeout(killer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

test('秒数から 1 まで数えて、最後に 発射！ と出す', async () => {
  const r = await run(['3']);
  assert.deepEqual(r, { code: 0, signal: null, stdout: '3\n2\n1\n発射！\n', stderr: '' });
});

test('秒数を書かなければ 5 から', async () => {
  const r = await run([]);
  assert.equal(r.stdout, '5\n4\n3\n2\n1\n発射！\n');
});

test('秒数が 1 以上の整数でなければ、標準エラー出力に書いて、終了コード 2', async () => {
  for (const bad of ['0', 'abc', '-3']) {
    const r = await run([bad]);
    assert.equal(r.code, 2, `${bad} の終了コード`);
    assert.equal(r.stdout, '');
    assert.notEqual(r.stderr, '');
  }
});

test('途中で Ctrl+C（SIGINT）を受けたら、中止しました を標準エラー出力に出し、終了コード 130', async () => {
  const r = await run(['10'], { stopAfterMs: 450 });
  assert.equal(r.code, 130, `終了コードが ${r.code}（シグナル ${r.signal}）でした`);
  assert.match(r.stderr, /中止しました/);
  assert.doesNotMatch(r.stdout, /発射/);
  assert.ok(r.stdout.startsWith('10\n9\n'), `表示: ${JSON.stringify(r.stdout)}`);
});
