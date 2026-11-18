// 第56章 5.3節・6節: mock.timers で時間を進め、mock.fn で呼ばれ方を調べる
// 使い方: node --test samples/debounce.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debounce } from './debounce.ts';

test('続けて呼ぶと、最後の呼び出しから 300ms 後に1回だけ動く', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); // setTimeout を、時間を手で進める偽物にする
  const save = t.mock.fn((_text: string) => {}); // 呼ばれ方を覚える偽物の関数
  const debounced = debounce(save, 300);

  debounced('a');
  t.mock.timers.tick(200); // 200ms 進める（本当には待たない）
  debounced('ab');
  t.mock.timers.tick(299);
  assert.equal(save.mock.callCount(), 0); // まだ 299ms

  t.mock.timers.tick(1);
  assert.equal(save.mock.callCount(), 1);
  assert.deepEqual(save.mock.calls[0]?.arguments, ['ab']); // 最後の引数で呼ばれた
});
