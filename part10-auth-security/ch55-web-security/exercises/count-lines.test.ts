// 練習問題3 のテスト。一時フォルダに、いろいろな名前のファイルを作って数える
// 使い方: node --test count-lines.test.ts
//   模範解答を試す: MODULE=../solutions/count-lines.ts node --test count-lines.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './count-lines.ts');
const { countLines }: typeof import('./count-lines.ts') = await import(pathToFileURL(file).href);

let root = '';
let dir = '';
before(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'count-lines-'));
  dir = path.join(root, 'uploads');
  await mkdir(dir);
  await writeFile(path.join(dir, 'memo.txt'), 'a\nb\n');
  await writeFile(path.join(dir, "Let's go.txt"), 'a\nb\nc\n');
  await writeFile(path.join(dir, 'say "hi".txt'), 'a\n');
  await writeFile(path.join(dir, '$HOME.txt'), 'a\nb\nc\nd\n');
  await writeFile(path.join(dir, '-l.txt'), 'a\nb\nc\nd\ne\n');
  await writeFile(path.join(root, 'secret.txt'), 'uploads の外のファイル\n');
  await writeFile(path.join(dir, '.hidden'), 'a\n');
});
after(() => rm(root, { recursive: true }));

test('ふつうの名前', async () => {
  assert.equal(await countLines(dir, 'memo.txt'), 2);
});

test("' や \" を含む名前", async () => {
  assert.equal(await countLines(dir, "Let's go.txt"), 3);
  assert.equal(await countLines(dir, 'say "hi".txt'), 1);
});

test('$ を含む名前（シェルの変数として広げない）', async () => {
  assert.equal(await countLines(dir, '$HOME.txt'), 4);
});

test('- で始まる名前（オプションとして読ませない）', async () => {
  assert.equal(await countLines(dir, '-l.txt'), 5);
});

test('dir の外を指す名前・隠しファイル・空の名前は、例外にする（数えない）', async () => {
  for (const bad of ['../secret.txt', 'sub/../../secret.txt', '.hidden', '']) {
    await assert.rejects(countLines(dir, bad), Error, bad);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
