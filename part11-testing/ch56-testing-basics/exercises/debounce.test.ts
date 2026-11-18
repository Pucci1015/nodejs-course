// 練習問題6: debounce のテストを、mock.timers で時間を進めて書く
// 使い方: node --test debounce.test.ts
//         node ../../tools/check-tests.ts debounce.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './debounce.ts');
const { debounce }: typeof import('./debounce.ts') = await import(pathToFileURL(file).href);

test('300ms たつと呼ばれる', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const save = t.mock.fn((_text: string) => {});
  const debounced = debounce(save, 300);

  debounced('a');
  t.mock.timers.tick(300);

  assert.equal(save.mock.callCount(), 1);
});

// ここを書く（テストを書き足す）
