// 第56章 1〜3節・9節: parseDuration のテスト（「手を動かす」で書くものの完成形）
// 使い方: node --test samples/duration.test.ts
//   ほかの実装を試す: MODULE=samples/mutants/duration-1.ts node --test samples/duration.test.ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// 確かめる実装を、環境変数 MODULE で取り替えられるようにする（9節）
const file = path.resolve(process.env.MODULE ?? path.join(import.meta.dirname, 'duration.ts'));
const { parseDuration }: typeof import('./duration.ts') = await import(pathToFileURL(file).href);

describe('parseDuration', () => {
  test('数字だけなら分', () => {
    assert.equal(parseDuration('90'), 90);
  });

  test('h と m を組み合わせられる', () => {
    assert.equal(parseDuration('2h'), 120);
    assert.equal(parseDuration('45m'), 45);
    assert.equal(parseDuration('1h30m'), 90);
  });

  test('前後の空白は無視する', () => {
    assert.equal(parseDuration(' 1h '), 60);
  });

  // 3節: 表で回す。境界（1 と 1440）の内側と外側を並べる
  const cases: [string, number | null][] = [
    ['0', null],
    ['1', 1],
    ['1440', 1440],
    ['1441', null],
    ['24h', 1440],
    ['24h1m', null],
    ['', null],
    ['h', null],
    ['1.5h', null],
    ['30m1h', null],
  ];
  for (const [input, expected] of cases) {
    test(`${JSON.stringify(input)} → ${expected}`, () => {
      assert.equal(parseDuration(input), expected);
    });
  }
});
