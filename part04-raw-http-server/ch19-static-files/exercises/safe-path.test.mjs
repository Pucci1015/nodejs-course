// 練習問題2のテスト。OS の一時フォルダに public と outside を作って確かめ、最後に消す
// 使い方: node --test safe-path.test.mjs
//         MODULE=../solutions/safe-path.mjs node --test safe-path.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { safePath, resolveFile } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './safe-path.mjs')).href);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ch19-safe-'));
const root = path.join(tmp, 'public');
const outside = path.join(tmp, 'outside');
for (const [file, body] of [
  ['public/index.html', 'top'],
  ['public/docs/index.html', 'docs'],
  ['public/docs/a.txt', 'a'],
  ['public/.hidden', 'hidden'],
  ['public/sub/.git/config', 'git'],
  ['outside/secret.txt', '外のファイル'],
]) {
  await fs.mkdir(path.dirname(path.join(tmp, file)), { recursive: true });
  await fs.writeFile(path.join(tmp, file), body);
}
await fs.mkdir(path.join(root, 'empty'));
await fs.symlink(path.join(outside, 'secret.txt'), path.join(root, 'link-out.txt'));
await fs.symlink(path.join(root, 'docs', 'a.txt'), path.join(root, 'link-in.txt'));
test.after(() => fs.rm(tmp, { recursive: true, force: true }));

// 失敗したときの status を返す（失敗しなければ 'ok'）
function statusOf(fn) {
  try {
    fn();
    return 'ok';
  } catch (err) {
    return err.status ?? `${err.name}: ${err.message}`;
  }
}
async function statusOfAsync(fn) {
  try {
    await fn();
    return 'ok';
  } catch (err) {
    return err.status ?? `${err.name}: ${err.message}`;
  }
}

test('safePath: 中のファイルは、root の中の絶対パスになる', () => {
  assert.equal(safePath(root, '/index.html'), path.join(root, 'index.html'));
  assert.equal(safePath(root, '/docs/a.txt'), path.join(root, 'docs', 'a.txt'));
  assert.equal(safePath(root, '/%E6%97%A5%E6%9C%AC.txt'), path.join(root, '日本.txt'));
  assert.equal(path.relative(root, safePath(root, '/')), ''); // root そのもの
});

test('safePath: %xx を戻した後に外を指すものは 403', () => {
  for (const p of ['/..%2Foutside%2Fsecret.txt', '/docs/..%2F..%2F..%2Fetc%2Fpasswd', '/%2e%2e%2foutside', '/..%2F']) {
    assert.equal(statusOf(() => safePath(root, p)), 403, p);
  }
});

test('safePath: . で始まる名前は 404（あることも知らせない）', () => {
  for (const p of ['/.hidden', '/sub/.git/config', '/.env', '/docs/%2Egit']) {
    assert.equal(statusOf(() => safePath(root, p)), 404, p);
  }
});

test('safePath: 使えない文字や壊れた %xx は 400', () => {
  for (const p of ['/a%00.html', '/a%5Cb', '/%E0%A4%A', 'index.html']) {
    assert.equal(statusOf(() => safePath(root, p)), 400, p);
  }
});

test('safePath: 途中の空のセグメント（//）は 404', () => {
  assert.equal(statusOf(() => safePath(root, '/docs//a.txt')), 404);
  assert.equal(statusOf(() => safePath(root, '//evil.example/')), 404);
});

test('safePath: %xx を戻すのは1回だけ（%2541 は %41 という名前で、A ではない）', () => {
  assert.equal(safePath(root, '/%2541.txt'), path.join(root, '%41.txt'));
});

test('resolveFile: ファイルは、たどった先の本当のパスを返す', async () => {
  assert.deepEqual(await resolveFile(root, '/index.html'), { path: await fs.realpath(path.join(root, 'index.html')) });
  assert.deepEqual(await resolveFile(root, '/link-in.txt'), { path: await fs.realpath(path.join(root, 'docs', 'a.txt')) });
});

test('resolveFile: フォルダは、/ が無ければ redirect、あれば index.html', async () => {
  assert.deepEqual(await resolveFile(root, '/docs'), { redirect: '/docs/' });
  assert.deepEqual(await resolveFile(root, '/docs/'), { path: await fs.realpath(path.join(root, 'docs', 'index.html')) });
  assert.deepEqual(await resolveFile(root, '/'), { path: await fs.realpath(path.join(root, 'index.html')) });
});

test('resolveFile: 無いもの、index.html の無いフォルダ、ファイルの下は 404', async () => {
  for (const p of ['/nothing.txt', '/empty/', '/index.html/x', `/${'a'.repeat(300)}`]) {
    assert.equal(await statusOfAsync(() => resolveFile(root, p)), 404, p);
  }
});

test('resolveFile: 外を指すシンボリックリンクは 403', async () => {
  assert.equal(await statusOfAsync(() => resolveFile(root, '/link-out.txt')), 403);
});

test('resolveFile: safePath の失敗はそのまま', async () => {
  assert.equal(await statusOfAsync(() => resolveFile(root, '/..%2Foutside%2Fsecret.txt')), 403);
  assert.equal(await statusOfAsync(() => resolveFile(root, '/.hidden')), 404);
});

test('resolveFile: index の名前を変えられる', async () => {
  await fs.writeFile(path.join(root, 'docs', 'README.txt'), 'readme');
  assert.deepEqual(await resolveFile(root, '/docs/', { index: 'README.txt' }), { path: await fs.realpath(path.join(root, 'docs', 'README.txt')) });
});
