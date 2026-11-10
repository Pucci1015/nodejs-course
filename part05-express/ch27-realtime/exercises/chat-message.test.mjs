// 練習問題3 用: chat-message.mjs のテスト
// 使い方: node --test chat-message.test.mjs
//   模範解答を試す: MODULE=../solutions/chat-message.mjs node --test chat-message.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { isAllowedOrigin, parseChatMessage } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './chat-message.mjs')).href);

const ALLOWED = ['http://127.0.0.1:9347', 'http://localhost:9347'];

test('isAllowedOrigin: 一覧にあるものと完全に同じなら true', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:9347', ALLOWED), true);
  assert.equal(isAllowedOrigin('http://localhost:9347', ALLOWED), true);
});

test('isAllowedOrigin: 似ているだけのもの、無いもの（undefined）は false', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:9347.other.localhost', ALLOWED), false);
  assert.equal(isAllowedOrigin('http://localhost:9348', ALLOWED), false);
  assert.equal(isAllowedOrigin('HTTP://LOCALHOST:9347', ALLOWED), false);
  assert.equal(isAllowedOrigin(undefined, ALLOWED), false);
});

test('parseChatMessage: 正しいものは、前後の空白を取った text を返す', () => {
  assert.deepEqual(parseChatMessage('{"type":"chat","text":"  こんにちは "}'), { ok: true, value: { type: 'chat', text: 'こんにちは' } });
});

test('parseChatMessage: ws から届く Buffer も読める', () => {
  const r = parseChatMessage(Buffer.from('{"type":"chat","text":"やあ"}'));
  assert.deepEqual(r, { ok: true, value: { type: 'chat', text: 'やあ' } });
});

test('parseChatMessage: JSON でないものは、投げずに ok: false', () => {
  for (const raw of ['{こわれた', '', 'undefined']) {
    const r = parseChatMessage(raw);
    assert.equal(r.ok, false, raw);
    assert.equal(typeof r.error, 'string');
  }
});

test('parseChatMessage: type・text の形が違うもの、text が空・501 文字以上は ok: false', () => {
  const bad = [
    'null',
    '123',
    '"chat"',
    '{"type":"join","text":"a"}',
    '{"text":"a"}',
    '{"type":"chat","text":42}',
    '{"type":"chat","text":"   "}',
    JSON.stringify({ type: 'chat', text: 'あ'.repeat(501) }),
  ];
  for (const raw of bad) assert.equal(parseChatMessage(raw).ok, false, raw);
  assert.equal(parseChatMessage(JSON.stringify({ type: 'chat', text: 'あ'.repeat(500) })).ok, true);
});
