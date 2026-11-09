// 練習問題6のテスト
// 使い方: node --test preconditions.test.mjs
//         MODULE=../solutions/preconditions.mjs node --test preconditions.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseEntityTags, evaluatePreconditions } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './preconditions.mjs')).href);

const ev = (o) => evaluatePreconditions({ exists: true, etag: '"3"', ...o });

test('1. ETag の並びを読む', () => {
  assert.deepEqual(parseEntityTags('"a", W/"b" ,"c"'), [
    { weak: false, tag: 'a' },
    { weak: true, tag: 'b' },
    { weak: false, tag: 'c' },
  ]);
  assert.equal(parseEntityTags(' * '), '*');
  assert.deepEqual(parseEntityTags(undefined), []);
});

test('2. ETag の中の , は区切りではない', () => {
  assert.deepEqual(parseEntityTags('"a,b", "c"'), [
    { weak: false, tag: 'a,b' },
    { weak: false, tag: 'c' },
  ]);
});

test('3. 形の正しくないものは、どれにもあてはまらない', () => {
  assert.deepEqual(parseEntityTags('3'), []); // " が無い
  assert.equal(ev({ method: 'PATCH', ifMatch: '3' }), 412);
});

test('4. If-Match: 同じなら進む、違えば 412', () => {
  assert.equal(ev({ method: 'PATCH', ifMatch: '"3"' }), 'proceed');
  assert.equal(ev({ method: 'PATCH', ifMatch: '"2"' }), 412);
  assert.equal(ev({ method: 'PATCH', ifMatch: '"1", "3"' }), 'proceed'); // どれか1つでよい
});

test('5. If-Match は強い比べ方（W/ はあてはまらない）', () => {
  assert.equal(ev({ method: 'PATCH', ifMatch: 'W/"3"' }), 412);
  assert.equal(ev({ method: 'PATCH', ifMatch: '"3"', etag: 'W/"3"' }), 412);
});

test('6. If-Match: * は「何かあれば」', () => {
  assert.equal(ev({ method: 'PUT', ifMatch: '*' }), 'proceed');
  assert.equal(ev({ method: 'PUT', ifMatch: '*', exists: false, etag: undefined }), 412);
});

test('7. If-None-Match: GET であてはまれば 304、弱い比べ方', () => {
  assert.equal(ev({ method: 'GET', ifNoneMatch: '"3"' }), 304);
  assert.equal(ev({ method: 'HEAD', ifNoneMatch: 'W/"3"' }), 304);
  assert.equal(ev({ method: 'GET', ifNoneMatch: '"2"' }), 'proceed');
});

test('8. If-None-Match: * で「まだ無いときだけ作る」', () => {
  assert.equal(ev({ method: 'PUT', ifNoneMatch: '*', exists: false, etag: undefined }), 'proceed');
  assert.equal(ev({ method: 'PUT', ifNoneMatch: '*' }), 412); // もうあるので上書きしない
});

test('9. GET 以外であてはまった If-None-Match は 412', () => {
  assert.equal(ev({ method: 'DELETE', ifNoneMatch: '"3"' }), 412);
});

test('10. If-Match が先。If-Match で 412 なら、If-None-Match は見ない', () => {
  assert.equal(ev({ method: 'GET', ifMatch: '"2"', ifNoneMatch: '"3"' }), 412);
  assert.equal(ev({ method: 'GET', ifMatch: '"3"', ifNoneMatch: '"3"' }), 304);
});

test('11. requireIfMatch: 変えるリクエストに条件が無ければ 428', () => {
  assert.equal(ev({ method: 'PATCH', requireIfMatch: true }), 428);
  assert.equal(ev({ method: 'GET', requireIfMatch: true }), 'proceed');
  assert.equal(ev({ method: 'PATCH', requireIfMatch: false }), 'proceed');
});

test('12. 二人が同じ版から変えようとすると、後の人だけ 412', () => {
  let version = 1;
  const tryUpdate = (seen) => {
    const r = evaluatePreconditions({ method: 'PATCH', ifMatch: seen, etag: `"${version}"`, exists: true, requireIfMatch: true });
    if (r === 'proceed') version++;
    return r;
  };
  const a = '"1"'; // A さんが GET で見た ETag
  const b = '"1"'; // B さんも同じものを見た
  assert.equal(tryUpdate(a), 'proceed');
  assert.equal(tryUpdate(b), 412);
  assert.equal(tryUpdate(`"${version}"`), 'proceed'); // B さんが読み直してから
});
