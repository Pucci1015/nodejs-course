// 練習問題3 用: select-box.mjs のテスト
// 使い方: node --test select-box.test.mjs
//   模範解答を試す: MODULE=../solutions/select-box.mjs node --test select-box.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SafeHtml } from '../samples/mini-html.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './select-box.mjs')).href);

const SORTS = [
  { value: 'new', label: '新しい順' },
  { value: 'old', label: '古い順' },
];

test('selectBox: <select> と <option> を作る', () => {
  assert.equal(String(m.selectBox('sort', SORTS, 'none')),
    '<select name="sort"><option value="new">新しい順</option><option value="old">古い順</option></select>');
});

test('selectBox: selected と同じ value の <option> に selected を付ける', () => {
  assert.equal(String(m.selectBox('sort', SORTS, 'old')),
    '<select name="sort"><option value="new">新しい順</option><option value="old" selected>古い順</option></select>');
});

test('selectBox: 結果は SafeHtml', () => {
  assert.ok(m.selectBox('sort', SORTS, 'new') instanceof SafeHtml);
});

test('selectBox: 名前・value・表示の文字をエスケープする', () => {
  const out = String(m.selectBox('a"b', [{ value: 'x"y', label: 'R&D' }], 'x"y'));
  assert.equal(out, '<select name="a&quot;b"><option value="x&quot;y" selected>R&amp;D</option></select>');
});

test('selectBox: 選択肢が空なら、空の <select>', () => {
  assert.equal(String(m.selectBox('sort', [], 'new')), '<select name="sort"></select>');
});
