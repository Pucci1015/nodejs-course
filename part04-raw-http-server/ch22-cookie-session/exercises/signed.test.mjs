// 練習問題3のテスト
// 使い方: node --test signed.test.mjs
//         MODULE=../solutions/signed.mjs node --test signed.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { sign, unsign, signJson, unsignJson } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './signed.mjs')).href);

// テスト用の鍵（本物のアプリでは、環境変数などから読む）
const KEY1 = 'test-only-key-1-aaaaaaaaaaaaaaaaaaaaaaaa';
const KEY2 = 'test-only-key-2-bbbbbbbbbbbbbbbbbbbbbbbb';

test('sign: 「値.署名」の形。署名は HMAC-SHA256 の base64url', () => {
  const expected = crypto.createHmac('sha256', KEY1).update('user=1').digest('base64url');
  assert.equal(sign('user=1', KEY1), `user=1.${expected}`);
});

test('unsign: 同じ鍵なら値が戻る。違う鍵・中身が違う・署名が無いときは null', () => {
  const s = sign('user=1', KEY1);
  assert.equal(unsign(s, KEY1), 'user=1');
  assert.equal(unsign(s, KEY2), null);
  assert.equal(unsign(s.replace('user=1', 'user=2'), KEY1), null);
  assert.equal(unsign('user=1', KEY1), null);
  assert.equal(unsign('user=1.', KEY1), null);
  assert.equal(unsign(`${s}x`, KEY1), null, '署名の長さが違うとき（例外にしない）');
});

test('値の中に . があってもよい', () => {
  const s = sign('a.b.c', KEY1);
  assert.equal(unsign(s, KEY1), 'a.b.c');
});

test('鍵は 32 文字以上。短いと TypeError', () => {
  assert.throws(() => sign('x', 'short'), TypeError);
  assert.throws(() => unsign('x.y', 'short'), TypeError);
});

test('鍵の取り替え: 配列の最初の鍵で署名し、どの鍵で署名したものも確かめられる', () => {
  const old = sign('user=1', KEY1);
  assert.equal(unsign(old, [KEY2, KEY1]), 'user=1', '前の鍵で署名したもの');
  const now = sign('user=1', [KEY2, KEY1]);
  assert.equal(now, sign('user=1', KEY2), '新しい鍵（最初）で署名する');
  assert.equal(unsign(now, [KEY2, KEY1]), 'user=1');
  assert.equal(unsign(old, [KEY2]), null, '前の鍵を外したら、もう通らない');
});

test('signJson・unsignJson: オブジェクトを署名して戻す。日本語も', () => {
  const t = signJson({ id: 1, name: '花子', roles: ['admin'] }, KEY1);
  assert.deepEqual(unsignJson(t, KEY1), { id: 1, name: '花子', roles: ['admin'] });
  assert.match(t, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, '中身も base64url にして、Cookie に入れやすくする');
});

test('signJson・unsignJson: maxAgeMs より古いものは null', () => {
  let clock = 1_000_000;
  const now = () => clock;
  const t = signJson({ id: 1 }, KEY1, { now });
  clock += 59_000;
  assert.deepEqual(unsignJson(t, KEY1, { maxAgeMs: 60_000, now }), { id: 1 });
  clock += 2_000;
  assert.equal(unsignJson(t, KEY1, { maxAgeMs: 60_000, now }), null);
  assert.deepEqual(unsignJson(t, KEY1, { now }), { id: 1 }, 'maxAgeMs が無ければ、古さは見ない');
});

test('unsignJson: 署名が正しくないもの・ただの文字列は null（例外にしない）', () => {
  assert.equal(unsignJson('not-a-token', KEY1), null);
  assert.equal(unsignJson(sign('not-json', KEY1), KEY1), null, '署名は正しいが、中身が JSON でない');
});
