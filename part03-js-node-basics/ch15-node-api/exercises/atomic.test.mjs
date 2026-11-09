// 練習問題2 用: atomic.mjs のテスト
// 使い方: node --test atomic.test.mjs
//   模範解答を試す: MODULE=../solutions/atomic.mjs node --test atomic.test.mjs
// テスト用のファイルは、OS の一時フォルダの中に作って、最後に消します。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './atomic.mjs');
const { writeFileAtomic, updateJson } = await import(pathToFileURL(modulePath).href);

let dir;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch15-atomic-test-'));
});
after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});
const leftovers = async () => (await fs.readdir(dir)).filter((n) => n.includes('.tmp'));

test('writeFileAtomic: 書いた内容になり、一時ファイルは残らない', async () => {
  const file = path.join(dir, 'a.txt');
  await writeFileAtomic(file, 'はじめの内容\n');
  await writeFileAtomic(file, Buffer.from('上書きした内容\n'));
  assert.equal(await fs.readFile(file, 'utf8'), '上書きした内容\n');
  assert.deepEqual(await leftovers(), []);
});

test('writeFileAtomic: 一時ファイルは、同じフォルダに作る（rename が一瞬で終わるように）', async () => {
  const sub = path.join(dir, 'sub');
  await fs.mkdir(sub);
  const seen = [];
  const original = fs.rename;
  fs.rename = async (from, to) => {
    seen.push([path.dirname(from), path.dirname(to)]);
    return original(from, to);
  };
  try {
    await writeFileAtomic(path.join(sub, 'b.txt'), 'x');
  } finally {
    fs.rename = original;
  }
  assert.equal(seen.length, 1, 'fs.rename（node:fs/promises）を1回使う');
  assert.equal(seen[0][0], seen[0][1], '一時ファイルと書き込み先が同じフォルダ');
});

test('writeFileAtomic: 書き込みに失敗したら、元のファイルはそのままで、一時ファイルも残らない', async () => {
  const file = path.join(dir, 'c.txt');
  await fs.writeFile(file, '元の内容');
  await assert.rejects(writeFileAtomic(file, 12345)); // 数値は書けない（TypeError）
  assert.equal(await fs.readFile(file, 'utf8'), '元の内容');
  assert.deepEqual(await leftovers(), []);
});

test('writeFileAtomic: フォルダが無ければ、ENOENT で rejected（フォルダは作らない）', async () => {
  await assert.rejects(writeFileAtomic(path.join(dir, 'no-such-dir', 'd.txt'), 'x'), { code: 'ENOENT' });
});

test('writeFileAtomic: 同時に書いても、どれか1つの内容になり、混ざらない', async () => {
  const file = path.join(dir, 'e.txt');
  const contents = Array.from({ length: 20 }, (_, i) => `${String(i).repeat(50_000)}\n`);
  await Promise.all(contents.map((c) => writeFileAtomic(file, c)));
  assert.ok(contents.includes(await fs.readFile(file, 'utf8')), '書いた内容のどれかと完全に同じ');
  assert.deepEqual(await leftovers(), []);
});

test('updateJson: ファイルが無ければ defaultValue から始め、新しい値を返す', async () => {
  const file = path.join(dir, 'f.json');
  const result = await updateJson(file, (v) => ({ ...v, count: (v.count ?? 0) + 1 }));
  assert.deepEqual(result, { count: 1 });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { count: 1 });
  const list = await updateJson(path.join(dir, 'g.json'), (v) => [...v, 'a'], { defaultValue: [] });
  assert.deepEqual(list, ['a']);
});

test('updateJson: 同時に50回呼んでも、更新を取りこぼさない', async () => {
  const file = path.join(dir, 'h.json');
  const increment = async (v) => {
    await new Promise((r) => setTimeout(r, Math.random() * 3)); // 更新の途中で、他の処理が割り込めるようにする
    return { count: (v.count ?? 0) + 1 };
  };
  await Promise.all(Array.from({ length: 50 }, () => updateJson(file, increment)));
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { count: 50 });
});

test('updateJson: updater が失敗したら rejected になり、ファイルは変えない。次の更新はできる', async () => {
  const file = path.join(dir, 'i.json');
  await fs.writeFile(file, '{"count":1}');
  const failing = updateJson(file, () => {
    throw new Error('更新に失敗');
  });
  const next = updateJson(file, (v) => ({ count: v.count + 1 }));
  await assert.rejects(failing, { message: '更新に失敗' });
  assert.deepEqual(await next, { count: 2 });
});

test('updateJson: 壊れた JSON は、黙って上書きせずに rejected', async () => {
  const file = path.join(dir, 'j.json');
  await fs.writeFile(file, '{"count": 1,');
  await assert.rejects(updateJson(file, () => ({ count: 0 })), SyntaxError);
  assert.equal(await fs.readFile(file, 'utf8'), '{"count": 1,');
});
