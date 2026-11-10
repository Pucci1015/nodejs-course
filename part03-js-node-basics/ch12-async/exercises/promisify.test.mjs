// 練習問題5 用: promisify.mjs の promisify と callbackify のテスト
// 使い方: node --test promisify.test.mjs
//   模範解答を試す: MODULE=../solutions/promisify.mjs node --test promisify.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './promisify.mjs');
const { promisify, callbackify } = await import(pathToFileURL(modulePath).href);

// エラーファーストのコールバックの関数（テスト用）
function divideLater(a, b, callback) {
  setTimeout(() => {
    if (b === 0) callback(new RangeError('0 では割れません'));
    else callback(null, a / b);
  }, 5);
}

test('promisify: 成功すると、結果で fulfilled になる Promise を返す', async () => {
  const divide = promisify(divideLater);
  const p = divide(10, 4);
  assert.ok(p instanceof Promise);
  assert.equal(await p, 2.5);
});

test('promisify: err があると、その err で rejected になる', async () => {
  const divide = promisify(divideLater);
  await assert.rejects(divide(1, 0), { name: 'RangeError', message: '0 では割れません' });
});

test('promisify: this をそのまま渡す', async () => {
  const counter = {
    n: 41,
    next(callback) {
      setTimeout(() => callback(null, ++this.n), 1);
    },
  };
  counter.nextAsync = promisify(counter.next);
  assert.equal(await counter.nextAsync(), 42);
});

test('promisify: 元の関数が同期的に例外を投げたら、例外ではなく rejected になる', async () => {
  const broken = promisify(() => {
    throw new TypeError('同期の例外');
  });
  let p;
  assert.doesNotThrow(() => {
    p = broken();
  });
  await assert.rejects(p, TypeError);
});

test('promisify: コールバックに複数の結果が渡されたら、最初の1つを使う（Node.js の promisify と同じ）', async () => {
  const two = promisify((cb) => cb(null, 'a', 'b'));
  assert.equal(await two(), 'a');
});

test('promisify: コールバックが2回呼ばれても、最初の1回だけが結果になる', async () => {
  const twice = promisify((cb) => {
    cb(null, '1回目');
    cb(new Error('2回目'));
  });
  assert.equal(await twice(), '1回目');
});

test('promisify: 関数でないものには TypeError', () => {
  assert.throws(() => promisify('not a function'), TypeError);
});

test('callbackify: async 関数を、エラーファーストのコールバックの関数にする', (t, done) => {
  const add = callbackify(async (a, b) => a + b);
  add(1, 2, (err, result) => {
    assert.equal(err, null);
    assert.equal(result, 3);
    done();
  });
});

test('callbackify: 失敗したら、err に入れて呼ぶ', (t, done) => {
  const fail = callbackify(async () => {
    throw new Error('失敗');
  });
  fail((err, result) => {
    assert.equal(err.message, '失敗');
    assert.equal(result, undefined);
    done();
  });
});

test('callbackify: 関数がすぐに return しても、コールバックは非同期に呼ぶ', (t, done) => {
  const order = [];
  const f = callbackify(async () => 'x');
  f(() => {
    order.push('callback');
    assert.deepEqual(order, ['after', 'callback']);
    done();
  });
  order.push('after');
});

test('promisify と callbackify は、行って戻れる', async () => {
  const back = promisify(callbackify(async (x) => x * 2));
  assert.equal(await back(21), 42);
});
