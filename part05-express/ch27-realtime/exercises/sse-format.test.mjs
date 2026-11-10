// 練習問題5のテスト
// 使い方: node --test sse-format.test.mjs
//         MODULE=../solutions/sse-format.mjs node --test sse-format.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { formatEvent, parseEventStream, createEventStreamParser } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './sse-format.mjs')).href);

const ev = (data, type = 'message', lastEventId = '') => ({ type, data, lastEventId });

test('1. formatEvent: 決まった順番で書き、空の行で終わる', () => {
  assert.equal(formatEvent({ event: 'task', data: '{"id":1}', id: 7 }), 'event: task\ndata: {"id":1}\nid: 7\n\n');
  assert.equal(formatEvent({ retry: 3000 }), 'retry: 3000\n\n');
});

test('2. formatEvent: data の中の改行は、data: の行を分ける（\\r\\n・\\r も）', () => {
  assert.equal(formatEvent({ data: 'a\nb\r\nc\rd' }), 'data: a\ndata: b\ndata: c\ndata: d\n\n');
});

test('3. formatEvent: コメント（心拍）', () => {
  assert.equal(formatEvent({ comment: 'ping' }), ': ping\n\n');
});

test('4. formatEvent: event・id の改行、id の NULL、文字列でない data、負の retry は TypeError', () => {
  assert.throws(() => formatEvent({ event: 'a\ndata: 偽物' }), TypeError);
  assert.throws(() => formatEvent({ data: 'x', id: '1\r2' }), TypeError);
  assert.throws(() => formatEvent({ data: 'x', id: 'a\0b' }), TypeError);
  assert.throws(() => formatEvent({ data: { a: 1 } }), TypeError);
  assert.throws(() => formatEvent({ retry: -1 }), TypeError);
});

test('5. 読む: 複数行の data は \\n でつなぐ。event が無ければ message', () => {
  assert.deepEqual(parseEventStream('data: a\ndata: b\n\nevent: task\ndata: c\n\n').events, [ev('a\nb'), ev('c', 'task')]);
});

test('6. 読む: 行の終わりは \\r\\n・\\n・\\r のどれでもよい', () => {
  assert.deepEqual(parseEventStream('data: a\r\n\r\ndata: b\r\rdata: c\n\n').events, [ev('a'), ev('b'), ev('c')]);
});

test('7. 読む: : の後の空白は1つだけ取る。: が無い行は、値が空', () => {
  assert.deepEqual(parseEventStream('data:a\n\ndata:  b\n\ndata\n\ndata: x:y\n\n').events, [ev('a'), ev(' b'), ev(''), ev('x:y')]);
});

test('8. 読む: コメントと、知らない名前は無視。data の無いイベントは送らない', () => {
  assert.deepEqual(parseEventStream(': ping\n\nfoo: bar\nevent: x\n\ndata: ok\n\n').events, [ev('ok')]);
});

test('9. 読む: id は次のイベントにも引き継がれる。NULL を含む id は無視', () => {
  assert.deepEqual(parseEventStream('id: 1\ndata: a\n\ndata: b\n\nid: 2\0\ndata: c\n\nid\ndata: d\n\n').events, [ev('a', 'message', '1'), ev('b', 'message', '1'), ev('c', 'message', '1'), ev('d', 'message', '')]);
});

test('10. 読む: retry は数字だけのとき。最後の空の行が無いイベントは捨てる。先頭の BOM は捨てる', () => {
  assert.equal(parseEventStream('retry: 1500\n\n').retry, 1500);
  assert.equal(parseEventStream('retry: 1.5\n\nretry: abc\n\n').retry, undefined);
  assert.deepEqual(parseEventStream('data: a\n\ndata: 途中').events, [ev('a')]);
  assert.deepEqual(parseEventStream('﻿data: a\n\n').events, [ev('a')]);
});

test('11. 少しずつ届いても読める（\\r\\n が2つのチャンクに分かれても）', () => {
  const got = [];
  const p = createEventStreamParser((e) => got.push(e));
  for (const chunk of ['da', 'ta: あ', 'い\r', '\n\r', '\ndata: b\n', '\n']) p.push(chunk);
  p.end();
  assert.deepEqual(got, [ev('あい'), ev('b')]);
});

test('12. 書いたものを読むと、元に戻る', () => {
  const text = formatEvent({ event: 'task', data: '1行目\n2行目', id: 'abc' }) + formatEvent({ data: '' });
  assert.deepEqual(parseEventStream(text).events, [ev('1行目\n2行目', 'task', 'abc'), ev('', 'message', 'abc')]);
});
