// 練習問題6 の模範解答: mock.timers で時間を進め、mock.fn で呼ばれ方を確かめる
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/debounce.test.ts
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/debounce.ts');
const { debounce }: typeof import('../exercises/debounce.ts') = await import(pathToFileURL(file).href);

// 追加: どのテストも同じ準備なので、関数にまとめる
function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const save = t.mock.fn((_text: string) => {});
  const debounced = debounce(save, 300);
  const tick = (ms: number) => t.mock.timers.tick(ms);
  return { save, debounced, tick };
}

test('300ms たつと呼ばれる（299ms では呼ばれない）', (t) => {
  const { save, debounced, tick } = setup(t);
  debounced('a');
  tick(299);
  assert.equal(save.mock.callCount(), 0);
  tick(1);
  assert.equal(save.mock.callCount(), 1);
});

test('呼ばれるたびに待ち直し、最後の引数で1回だけ呼ぶ', (t) => {
  const { save, debounced, tick } = setup(t);
  debounced('a');
  tick(200);
  debounced('ab');
  tick(200); // 最初から 400ms、最後から 200ms
  assert.equal(save.mock.callCount(), 0);
  tick(100);
  assert.equal(save.mock.callCount(), 1);
  assert.deepEqual(save.mock.calls[0]?.arguments, ['ab']);
});

test('cancel すると呼ばれない', (t) => {
  const { save, debounced, tick } = setup(t);
  debounced('a');
  debounced.cancel();
  tick(1000);
  assert.equal(save.mock.callCount(), 0);
});

test('flush すると、待たずに今すぐ呼ばれ、後でもう一度は呼ばれない', (t) => {
  const { save, debounced, tick } = setup(t);
  debounced('a');
  debounced.flush();
  assert.deepEqual(
    save.mock.calls.map((call) => call.arguments),
    [['a']],
  );
  tick(1000);
  debounced.flush(); // 待っているものが無いので、何もしない
  assert.equal(save.mock.callCount(), 1);
});
