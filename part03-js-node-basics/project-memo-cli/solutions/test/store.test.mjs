// MemoStore のテスト。メモのフォルダは一時フォルダに作る
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MemoStore, idFromDate } from '../src/store.mjs';

let dir;
let clock;
const store = () => new MemoStore(dir, { now: () => new Date(clock) });
beforeEach(async () => {
  dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'memo-store-')), 'memos');
  clock = new Date(2026, 10, 4, 15, 30, 12).getTime(); // ローカル時刻の 2026-11-04 15:30:12
});
afterEach(async () => fs.rm(path.dirname(dir), { recursive: true, force: true }));

test('id はローカル時刻の YYYYMMDD-HHmmss', () => {
  assert.equal(idFromDate(new Date(2026, 0, 2, 3, 4, 5)), '20260102-030405');
});

test('作るとファイルができる。フォルダが無ければ作る', async () => {
  const memo = await store().create({ title: '牛乳', tags: ['買い物', '買い物'], body: '本文' });
  assert.equal(memo.id, '20261104-153012');
  assert.deepEqual(memo.meta.tags, ['買い物']); // 重ならない
  assert.match(await fs.readFile(path.join(dir, '20261104-153012.md'), 'utf8'), /^---\ntitle: "牛乳"/);
});

test('同じ秒に作ると -2、-3 が付く。同時に作っても、ぶつからない', async () => {
  const s = store();
  const memos = await Promise.all(Array.from({ length: 5 }, (_, i) => s.create({ title: `m${i}` })));
  assert.deepEqual(memos.map((m) => m.id).sort(), ['20261104-153012', '20261104-153012-2', '20261104-153012-3', '20261104-153012-4', '20261104-153012-5']);
  assert.equal((await fs.readdir(dir)).length, 5); // 一時ファイルが残っていない
});

test('一覧は、新しく更新した順。読めないメモは飛ばして warnings に入れる', async () => {
  const s = store();
  await s.create({ title: '古い' });
  clock += 60_000;
  await s.create({ title: '新しい' });
  await fs.writeFile(path.join(dir, 'broken.md'), '---\ntitle: 閉じていない\n');
  await fs.writeFile(path.join(dir, 'notes.txt'), 'md ではない');
  await fs.writeFile(path.join(dir, '.hidden.md'), '隠しファイル');
  const list = await s.list();
  assert.deepEqual(list.map((m) => m.meta.title), ['新しい', '古い']);
  assert.match(s.warnings.join('\n'), /broken\.md/);
});

test('front matter の無いファイルは、ファイル名をタイトル、更新日時をファイルの時刻にする', async () => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, '買い物リスト.md'), '- 牛乳\n');
  const [memo] = await store().list();
  assert.equal(memo.id, '買い物リスト');
  assert.equal(memo.meta.title, '買い物リスト');
  assert.ok(memo.meta.updated);
});

test('resolve: 区別できれば最初の何文字かでよい。区別できなければエラー', async () => {
  const s = store();
  await s.create({ title: 'a' });
  clock += 3600_000;
  await s.create({ title: 'b' }); // 20261104-163012
  assert.equal(await s.resolve('20261104-1630'), '20261104-163012');
  await assert.rejects(s.resolve('20261104'), { message: /2 件/, exitCode: 1 });
  await assert.rejects(s.resolve('2025'), { message: /見つかりません/ });
  await assert.rejects(s.resolve(''), { message: /見つかりません/ });
});

test('resolve: パスとしては使わない。../ でフォルダの外のファイルを指せない', async () => {
  const s = store();
  await s.create({ title: 'a' });
  await fs.writeFile(path.join(path.dirname(dir), 'secret.md'), '外のファイル');
  await assert.rejects(s.resolve('../secret'), { message: /見つかりません/ });
});

test('resolve: Mac の NFD のファイル名も、NFC で打った id で見つかる', async () => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'ガイド.md'.normalize('NFD')), 'x');
  const id = await store().resolve('ガイド'.normalize('NFC'));
  assert.equal(id.normalize('NFC'), 'ガイド');
});

test('update: updated だけ進み、created と知らない行は残る', async () => {
  const s = store();
  const memo = await s.create({ title: 'a', body: '本文' });
  const file = path.join(dir, `${memo.id}.md`);
  await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('---\n\n', 'aliases: [x]\n---\n\n'));
  clock += 5000;
  const next = await s.update(memo.id, (m) => ({ meta: { ...m.meta, tags: ['t'] } }));
  assert.equal(next.meta.created, memo.meta.created);
  assert.notEqual(next.meta.updated, memo.meta.updated);
  assert.deepEqual(next.meta.tags, ['t']);
  assert.equal(next.body, '本文\n');
  assert.deepEqual(next.extra, ['aliases: [x]']);
});

test('remove: .trash に移す。同じ名前がもうあれば、名前を変える', async () => {
  const s = store();
  const a = await s.create({ title: 'a' });
  const dest1 = await s.remove(a.id);
  assert.equal(dest1, path.join(dir, '.trash', `${a.id}.md`));
  const b = await s.create({ title: 'b' }); // 同じ id
  clock += 1000;
  const dest2 = await s.remove(b.id);
  assert.notEqual(dest2, dest1);
  assert.deepEqual((await fs.readdir(path.join(dir, '.trash'))).length, 2);
  assert.deepEqual(await s.list(), []);
});
