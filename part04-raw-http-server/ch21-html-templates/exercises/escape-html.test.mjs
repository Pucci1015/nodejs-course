// 練習問題1 用: escape-html.mjs のテスト
// 使い方: node --test escape-html.test.mjs
//   模範解答を試す: MODULE=../solutions/escape-html.mjs node --test escape-html.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './escape-html.mjs')).href);

test('escapeHtml: 5つの文字を置き換える', () => {
  assert.equal(m.escapeHtml('<p class="a">Tom & \'Jerry\'</p>'), '&lt;p class=&quot;a&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/p&gt;');
});

test('escapeHtml: & を二重に置き換えない', () => {
  assert.equal(m.escapeHtml('a < b'), 'a &lt; b');
  assert.equal(m.escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml: 特別な文字が無ければ、そのまま', () => {
  assert.equal(m.escapeHtml('こんにちは'), 'こんにちは');
  assert.equal(m.escapeHtml(''), '');
});

test('escapeHtml: 数は文字にする。null と undefined は空の文字列', () => {
  assert.equal(m.escapeHtml(0), '0');
  assert.equal(m.escapeHtml(42), '42');
  assert.equal(m.escapeHtml(null), '');
  assert.equal(m.escapeHtml(undefined), '');
});

test('textToHtml: 改行を <br> にする', () => {
  assert.equal(m.textToHtml('1行目\n2行目'), '1行目<br>\n2行目');
});

test('textToHtml: 先にエスケープしてから <br> を入れる', () => {
  assert.equal(m.textToHtml('a < b\n<br>'), 'a &lt; b<br>\n&lt;br&gt;');
});
