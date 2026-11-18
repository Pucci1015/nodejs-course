// 練習問題3 のテスト
// 使い方: node --test smtp-reply.test.ts
//   模範解答を試す: MODULE=../solutions/smtp-reply.ts node --test smtp-reply.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './smtp-reply.ts');
const { parseReply }: typeof import('./smtp-reply.ts') = await import(pathToFileURL(file).href);

test('1行の応答', () => {
  assert.deepEqual(parseReply('250 2.1.0 OK\r\n'), { code: 250, kind: 'ok', lines: ['2.1.0 OK'] });
  assert.deepEqual(parseReply('354 End data with <CR><LF>.<CR><LF>\r\n'), {
    code: 354,
    kind: 'intermediate',
    lines: ['End data with <CR><LF>.<CR><LF>'],
  });
});

test('複数行の応答（最後の行だけ空白、それ以外は -）', () => {
  assert.deepEqual(parseReply('250-fake-smtp\r\n250-8BITMIME\r\n250 SIZE 10485760\r\n'), {
    code: 250,
    kind: 'ok',
    lines: ['fake-smtp', '8BITMIME', 'SIZE 10485760'],
  });
});

test('4xx は temporary、5xx は permanent', () => {
  assert.equal(parseReply('451 4.3.0 try later\r\n')?.kind, 'temporary');
  assert.equal(parseReply('550 5.1.1 no such user\r\n')?.kind, 'permanent');
});

test('文の無い「250」だけの行も読める。最後の CRLF が無くてもよい', () => {
  assert.deepEqual(parseReply('250\r\n'), { code: 250, kind: 'ok', lines: [''] });
  assert.deepEqual(parseReply('221 Bye'), { code: 221, kind: 'ok', lines: ['Bye'] });
});

test('おかしな応答は null', () => {
  const bad = [
    '',
    'hello\r\n',
    '25 OK\r\n',
    '650 what\r\n',
    '250-a\r\n251 b\r\n', // 途中で番号が変わる
    '250-a\r\n250-b\r\n', // 最後の行が - のまま（まだ続きがある）
    '250 a\r\n250 b\r\n', // 途中の行が空白（そこで終わっているはず）
    '250+a\r\n',
  ];
  for (const text of bad) assert.equal(parseReply(text), null, JSON.stringify(text));
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
