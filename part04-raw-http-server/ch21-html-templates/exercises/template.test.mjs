// 練習問題4のテスト
// 使い方: node --test template.test.mjs
//         MODULE=../solutions/template.mjs node --test template.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { compile, TemplateError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './template.mjs')).href);

const r = (src, data) => compile(src)(data);
// TemplateError で、行番号が line のときだけ通す
const isTemplateError = (line) => (err) => err instanceof TemplateError && err.line === line;

test('{{ 名前 }} の値をエスケープして出す', () => {
  assert.equal(r('<p>{{ title }}</p>', { title: 'Tom & <Jerry>' }), '<p>Tom &amp; &lt;Jerry&gt;</p>');
  assert.equal(r('<p title="{{title}}">', { title: '"引用"' }), '<p title="&quot;引用&quot;">');
});

test('{{ a.b.c }} でたどる。無い名前・null・undefined・false は何も出さない。0 は出す', () => {
  assert.equal(r('{{ user.name }}', { user: { name: '花子' } }), '花子');
  assert.equal(r('[{{ nothing }}][{{ user.age.x }}][{{ n }}][{{ f }}][{{ z }}]', { user: {}, n: null, f: false, z: 0 }), '[][][][][0]');
});

test('自分のキーだけをたどる（プロトタイプの先にあるものは出さない）', () => {
  assert.equal(r('[{{ constructor }}][{{ user.toString }}][{{ user.__proto__ }}]', { user: {} }), '[][][]');
  assert.equal(r('{{ items.length }}', { items: [1, 2, 3] }), '3');
});

test('フィルタ: raw はエスケープしない。upper・length。つなげられる', () => {
  assert.equal(r('{{ body | raw }}', { body: '<b>太字</b>' }), '<b>太字</b>');
  assert.equal(r('{{ name | upper }}', { name: 'node & js' }), 'NODE &amp; JS');
  assert.equal(r('{{ tasks | length }}件', { tasks: [1, 2] }), '2件');
  assert.equal(r('{{ s|upper|raw }}', { s: '<i>' }), '<I>');
});

test('if・else。空の配列は偽', () => {
  const src = '{% if tasks %}ある{% else %}無い{% endif %}';
  assert.equal(r(src, { tasks: [1] }), 'ある');
  assert.equal(r(src, { tasks: [] }), '無い');
  assert.equal(r(src, {}), '無い');
  assert.equal(r('{% if a %}A{% endif %}.', { a: 'x' }), 'A.');
});

test('for と、その else（配列が空のとき）', () => {
  const src = '<ul>{% for t in tasks %}<li>{{ t.title }}</li>{% else %}<li>なし</li>{% endfor %}</ul>';
  assert.equal(r(src, { tasks: [{ title: 'A & B' }, { title: 'C' }] }), '<ul><li>A &amp; B</li><li>C</li></ul>');
  assert.equal(r(src, { tasks: [] }), '<ul><li>なし</li></ul>');
});

test('for の中で loop.index・loop.first・loop.last。外の名前も見える', () => {
  const src = '{% for x in xs %}{{ loop.index }}:{{ x }}{% if loop.first %}(最初){% endif %}{% if loop.last %}(最後){% else %},{% endif %}{% endfor %} / {{ title }}';
  assert.equal(r(src, { xs: ['a', 'b', 'c'], title: 'T' }), '1:a(最初),2:b,3:c(最後) / T');
});

test('入れ子の for。内側の変数が外側の同じ名前より優先', () => {
  const src = '{% for g in groups %}[{{ g.name }}:{% for g in g.items %}{{ g }}{% endfor %}]{% endfor %}';
  assert.equal(r(src, { groups: [{ name: 'A', items: [1, 2] }, { name: 'B', items: [] }] }), '[A:12][B:]');
});

test('{# コメント #} は何も出さない', () => {
  assert.equal(r('a{# ここは\n出さない #}b', {}), 'ab');
});

test('書き方の誤りは compile の時点で TemplateError（行番号つき）', () => {
  assert.throws(() => compile('一\n二 {{ title'), isTemplateError(2), '閉じていない {{');
  assert.throws(() => compile('{% if a %}\n\n{% endfor %}'), isTemplateError(3), '対応しない end');
  assert.throws(() => compile('\n{% if a %}あ'), isTemplateError(2), '閉じていない if は、開いた行');
  assert.throws(() => compile('{% while a %}{% endwhile %}'), isTemplateError(1), '知らないタグ');
  assert.throws(() => compile('{{ name | shout }}'), isTemplateError(1), '知らないフィルタ');
  assert.throws(() => compile('{{ a + b }}'), isTemplateError(1), '名前でないもの');
});

test('同じテンプレートを、違うデータで何度も使える', () => {
  const page = compile('<h1>{{ title }}</h1>');
  assert.equal(page({ title: '一' }), '<h1>一</h1>');
  assert.equal(page({ title: '二' }), '<h1>二</h1>');
});
