// 練習問題2 用: find-route.mjs のテスト
// 使い方: node --test find-route.test.mjs
//   模範解答を試す: MODULE=../solutions/find-route.mjs node --test find-route.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { findRoute } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './find-route.mjs')).href);

const list = () => 'list';
const create = () => 'create';
const about = () => 'about';
const routes = [
  { method: 'GET', path: '/api/tasks', handler: list },
  { method: 'POST', path: '/api/tasks', handler: create },
  { method: 'GET', path: '/about', handler: about },
];

test('メソッドとパスがあえば、status 200 とそのハンドラ', () => {
  assert.deepEqual(findRoute(routes, 'GET', '/api/tasks'), { status: 200, handler: list });
  assert.deepEqual(findRoute(routes, 'POST', '/api/tasks'), { status: 200, handler: create });
});

test('どのルートのパスにもあわなければ、status 404', () => {
  assert.deepEqual(findRoute(routes, 'GET', '/nai'), { status: 404 });
  assert.deepEqual(findRoute(routes, 'GET', '/api/tasks/1'), { status: 404 });
});

test('パスはあうがメソッドが違えば、status 405 と allow', () => {
  assert.deepEqual(findRoute(routes, 'DELETE', '/api/tasks'), { status: 405, allow: 'GET, HEAD, POST' });
});

test('HEAD は、GET のルートのハンドラで答える', () => {
  assert.deepEqual(findRoute(routes, 'HEAD', '/about'), { status: 200, handler: about });
});

test('allow はアルファベット順。GET があれば HEAD も入れる。同じメソッドは2回入れない', () => {
  const r = [
    { method: 'GET', path: '/x', handler: list },
    { method: 'GET', path: '/x', handler: about },
  ];
  assert.deepEqual(findRoute(r, 'PUT', '/x'), { status: 405, allow: 'GET, HEAD' });
});

test('GET が無いパスに HEAD が来たら 405', () => {
  const r = [{ method: 'POST', path: '/only-post', handler: create }];
  assert.deepEqual(findRoute(r, 'HEAD', '/only-post'), { status: 405, allow: 'POST' });
});

test('表が空なら 404', () => {
  assert.deepEqual(findRoute([], 'GET', '/'), { status: 404 });
});
