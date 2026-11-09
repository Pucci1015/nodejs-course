// 練習問題6 用: dir-size.mjs のテスト
// 使い方: node --test dir-size.test.mjs
//   模範解答を試す: MODULE=../solutions/dir-size.mjs node --test dir-size.test.mjs
// テスト用のフォルダは、OS の一時フォルダの中に作って、最後に消します。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './dir-size.mjs');
const { dirSize, formatBytes } = await import(pathToFileURL(modulePath).href);

let root;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ch15-dirsize-test-'));
  // root/
  //   a.txt (100)   b.bin (2000)
  //   sub/ c.txt (300)   sub/deep/d.txt (4000)
  //   sub/loop → ..（自分の親を指すリンク。たどると終わらない）
  //   link-to-b → b.bin（同じファイルを2回数えない）
  //   empty/
  await fs.mkdir(path.join(root, 'sub', 'deep'), { recursive: true });
  await fs.mkdir(path.join(root, 'empty'));
  await fs.writeFile(path.join(root, 'a.txt'), 'a'.repeat(100));
  await fs.writeFile(path.join(root, 'b.bin'), Buffer.alloc(2000));
  await fs.writeFile(path.join(root, 'sub', 'c.txt'), 'c'.repeat(300));
  await fs.writeFile(path.join(root, 'sub', 'deep', 'd.txt'), 'd'.repeat(4000));
  await fs.symlink('..', path.join(root, 'sub', 'loop'));
  await fs.symlink(path.join(root, 'b.bin'), path.join(root, 'link-to-b'));
});
after(async () => {
  await fs.chmod(path.join(root, 'locked'), 0o755).catch(() => {});
  await fs.rm(root, { recursive: true, force: true });
});

test('ファイルの大きさを合計し、ファイル・フォルダ・リンクの数を数える', async () => {
  const r = await dirSize(root);
  assert.deepEqual(
    { bytes: r.bytes, files: r.files, dirs: r.dirs, symlinks: r.symlinks, errors: r.errors },
    { bytes: 6400, files: 4, dirs: 4, symlinks: 2, errors: [] },
    'dirs は root 自身を含む（root・sub・sub/deep・empty）',
  );
});

test('シンボリックリンクはたどらない（輪になったリンクでも終わる）', async () => {
  const r = await dirSize(path.join(root, 'sub'));
  assert.equal(r.bytes, 4300);
  assert.equal(r.symlinks, 1);
});

test('同時に開く数を concurrency までに抑える', async () => {
  const original = { readdir: fs.readdir, lstat: fs.lstat, stat: fs.stat };
  let running = 0;
  let max = 0;
  const wrap = (fn) => async (...args) => {
    running++;
    max = Math.max(max, running);
    try {
      await new Promise((r) => setTimeout(r, 2));
      return await fn(...args);
    } finally {
      running--;
    }
  };
  fs.readdir = wrap(original.readdir);
  fs.lstat = wrap(original.lstat);
  fs.stat = wrap(original.stat);
  try {
    const many = path.join(root, 'many');
    await original.readdir(root); // 準備（ラップしていない関数で作る）
    await fs.mkdir(many);
    for (let i = 0; i < 40; i++) await fs.writeFile(path.join(many, `f${i}.txt`), 'x');
    max = 0;
    const r = await dirSize(many, { concurrency: 3 });
    assert.equal(r.files, 40);
    assert.ok(max <= 3, `同時に ${max} 個開いた`);
    assert.ok(max >= 2, '1つずつではなく、並行に処理する');
  } finally {
    Object.assign(fs, original);
    await fs.rm(path.join(root, 'many'), { recursive: true, force: true });
  }
});

test('読めないフォルダがあっても止まらず、errors に記録する', { skip: process.getuid?.() === 0 && 'root ユーザーは権限を無視して読めるので試せない' }, async () => {
  const locked = path.join(root, 'locked');
  await fs.mkdir(locked);
  await fs.writeFile(path.join(locked, 'secret.txt'), 'x'.repeat(10));
  await fs.chmod(locked, 0o000);
  try {
    const r = await dirSize(root);
    assert.equal(r.bytes, 6400);
    assert.deepEqual(r.errors, [{ path: locked, code: 'EACCES' }]);
  } finally {
    await fs.chmod(locked, 0o755);
    await fs.rm(locked, { recursive: true });
  }
});

test('root が無ければ ENOENT、フォルダでなければ ENOTDIR で rejected', async () => {
  await assert.rejects(dirSize(path.join(root, 'none')), { code: 'ENOENT' });
  await assert.rejects(dirSize(path.join(root, 'a.txt')), { code: 'ENOTDIR' });
});

test('formatBytes: 1024 で割って、単位を付ける', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1023), '1023 B');
  assert.equal(formatBytes(1536), '1.5 KiB');
  assert.equal(formatBytes(5 * 1024 ** 2), '5.0 MiB');
  assert.equal(formatBytes(3.25 * 1024 ** 3), '3.3 GiB');
});
