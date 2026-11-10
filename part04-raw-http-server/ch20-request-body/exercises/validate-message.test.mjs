// 練習問題3 用: validate-message.mjs のテスト
// 使い方: node --test validate-message.test.mjs
//   模範解答を試す: MODULE=../solutions/validate-message.mjs node --test validate-message.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { validateMessage } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './validate-message.mjs')).href);

const NAME_ERR = 'name は 1〜20 文字で書いてください';
const TEXT_ERR = 'text は 1〜200 文字で書いてください';

test('正しければ ok: true と、前後の空白を取った name・text', () => {
  assert.deepEqual(validateMessage({ name: ' alice ', text: 'こんにちは' }), { ok: true, value: { name: 'alice', text: 'こんにちは' } });
});

test('決めたキー（name・text）だけを取り出す', () => {
  const r = validateMessage(JSON.parse('{"name":"bob","text":"hi","id":999,"isAdmin":true}'));
  assert.deepEqual(r, { ok: true, value: { name: 'bob', text: 'hi' } });
});

test('オブジェクトでなければ、その文だけを返す', () => {
  for (const bad of [null, [], 'alice', 123, true]) {
    assert.deepEqual(validateMessage(bad), { ok: false, errors: ['オブジェクトで送ってください'] }, JSON.stringify(bad));
  }
});

test('name と text の間違いは、両方まとめて返す', () => {
  assert.deepEqual(validateMessage({}), { ok: false, errors: [NAME_ERR, TEXT_ERR] });
  assert.deepEqual(validateMessage({ name: '   ', text: '' }), { ok: false, errors: [NAME_ERR, TEXT_ERR] });
});

test('文字列でないものは、無いのと同じ', () => {
  assert.deepEqual(validateMessage({ name: 123, text: ['a'] }), { ok: false, errors: [NAME_ERR, TEXT_ERR] });
});

test('長さの上限（name 20 文字、text 200 文字）', () => {
  assert.equal(validateMessage({ name: 'a'.repeat(20), text: 'b'.repeat(200) }).ok, true);
  assert.deepEqual(validateMessage({ name: 'a'.repeat(21), text: 'ok' }), { ok: false, errors: [NAME_ERR] });
  assert.deepEqual(validateMessage({ name: 'ok', text: 'b'.repeat(201) }), { ok: false, errors: [TEXT_ERR] });
});
