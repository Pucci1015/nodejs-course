// 練習問題2のテスト
// 使い方: node --test html-helpers.test.mjs
//         MODULE=../solutions/html-helpers.mjs node --test html-helpers.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { html } from '../samples/mini-html.mjs';

const { attrs, safeUrl, jsonForScript, queryString } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './html-helpers.mjs')).href);

test('attrs: 値を引用符で囲み、エスケープする', () => {
  assert.equal(String(html`<input${attrs({ name: 'title', value: 'Tom & "Jerry"' })}>`), '<input name="title" value="Tom &amp; &quot;Jerry&quot;">');
});

test('attrs: true は名前だけ、false・null・undefined は書かない。0 と空文字は書く', () => {
  assert.equal(String(attrs({ required: true, disabled: false, placeholder: null, title: undefined, min: 0, alt: '' })), ' required min="0" alt=""');
});

test('attrs: class は配列とオブジェクトも受け取る', () => {
  assert.equal(String(attrs({ class: ['task', null, 'done'] })), ' class="task done"');
  assert.equal(String(attrs({ class: { task: true, done: false, urgent: 1 } })), ' class="task urgent"');
  assert.equal(String(attrs({ class: [] })), '', 'class が空なら書かない');
});

test('attrs: 属性名に使えない文字があれば TypeError', () => {
  for (const bad of ['a b', 'a"b', 'a>b', 'a=b', '']) {
    assert.throws(() => attrs({ [bad]: 'x' }), TypeError, JSON.stringify(bad));
  }
  assert.doesNotThrow(() => attrs({ 'data-task-id': 1, 'aria-label': 'x' }));
});

test('safeUrl: http・https・mailto と相対 URL は通す', () => {
  for (const ok of ['https://example.com/a?b=1', 'http://127.0.0.1:9215/', 'mailto:me@example.com', 'HTTPS://EXAMPLE.COM/', '/tasks/1', './a.html', '../b', '?page=2', '#top', 'tasks/1', '']) {
    assert.equal(safeUrl(ok), ok, ok);
  }
});

test('safeUrl: それ以外の scheme は # にする（大文字・前の空白・制御文字があっても）', () => {
  for (const ng of ['ftp://example.com/a', 'data:text/plain,hello', 'tel:0120', 'file:///etc/hosts', ' DATA:text/plain,x', '\tftp://x', 'f\ntp://x']) {
    assert.equal(safeUrl(ng), '#', JSON.stringify(ng));
  }
});

test('safeUrl: 「:」が scheme ではない場所にあるだけなら相対 URL', () => {
  assert.equal(safeUrl('/search?q=a:b'), '/search?q=a:b');
  assert.equal(safeUrl('notes/10:30.html'), 'notes/10:30.html');
});

test('jsonForScript: < > & を \\u003c などにする。JSON としては同じ値', () => {
  const v = { title: '</script> と <!-- の説明', note: 'a & b > c' };
  const out = String(jsonForScript(v));
  assert.ok(!/[<>&]/.test(out), out);
  assert.deepEqual(JSON.parse(out), v);
});

test('jsonForScript: U+2028・U+2029 も \\u2028・\\u2029 にする', () => {
  const out = String(jsonForScript({ s: 'a\u2028b\u2029c' }));
  assert.ok(out.includes('\\u2028') && out.includes('\\u2029'), out);
  assert.ok(!out.includes('\u2028') && !out.includes('\u2029'));
});

test('jsonForScript: html タグに入れても、もう一度エスケープされない。undefined は null', () => {
  assert.equal(String(html`<script>const d = ${jsonForScript({ a: '"' })};</script>`), '<script>const d = {"a":"\\""};</script>');
  assert.equal(String(jsonForScript(undefined)), 'null');
});

test('queryString: 値を URL 用にエンコードする', () => {
  assert.equal(queryString({ q: 'a b&c=d', page: 2 }), '?q=a+b%26c%3Dd&page=2');
  assert.equal(queryString({ q: '日本' }), '?q=%E6%97%A5%E6%9C%AC');
});

test('queryString: null・undefined は入れない。何も無ければ空文字', () => {
  assert.equal(queryString({ q: null, page: undefined, sort: 'new' }), '?sort=new');
  assert.equal(queryString({ q: null }), '');
  assert.equal(queryString({}), '');
});

test('queryString の結果を html タグで href に入れると、& は &amp; になる（それで正しい）', () => {
  assert.equal(String(html`<a href="/s${queryString({ q: 'x', page: 2 })}">次</a>`), '<a href="/s?q=x&amp;page=2">次</a>');
});
