// 練習問題5のテスト
// 使い方: node --test pattern.test.mjs
//         MODULE=../solutions/pattern.mjs node --test pattern.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parsePattern, matchPath, comparePatterns } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './pattern.mjs')).href);

// プロトタイプの無いオブジェクトでも比べられるように、ふつうのオブジェクトにしてから比べる
const m = (p, s) => {
  const r = matchPath(p, s);
  return r === null ? null : { ...r };
};

test('parsePattern: セグメントの種類', () => {
  assert.deepEqual(parsePattern('/'), []);
  assert.deepEqual(parsePattern('/users/:id/posts/*'), [
    { type: 'static', value: 'users' },
    { type: 'param', name: 'id' },
    { type: 'static', value: 'posts' },
    { type: 'rest' },
  ]);
});

test('parsePattern: 書き方の間違いは TypeError', () => {
  for (const bad of ['users', '/users/', '/a//b', '/files/*/x', '/users/:', '/users/:1d', '/users/:a-b']) {
    assert.throws(() => parsePattern(bad), TypeError, bad);
  }
});

test('静的なパターン: 完全に同じときだけ', () => {
  assert.deepEqual(m('/', '/'), {});
  assert.deepEqual(m('/users', '/users'), {});
  assert.equal(m('/users', '/users/'), null);
  assert.equal(m('/users', '/users/1'), null);
  assert.equal(m('/users', '/Users'), null); // 大文字と小文字は区別する
  assert.equal(m('/users', '/'), null);
  assert.equal(m('/', '/users'), null);
});

test('正規表現の記号も、ただの文字として扱う', () => {
  assert.deepEqual(m('/v1.0/items', '/v1.0/items'), {});
  assert.equal(m('/v1.0/items', '/v1x0/items'), null);
  assert.deepEqual(m('/a+b', '/a+b'), {});
  assert.equal(m('/a+b', '/aab'), null);
});

test(':name は 1つのセグメント', () => {
  assert.deepEqual(m('/users/:id', '/users/42'), { id: '42' });
  assert.deepEqual(m('/users/:id/posts/:postId', '/users/7/posts/abc'), { id: '7', postId: 'abc' });
  assert.equal(m('/users/:id', '/users'), null);
  assert.equal(m('/users/:id', '/users/'), null); // 空のセグメントにはあてはまらない
  assert.equal(m('/users/:id', '/users/1/2'), null);
  assert.equal(m('/users/:id', '/users//'), null);
});

test(':name の値は %xx を戻す。%2F は / に戻すが、区切りにはしない', () => {
  assert.deepEqual(m('/tags/:name', '/tags/%E6%97%A5%E6%9C%AC'), { name: '日本' });
  assert.deepEqual(m('/tags/:name', '/tags/a%2Fb'), { name: 'a/b' });
  assert.deepEqual(m('/tags/:name', '/tags/a+b'), { name: 'a+b' }); // パスの + は空白ではない
});

test('静的なセグメントも、%xx を戻してから比べる', () => {
  assert.deepEqual(m('/café', '/caf%C3%A9'), {});
});

test('壊れた %xx は URIError', () => {
  assert.throws(() => matchPath('/tags/:name', '/tags/%E0%A4%A'), URIError);
});

test('* は残り全部', () => {
  assert.deepEqual(m('/files/*', '/files/a/b/c.txt'), { '*': 'a/b/c.txt' });
  assert.deepEqual(m('/files/*', '/files/'), { '*': '' });
  assert.deepEqual(m('/files/*', '/files/%E3%81%82.txt'), { '*': 'あ.txt' });
  assert.equal(m('/files/*', '/files'), null);
  assert.equal(m('/files/*', '/other/a'), null);
});

test('パラメータの名前が __proto__ や constructor でも安全', () => {
  const r = matchPath('/x/:constructor', '/x/1');
  assert.equal(r.constructor, '1');
  const r2 = matchPath('/x/:__proto__', '/x/2');
  assert.equal(Object.keys(r2).length, 1);
  assert.equal(r2.__proto__, '2');
});

test('comparePatterns: 具体的なものが先', () => {
  const sorted = ['/users/*', '/users/:id', '/users/me', '/:a/:b', '/users/:id/posts'].sort(comparePatterns);
  assert.deepEqual(sorted, ['/users/me', '/users/:id/posts', '/users/:id', '/users/*', '/:a/:b']);
});
