// 練習問題7 用: signed-value.mjs のテスト
// 使い方（~/dev/ch08/exercises で）: node --test signed-value.test.mjs
//   模範解答を試す: MODULE=../solutions/signed-value.mjs node --test signed-value.test.mjs
//
// sign(value, secret, { maxAgeSec, now })  → 署名付きの文字列（Cookie の値にそのまま使える文字だけ）
// verify(signed, secret, { now })          → 元の value（文字列）。偽物・期限切れ・形式がおかしいときは null
//   now は「今の時刻（ミリ秒）」。テストのために指定できるようにする。省略したら Date.now()
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './signed-value.mjs');
const { sign, verify } = await import(pathToFileURL(modulePath).href);

const SECRET = 'test-secret-0123456789abcdef';
const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);

test('署名して、そのまま確かめると元の値に戻る', () => {
  const signed = sign('user:42', SECRET, { now: NOW });
  assert.equal(verify(signed, SECRET, { now: NOW }), 'user:42');
});

test('日本語や記号を含む値でもよい', () => {
  const value = 'こんにちは; =,"\\';
  assert.equal(verify(sign(value, SECRET, { now: NOW }), SECRET, { now: NOW }), value);
});

test('署名付きの文字列は Cookie の値にそのまま使える文字だけでできている', () => {
  const signed = sign('こんにちは; 世界', SECRET, { now: NOW });
  assert.match(signed, /^[A-Za-z0-9_.-]+$/);
});

test('値の部分を書き換えると null', () => {
  const signed = sign('user:42', SECRET, { now: NOW });
  const forged = sign('user:1', 'attacker-does-not-know', { now: NOW });
  // 攻撃者の値の部分と、本物の署名の部分を組み合わせる
  const [forgedValue] = forged.split('.');
  const [, realMac] = signed.split('.');
  assert.equal(verify(`${forgedValue}.${realMac}`, SECRET, { now: NOW }), null);
});

test('署名の部分を1文字変えると null', () => {
  const signed = sign('user:42', SECRET, { now: NOW });
  const last = signed.at(-1) === 'A' ? 'B' : 'A';
  assert.equal(verify(signed.slice(0, -1) + last, SECRET, { now: NOW }), null);
});

test('違う秘密の鍵で確かめると null', () => {
  assert.equal(verify(sign('user:42', SECRET, { now: NOW }), 'another-secret', { now: NOW }), null);
});

test('形式がおかしいものは null（例外にしない）', () => {
  for (const bad of ['', 'abc', 'a.b.c.d', '....', '%%%.###', undefined, null, 42]) {
    assert.equal(verify(bad, SECRET, { now: NOW }), null, `入力 ${JSON.stringify(bad)}`);
  }
});

test('maxAgeSec を過ぎると null、過ぎる前なら元の値', () => {
  const signed = sign('user:42', SECRET, { maxAgeSec: 60, now: NOW });
  assert.equal(verify(signed, SECRET, { now: NOW + 59_000 }), 'user:42');
  assert.equal(verify(signed, SECRET, { now: NOW + 61_000 }), null);
});

test('maxAgeSec を指定しなければ期限は無い', () => {
  const signed = sign('user:42', SECRET, { now: NOW });
  assert.equal(verify(signed, SECRET, { now: NOW + 10 * 365 * 86_400_000 }), 'user:42');
});

test('期限の情報も署名で守られている（期限だけを延ばす書き換えは null）', () => {
  const short = sign('user:42', SECRET, { maxAgeSec: 60, now: NOW });
  const long = sign('user:42', 'attacker-does-not-know', { maxAgeSec: 999999, now: NOW });
  const [longValue] = long.split('.');
  const [, shortMac] = short.split('.');
  assert.equal(verify(`${longValue}.${shortMac}`, SECRET, { now: NOW + 120_000 }), null);
});

test('秘密の鍵が短すぎる（16文字未満）と sign はエラー', () => {
  assert.throws(() => sign('user:42', 'short', { now: NOW }), Error);
});

test('同じ入力からは同じ署名付きの文字列になる（ランダムな要素を入れていない）', () => {
  assert.equal(sign('a', SECRET, { now: NOW }), sign('a', SECRET, { now: NOW }));
});
