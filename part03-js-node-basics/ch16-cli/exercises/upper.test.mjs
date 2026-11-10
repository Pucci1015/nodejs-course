// 練習問題2 用: upper.mjs のテスト（CLI を子プロセスとして動かし、標準入力に文字を流す）
// 使い方: node --test upper.test.mjs
//   模範解答を試す: MODULE=../solutions/upper.mjs node --test upper.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CLI = path.resolve(import.meta.dirname, process.env.MODULE ?? './upper.mjs');

// chunks: 標準入力に流す Buffer の配列（1つずつ、少し間を空けて書く）
function run(args, chunks) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], { env: { PATH: process.env.PATH } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (s) => (stdout += s));
    child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    (async () => {
      for (const c of chunks) {
        child.stdin.write(c);
        await new Promise((r) => setTimeout(r, 20));
      }
      child.stdin.end();
    })();
  });
}

test('英字を大文字にして、1行ずつ出す', async () => {
  const r = await run([], [Buffer.from('hello\nNode.js\n')]);
  assert.deepEqual(r, { code: 0, stdout: 'HELLO\nNODE.JS\n', stderr: '' });
});

test('最後の行に改行が無くても、その行も出す', async () => {
  const r = await run([], [Buffer.from('a\nb')]);
  assert.equal(r.stdout, 'A\nB\n');
});

test('--number（-n）で、行の番号を付ける', async () => {
  assert.equal((await run(['--number'], [Buffer.from('x\ny\n')])).stdout, '1: X\n2: Y\n');
  assert.equal((await run(['-n'], [Buffer.from('z\n')])).stdout, '1: Z\n');
});

test('入力が空なら、何も出さずに終了コード 0', async () => {
  assert.deepEqual(await run([], []), { code: 0, stdout: '', stderr: '' });
});

test('日本語が、チャンクの境目で切れて届いても化けない', async () => {
  const bytes = Buffer.from('あいうabc\n');
  // 「あ」の3バイトの途中で切って、2回に分けて流す
  const r = await run([], [bytes.subarray(0, 1), bytes.subarray(1)]);
  assert.equal(r.stdout, 'あいうABC\n');
});

test('知らないオプションなら、標準エラー出力に書いて、終了コード 2', async () => {
  const r = await run(['--loud'], [Buffer.from('a\n')]);
  assert.equal(r.code, 2);
  assert.equal(r.stdout, '');
  assert.notEqual(r.stderr, '');
});
