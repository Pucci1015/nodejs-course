// 練習問題7のテスト
// 使い方: node --test query.test.mjs
//         MODULE=../solutions/query.mjs node --test query.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseQuery, QueryError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './query.mjs')).href);

const schema = {
  page: { type: 'int', default: 1, min: 1, max: 1000 },
  sort: { type: 'enum', values: ['new', 'old'], default: 'new' },
  done: { type: 'bool' },
  tag: { type: 'string', multiple: true, maxLength: 5 },
  q: { type: 'string', default: '' },
};
const parse = (qs, s = schema, o) => parseQuery(new URLSearchParams(qs), s, o);
// 失敗したときの、間違いがあったキーの一覧
function errorKeys(qs, s = schema, o) {
  try {
    parse(qs, s, o);
  } catch (err) {
    assert.ok(err instanceof QueryError, `QueryError ではありません: ${err}`);
    return err.errors.map((e) => e.key).sort();
  }
  assert.fail('QueryError になりませんでした');
}

test('何も無ければ既定の値。multiple は空の配列。既定も無ければキーを作らない', () => {
  assert.deepEqual(parse(''), { page: 1, sort: 'new', tag: [], q: '' });
});

test('ふつうに読める', () => {
  assert.deepEqual(parse('page=3&sort=old&done=true&tag=js&tag=node&q=a+b'), {
    page: 3, sort: 'old', done: true, tag: ['js', 'node'], q: 'a b',
  });
  assert.equal(parse('done=0').done, false);
  assert.equal(parse('done=1').done, true);
});

test('int: Number() なら数になってしまう書き方も、間違いにする', () => {
  for (const bad of ['', 'abc', '1.5', '1e3', '0x10', ' 3', '3 ', '12abc']) {
    assert.deepEqual(errorKeys(`page=${encodeURIComponent(bad)}`), ['page'], JSON.stringify(bad));
  }
  assert.equal(parse('page=007').page, 7);
});

test('int: min と max、大きすぎる数', () => {
  assert.deepEqual(errorKeys('page=0'), ['page']);
  assert.deepEqual(errorKeys('page=1001'), ['page']);
  assert.deepEqual(errorKeys('page=99999999999999999999', { page: { type: 'int' } }), ['page']);
  assert.equal(parse('page=1000').page, 1000);
});

test('enum と bool', () => {
  assert.deepEqual(errorKeys('sort=random'), ['sort']);
  assert.deepEqual(errorKeys('done=yes'), ['done']);
  assert.deepEqual(errorKeys('done='), ['done']);
});

test('multiple でないキーが2つ以上あれば間違い', () => {
  assert.deepEqual(errorKeys('page=1&page=2'), ['page']);
});

test('string の maxLength は文字の数（絵文字も1文字）', () => {
  assert.deepEqual(parse('tag=%F0%9F%8D%A3%F0%9F%8D%A3%F0%9F%8D%A3%F0%9F%8D%A3%F0%9F%8D%A3').tag, ['🍣🍣🍣🍣🍣']);
  assert.deepEqual(errorKeys('tag=abcdef'), ['tag']);
});

test('required', () => {
  const s = { id: { type: 'int', required: true }, ids: { type: 'int', multiple: true, required: true } };
  assert.deepEqual(errorKeys('', s), ['id', 'ids']);
  assert.deepEqual(parse('id=1&ids=2&ids=3', s), { id: 1, ids: [2, 3] });
});

test('間違いは全部まとめて返す。QueryError は 400 の HttpError で、メッセージに全部入る', () => {
  let err;
  try {
    parse('page=0&sort=x&done=maybe');
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof QueryError);
  assert.equal(err.status, 400);
  assert.deepEqual(err.errors.map((e) => e.key).sort(), ['done', 'page', 'sort']);
  for (const e of err.errors) {
    assert.equal(typeof e.message, 'string');
    assert.ok(err.message.includes(e.message));
  }
});

test('strict: 知らないキーを間違いにする。strict でなければ無視する', () => {
  assert.deepEqual(parse('pgae=2'), { page: 1, sort: 'new', tag: [], q: '' });
  assert.deepEqual(errorKeys('pgae=2', schema, { strict: true }), ['pgae']);
});
