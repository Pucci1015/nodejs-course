// 練習問題2 のテスト
// 使い方: node --test when.test.ts
//   模範解答を試す: MODULE=../solutions/when.ts node --test when.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './when.ts');
const mod: typeof import('./when.ts') = await import(pathToFileURL(file).href);
const { formatDay, when } = mod;

test('formatDay: 月/日（曜日）', () => {
  assert.equal(formatDay('2026-12-10'), '12/10（木）');
  assert.equal(formatDay('2027-01-03'), '1/3（日）');
  assert.equal(formatDay('2026-02-28'), '2/28（土）');
});

test('when: 日本の時刻で、日付・始まり〜終わり・会議室', () => {
  assert.equal(
    when({ startsAt: '2026-12-10T01:00:00.000Z', endsAt: '2026-12-10T02:00:00.000Z', roomName: '会議室A' }),
    '12/10（木） 10:00〜11:00 会議室A',
  );
});

test('when: 日本の 8:00 は UTC では前の日。日付は日本の日付で出す', () => {
  assert.equal(
    when({ startsAt: '2026-12-09T23:00:00.000Z', endsAt: '2026-12-10T00:30:00.000Z', roomName: '会議室B' }),
    '12/10（木） 08:00〜09:30 会議室B',
  );
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
