// 練習問題1 用: sse-text.mjs のテスト
// 使い方: node --test sse-text.test.mjs
//   模範解答を試す: MODULE=../solutions/sse-text.mjs node --test sse-text.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { toSse, ping } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './sse-text.mjs')).href);

test('data だけ: data の行と、空の行', () => {
  assert.equal(toSse({ data: 'hello' }), 'data: "hello"\n\n');
});

test('data はオブジェクトでも JSON にする', () => {
  assert.equal(toSse({ data: { id: 7, title: '牛乳' } }), 'data: {"id":7,"title":"牛乳"}\n\n');
});

test('event・data・id の順番に並べる', () => {
  assert.equal(toSse({ id: 42, event: 'task', data: { id: 7 } }), 'event: task\ndata: {"id":7}\nid: 42\n\n');
});

test('JSON にするので、data の中の改行は \\n の2文字になり、行が分かれない', () => {
  const text = toSse({ data: 'a\nb' });
  assert.equal(text, 'data: "a\\nb"\n\n');
  assert.equal(text.split('\n').length, 3);
});

test('id が 0 でも書く（無いのは undefined のときだけ）', () => {
  assert.equal(toSse({ data: 1, id: 0 }), 'data: 1\nid: 0\n\n');
});

test('ping はコメントの行と、空の行', () => {
  assert.equal(ping(), ': ping\n\n');
});
