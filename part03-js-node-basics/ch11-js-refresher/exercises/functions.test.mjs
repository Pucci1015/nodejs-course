// 練習問題8 用: functions.mjs の once・memoize・debounce・pipe のテスト
// 使い方: node --test functions.test.mjs
//   模範解答を試す: MODULE=../solutions/functions.mjs node --test functions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './functions.mjs');
const { once, memoize, debounce, pipe } = await import(pathToFileURL(modulePath).href);

// ---- once ----
test('once: 何度呼んでも、元の関数は1回だけ呼ばれ、同じ結果を返す', () => {
  let calls = 0;
  const init = once((x) => {
    calls++;
    return { x };
  });
  const first = init(1);
  const second = init(2);
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.deepEqual(second, { x: 1 });
});

test('once: this と引数をそのまま渡す', () => {
  const obj = { name: 'alice', hello: once(function (greeting) { return `${greeting} ${this.name}`; }) };
  assert.equal(obj.hello('こんにちは'), 'こんにちは alice');
});

test('once: 元の関数が例外を投げたら、結果を覚えず、次の呼び出しでもう一度試す', () => {
  let calls = 0;
  const flaky = once(() => {
    calls++;
    if (calls === 1) throw new Error('1回目は失敗');
    return 'ok';
  });
  assert.throws(() => flaky(), /1回目は失敗/);
  assert.equal(flaky(), 'ok');
  assert.equal(flaky(), 'ok');
  assert.equal(calls, 2);
});

test('once: undefined を返す関数でも、2回目は呼ばない', () => {
  let calls = 0;
  const f = once(() => {
    calls++;
  });
  f();
  f();
  assert.equal(calls, 1);
});

// ---- memoize ----
test('memoize: 同じ引数なら、2回目からは元の関数を呼ばない', () => {
  let calls = 0;
  const slowSquare = memoize((n) => {
    calls++;
    return n * n;
  });
  assert.equal(slowSquare(4), 16);
  assert.equal(slowSquare(4), 16);
  assert.equal(slowSquare(5), 25);
  assert.equal(calls, 2);
});

test('memoize: 既定のキーは、すべての引数から作る（1つ目だけではない）', () => {
  const add = memoize((a, b) => a + b);
  assert.equal(add(1, 2), 3);
  assert.equal(add(1, 3), 4);
});

test('memoize: 既定のキーで、1 と "1" を区別する', () => {
  const kind = memoize((x) => typeof x);
  assert.equal(kind(1), 'number');
  assert.equal(kind('1'), 'string');
});

test('memoize: key の関数を渡せる', () => {
  let calls = 0;
  const byId = memoize(
    (user) => {
      calls++;
      return user.name.toUpperCase();
    },
    { key: (user) => user.id },
  );
  assert.equal(byId({ id: 1, name: 'alice' }), 'ALICE');
  assert.equal(byId({ id: 1, name: '別の名前でも同じ ID' }), 'ALICE');
  assert.equal(calls, 1);
});

test('memoize: maxSize を超えたら、いちばん古く使われたものから捨てる', () => {
  let calls = 0;
  const f = memoize(
    (n) => {
      calls++;
      return n;
    },
    { maxSize: 2 },
  );
  f(1); // 1
  f(2); // 1, 2
  f(1); // 1 を使ったので、いちばん古いのは 2
  f(3); // 2 を捨てる → 1, 3
  assert.equal(calls, 3);
  f(1); // 覚えている
  assert.equal(calls, 3);
  f(2); // 捨てたので、もう一度呼ぶ
  assert.equal(calls, 4);
});

test('memoize: 例外は覚えない', () => {
  let calls = 0;
  const f = memoize(() => {
    calls++;
    throw new Error('失敗');
  });
  assert.throws(() => f(1));
  assert.throws(() => f(1));
  assert.equal(calls, 2);
});

test('memoize: clear() で覚えたものを消せる', () => {
  let calls = 0;
  const f = memoize(() => ++calls);
  f();
  f.clear();
  f();
  assert.equal(calls, 2);
});

// ---- debounce ----
test('debounce: 続けて呼ぶと、最後の呼び出しから ms たってから1回だけ、最後の引数で呼ぶ', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const save = debounce((text) => calls.push(text), 300);
  save('あ');
  t.mock.timers.tick(200);
  save('あい');
  t.mock.timers.tick(200);
  save('あいう');
  t.mock.timers.tick(299);
  assert.deepEqual(calls, []);
  t.mock.timers.tick(1);
  assert.deepEqual(calls, ['あいう']);
});

test('debounce: this をそのまま渡す', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const editor = {
    name: 'エディタ',
    saved: null,
    save: debounce(function () {
      this.saved = this.name;
    }, 100),
  };
  editor.save();
  t.mock.timers.tick(100);
  assert.equal(editor.saved, 'エディタ');
});

test('debounce: cancel() で、待っている呼び出しを取り消す', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const f = debounce(() => calls++, 100);
  f();
  f.cancel();
  t.mock.timers.tick(1000);
  assert.equal(calls, 0);
});

test('debounce: flush() で、待っている呼び出しをすぐに実行する（待っていなければ何もしない）', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const f = debounce((x) => calls.push(x), 100);
  f.flush();
  assert.deepEqual(calls, []);
  f('今すぐ');
  f.flush();
  assert.deepEqual(calls, ['今すぐ']);
  t.mock.timers.tick(1000);
  assert.deepEqual(calls, ['今すぐ']); // 2回目は呼ばれない
});

// ---- pipe ----
test('pipe: 左から順に関数を通す', () => {
  const slugify = pipe(
    (s) => s.trim(),
    (s) => s.toLowerCase(),
    (s) => s.replaceAll(/\s+/g, '-'),
  );
  assert.equal(slugify('  Hello Node World '), 'hello-node-world');
});

test('pipe: 最初の関数には、すべての引数を渡す', () => {
  const f = pipe(
    (a, b) => a + b,
    (n) => n * 10,
  );
  assert.equal(f(1, 2), 30);
});

test('pipe: 関数が1つも無ければ、最初の引数をそのまま返す', () => {
  assert.equal(pipe()(42), 42);
});

test('pipe: 関数でないものを渡すと、作るときに TypeError', () => {
  assert.throws(() => pipe((x) => x, 'not a function'), TypeError);
});
