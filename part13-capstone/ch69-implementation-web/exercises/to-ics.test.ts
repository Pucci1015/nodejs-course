// 練習問題8 のテスト
// 使い方: node --test to-ics.test.ts
//   模範解答を試す: MODULE=../solutions/to-ics.ts node --test to-ics.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './to-ics.ts');
const mod: typeof import('./to-ics.ts') = await import(pathToFileURL(file).href);
const { toIcs } = mod;

const NOW = new Date('2026-12-09T00:00:00Z');
const one = {
  id: 7,
  roomName: '会議室A',
  title: '定例',
  startsAt: '2026-12-10T01:00:00.000Z',
  endsAt: '2026-12-10T02:00:00.000Z',
};

test('予約1つの形（行の終わりは CRLF）', () => {
  assert.equal(
    toIcs([one], { now: NOW, host: 'rooms.example.com' }),
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//room-booking//JA',
      'BEGIN:VEVENT',
      'UID:booking-7@rooms.example.com',
      'DTSTAMP:20261209T000000Z',
      'DTSTART:20261210T010000Z',
      'DTEND:20261210T020000Z',
      'SUMMARY:定例',
      'LOCATION:会議室A',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n'),
  );
});

test('予約が無ければ VEVENT なし。2つなら2つ', () => {
  const lines = (s: string) => s.split('\r\n');
  assert.deepEqual(lines(toIcs([], { now: NOW, host: 'h' })), [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//room-booking//JA',
    'END:VCALENDAR',
    '',
  ]);
  const two = toIcs([one, { ...one, id: 8 }], { now: NOW, host: 'h' });
  assert.equal(lines(two).filter((l) => l === 'BEGIN:VEVENT').length, 2);
  assert.ok(two.includes('UID:booking-8@h\r\n'));
});

test('題名の \\ ; , と改行をエスケープする', () => {
  const ics = toIcs([{ ...one, title: 'A;B,C\\D\nE' }], { now: NOW, host: 'h' });
  assert.ok(ics.includes('SUMMARY:A\\;B\\,C\\\\D\\nE\r\n'), ics);
});

test('75 バイトを超える行は、文字を切らずに折り返す', () => {
  const title = 'あ'.repeat(40); // 120 バイト。'SUMMARY:' と合わせて 128 バイト
  const ics = toIcs([{ ...one, title }], { now: NOW, host: 'h' });
  const lines = ics.split('\r\n');
  const i = lines.findIndex((l) => l.startsWith('SUMMARY:'));
  const first = lines[i] ?? '';
  const second = lines[i + 1] ?? '';
  for (const l of [first, second]) assert.ok(Buffer.byteLength(l) <= 75, `${Buffer.byteLength(l)} バイト: ${l}`);
  assert.ok(second.startsWith(' '), '続きの行は空白で始まる');
  assert.equal(first + second.slice(1), `SUMMARY:${title}`, 'つなぎ直すと元の行');
  assert.ok(!lines.some((l) => l.includes('\uFFFD')), '文字が壊れていない');
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
