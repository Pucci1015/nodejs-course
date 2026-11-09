// 練習問題5のテスト。保存先は OS の一時フォルダ。最後に消す
// 使い方: node --test upload.test.mjs
//         MODULE=../solutions/upload.mjs node --test upload.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendJson } from '../../ch17-minimal-server/solutions/send.mjs';
import { readFormData } from '../samples/form-data.mjs';

const { detectImageType, saveImage } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './upload.mjs')).href);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ch20-upload-'));
const dir = path.join(tmp, 'uploads');
await fs.mkdir(dir);
test.after(() => fs.rm(tmp, { recursive: true, force: true }));

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const GIF = new TextEncoder().encode('GIF89a......');
const WEBP = Uint8Array.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 ')]);
const HTML = new TextEncoder().encode('<!doctype html><p>hello</p>');
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');

const statusOf = async (p) => {
  try {
    await p;
    return 'ok';
  } catch (err) {
    return err.status ?? `${err.name}: ${err.message}`;
  }
};

test('detectImageType: 先頭のバイトで調べる', () => {
  assert.deepEqual(detectImageType(PNG), { type: 'image/png', ext: '.png' });
  assert.deepEqual(detectImageType(JPEG), { type: 'image/jpeg', ext: '.jpg' });
  assert.deepEqual(detectImageType(GIF), { type: 'image/gif', ext: '.gif' });
  assert.deepEqual(detectImageType(WEBP), { type: 'image/webp', ext: '.webp' });
  assert.equal(detectImageType(HTML), null);
  assert.equal(detectImageType(SVG), null); // SVG は中に script を書けるので、画像として受け付けない
  assert.equal(detectImageType(new Uint8Array([0x89, 0x50])), null); // 短すぎる
  assert.equal(detectImageType(new Uint8Array(0)), null);
});

test('saveImage: 新しい名前で dir に保存し、中身の種類を返す', async () => {
  const r = await saveImage(new File([PNG], '写真.png', { type: 'image/png' }), dir);
  assert.match(r.id, /^[0-9a-f-]{36}$/);
  assert.equal(r.path, path.join(dir, `${r.id}.png`));
  assert.equal(r.type, 'image/png');
  assert.equal(r.size, PNG.length);
  assert.equal(r.originalName, '写真.png');
  assert.deepEqual(new Uint8Array(await fs.readFile(r.path)), PNG);
});

test('saveImage: 客の付けた名前は、保存するパスに使わない', async () => {
  // ../ で、保存先の1つ上（テスト用の一時フォルダの中。最後に消す）を指す名前
  const r = await saveImage(new File([PNG], '../evil.png', { type: 'image/png' }), dir);
  assert.equal(path.dirname(r.path), dir);
  assert.doesNotMatch(path.basename(r.path), /evil/);
  await assert.rejects(fs.access(path.join(tmp, 'evil.png')), '保存先の外に書かれました');
});

test('saveImage: 種類は中身で決める（客の言う type や拡張子は信じない）', async () => {
  assert.equal(await statusOf(saveImage(new File([HTML], 'cat.png', { type: 'image/png' }), dir)), 415);
  assert.equal(await statusOf(saveImage(new File([SVG], 'logo.svg', { type: 'image/svg+xml' }), dir)), 415);
  const r = await saveImage(new File([JPEG], 'photo.txt', { type: 'text/plain' }), dir);
  assert.equal(r.type, 'image/jpeg');
  assert.ok(r.path.endsWith('.jpg'));
});

test('saveImage: 空・大きすぎる・ファイルでない', async () => {
  assert.equal(await statusOf(saveImage(new File([], 'empty.png'), dir)), 400);
  const big = new Uint8Array(2000);
  big.set(PNG);
  assert.equal(await statusOf(saveImage(new File([big], 'big.png'), dir, { maxBytes: 1000 })), 413);
  assert.equal(await statusOf(saveImage('ただの文字', dir)), 400);
  assert.equal(await statusOf(saveImage(null, dir)), 400);
});

test('saveImage: 表示用の名前から制御文字を除き、100 文字までにする', async () => {
  const r = await saveImage(new File([GIF], `a\u0000b\nc${'あ'.repeat(200)}.gif`), dir);
  assert.equal(r.originalName.length, 100);
  assert.ok(r.originalName.startsWith('abc'));
});

test('サーバで: formData() の File をそのまま渡せる', async () => {
  const quiet = { info() {}, error() {} };
  const server = http.createServer(createApp(async (req, res) => {
    const fd = await readFormData(req, { limit: 100_000 });
    const saved = await saveImage(fd.get('image'), dir);
    sendJson(res, 201, { type: saved.type, name: saved.originalName });
  }, { logger: quiet }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const fd = new FormData();
    fd.append('image', new Blob([WEBP], { type: 'image/webp' }), 'ねこ.webp');
    const r = await fetch(url, { method: 'POST', body: fd, signal: AbortSignal.timeout(3000) });
    assert.equal(r.status, 201);
    assert.deepEqual(await r.json(), { type: 'image/webp', name: 'ねこ.webp' });
    const bad = new FormData();
    bad.append('image', 'ファイルではない');
    assert.equal((await fetch(url, { method: 'POST', body: bad, signal: AbortSignal.timeout(3000) })).status, 400);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
