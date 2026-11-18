// 第56章 5節: 「今」を引数で渡すテストと、mock.timers で Date を止めるテスト
// 使い方: node --test samples/due.test.ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dueLabel } from './due.ts';
import { dueLabel as dueLabelBad } from './due-bad.ts';

// 日本時間 2026-12-10 の 9 時（UTC では 0 時）
const now = new Date('2026-12-10T00:00:00Z');

describe('dueLabel（now を引数で受け取る）', () => {
  test('今日', () => assert.equal(dueLabel('2026-12-10', now), '今日まで'));
  test('3日後', () => assert.equal(dueLabel('2026-12-13', now), 'あと 3 日'));
  test('2日前', () => assert.equal(dueLabel('2026-12-08', now), '2 日過ぎ'));
  test('期限なし', () => assert.equal(dueLabel(null, now), '期限なし'));

  test('日本時間では、もう次の日（UTC では前の日の 15 時）', () => {
    const lateUtc = new Date('2026-12-09T15:00:00Z'); // 日本時間 12-10 の 0 時
    assert.equal(dueLabel('2026-12-10', lateUtc), '今日まで');
  });
});

describe('dueLabel（中で new Date() を読む）', () => {
  test('mock.timers で「今」を止める', (t) => {
    // Date だけを偽物にする。テストが終わると、自動で元に戻る
    t.mock.timers.enable({ apis: ['Date'], now });
    assert.equal(dueLabelBad('2026-12-13'), 'あと 3 日');
  });
});
