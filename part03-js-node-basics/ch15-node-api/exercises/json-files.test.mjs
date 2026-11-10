// 練習問題1 用: json-files.mjs のテスト
// 使い方: node --test json-files.test.mjs
//   模範解答を試す: MODULE=../solutions/json-files.mjs node --test json-files.test.mjs
// テスト用のファイルは OS の一時フォルダに作り、最後に消す。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './json-files.mjs');
const { readJson, writeJson, listMarkdown } = await import(pathToFileURL(modulePath).href);

let dir;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch15-json-files-'));
});
after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

test('readJson: JSON のファイルを読んで、値を返す', async () => {
  const file = path.join(dir, 'a.json');
  await fs.writeFile(file, '{"name":"alice","tags":["a","b"]}');
  assert.deepEqual(await readJson(file, null), { name: 'alice', tags: ['a', 'b'] });
});

test('readJson: ファイルが無ければ fallback を返す', async () => {
  assert.deepEqual(await readJson(path.join(dir, 'no-such.json'), { count: 0 }), { count: 0 });
});

test('readJson: JSON として読めなければ、SyntaxError を投げる', async () => {
  const file = path.join(dir, 'broken.json');
  await fs.writeFile(file, '{ これは JSON ではない');
  await assert.rejects(readJson(file, {}), { name: 'SyntaxError' });
});

test('readJson: フォルダを渡したら、EISDIR を投げる（fallback にしない）', async () => {
  await assert.rejects(readJson(dir, {}), { code: 'EISDIR' });
});

test('writeJson: 2文字の字下げと、最後の改行で書く', async () => {
  const file = path.join(dir, 'b.json');
  await writeJson(file, { name: 'bob', n: [1, 2] });
  assert.equal(await fs.readFile(file, 'utf8'), '{\n  "name": "bob",\n  "n": [\n    1,\n    2\n  ]\n}\n');
});

test('writeJson: フォルダが無ければ、途中のフォルダも作る', async () => {
  const file = path.join(dir, 'x', 'y', 'c.json');
  await writeJson(file, [1]);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), [1]);
});

test('writeJson と readJson で、書いたものが読める', async () => {
  const file = path.join(dir, 'round.json');
  const data = { memo: 'こんにちは', done: false, list: [{ id: 1 }] };
  await writeJson(file, data);
  assert.deepEqual(await readJson(file, null), data);
});

test('listMarkdown: .md のファイルだけを、名前の順に返す', async () => {
  const notes = path.join(dir, 'notes');
  await fs.mkdir(path.join(notes, 'old.md'), { recursive: true }); // .md で終わる「フォルダ」は入れない
  for (const name of ['b.md', 'a.md', 'c.txt', 'README.MD.bak']) {
    await fs.writeFile(path.join(notes, name), '');
  }
  assert.deepEqual(await listMarkdown(notes), ['a.md', 'b.md']);
});
