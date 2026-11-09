// 練習問題6のテスト。サーバは使わず、偽の req・res で確かめる
// 使い方: node --test compose.test.mjs
//         MODULE=../solutions/compose.mjs node --test compose.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const { compose } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './compose.mjs')).href);

const req = {};
const res = {};

test('前から順に動き、await next() の後は、後ろから順に戻ってくる（玉ねぎの形）', async () => {
  const log = [];
  const mw = (name) => async (req, res, next) => {
    log.push(`${name} 前`);
    await next();
    log.push(`${name} 後`);
  };
  const app = compose(mw('a'), mw('b'), mw('c'));
  await app(req, res);
  assert.deepEqual(log, ['a 前', 'b 前', 'c 前', 'c 後', 'b 後', 'a 後']);
});

test('next は、後ろが async で終わるまで待つ', async () => {
  const log = [];
  const app = compose(
    async (req, res, next) => { await next(); log.push('外'); },
    async () => { await sleep(20); log.push('中'); },
  );
  await app(req, res);
  assert.deepEqual(log, ['中', '外']);
});

test('req と res は、全員で同じものを使う', async () => {
  const r = {};
  const app = compose(
    (req, res, next) => { req.user = 'ryota'; return next(); },
    (req) => { req.seen = req.user; },
  );
  await app(r, res);
  assert.equal(r.seen, 'ryota');
});

test('next を呼ばなければ、そこで止まる（後ろは動かない）', async () => {
  const log = [];
  const app = compose(
    (req, res, next) => { log.push('a'); },
    () => { log.push('b'); },
  );
  await app(req, res);
  assert.deepEqual(log, ['a']);
});

test('last: 最後に呼ぶ関数。全員が next を呼んだときだけ動く', async () => {
  const log = [];
  const app = compose((req, res, next) => next());
  await app(req, res, () => log.push('last'));
  assert.deepEqual(log, ['last']);
  await compose()(req, res, () => log.push('空でも'));
  assert.deepEqual(log, ['last', '空でも']);
});

test('失敗は呼んだ側に伝わる。同期の throw も rejected になる', async () => {
  const app = compose(() => { throw new Error('同期'); });
  const p = app(req, res); // ここで throw されてはいけない
  assert.ok(p instanceof Promise);
  await assert.rejects(p, /同期/);
  await assert.rejects(compose(async () => { throw new Error('非同期'); })(req, res), /非同期/);
});

test('外側のミドルウェアは、try で内側の失敗を受け取れる', async () => {
  let caught;
  const app = compose(
    async (req, res, next) => {
      try {
        await next();
      } catch (err) {
        caught = err.message;
      }
    },
    async () => { await sleep(5); throw new Error('内側'); },
  );
  await app(req, res);
  assert.equal(caught, '内側');
});

test('next を2回呼ぶと失敗する', async () => {
  let count = 0;
  const app = compose(
    async (req, res, next) => { await next(); await next(); },
    () => { count++; },
  );
  await assert.rejects(app(req, res), /2回/);
  assert.equal(count, 1);
});

test('compose したものを、別の compose の中で使える', async () => {
  const log = [];
  const inner = compose(
    (req, res, next) => { log.push('inner1'); return next(); },
    (req, res, next) => { log.push('inner2'); return next(); },
  );
  const app = compose((req, res, next) => { log.push('outer'); return next(); }, inner, () => { log.push('end'); });
  await app(req, res);
  assert.deepEqual(log, ['outer', 'inner1', 'inner2', 'end']);
});

test('関数でないものは、compose したときに TypeError', () => {
  assert.throws(() => compose(() => {}, 'abc'), TypeError);
});

test('同じ compose の結果を、何回も（同時に）使える', async () => {
  const app = compose(async (req, res, next) => { await sleep(5); await next(); }, (req) => { req.done = true; });
  const a = {}, b = {};
  await Promise.all([app(a, res), app(b, res)]);
  assert.ok(a.done && b.done);
});
