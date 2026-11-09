// CLI を「外から」テストする: 子プロセスとして起動し、stdout・stderr・終了コードを確かめる（第16章 10節）
// 使い方: node --test count.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CLI = path.join(import.meta.dirname, 'count.mjs');

// CLI を起動して、終わるまで待つ。input を渡すと標準入力に書く
function run(args, { input, cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      // 自分の環境変数（HOME や設定）に影響されないよう、必要なものだけ渡す
      env: { PATH: process.env.PATH, HOME: cwd ?? os.tmpdir(), NO_COLOR: '1', ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (s) => (stdout += s));
    child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
    child.stdin.end(input ?? ''); // 何も渡さないときも閉じる。閉じないと CLI が入力を待ち続ける
  });
}

// テストごとに空の作業フォルダを作り、終わったら消す
async function withTmp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch16-count-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('標準入力の行数を数える', async () => {
  const r = await run([], { input: 'あ\nい\nう\n' });
  assert.deepEqual(r, { code: 0, signal: null, stdout: '3\n', stderr: '' });
});

test('--chars で文字数も出す（バイト数ではない）', async () => {
  const r = await run(['--chars'], { input: '日本語\n' });
  assert.equal(r.stdout, '1\t4\n');
});

test('ファイルを数える。相対パスは cwd から', async () => {
  await withTmp(async (dir) => {
    await fs.writeFile(path.join(dir, 'a.txt'), '1\n2\n');
    const r = await run(['a.txt'], { cwd: dir });
    assert.equal(r.code, 0);
    assert.equal(r.stdout, '2\ta.txt\n');
  });
});

test('無いファイルは stderr に出して、終了コード 1。残りは続ける', async () => {
  await withTmp(async (dir) => {
    await fs.writeFile(path.join(dir, 'a.txt'), 'x\n');
    const r = await run(['nai.txt', 'a.txt'], { cwd: dir });
    assert.equal(r.code, 1);
    assert.equal(r.stdout, '1\ta.txt\n'); // stdout には結果だけ
    assert.match(r.stderr, /nai\.txt: ファイルがありません/);
  });
});

test('知らないオプションは終了コード 2 と使い方', async () => {
  const r = await run(['--nope']);
  assert.equal(r.code, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /使い方/);
});

test('--help は stdout に出して、終了コード 0', async () => {
  const r = await run(['--help']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /^使い方/);
});
