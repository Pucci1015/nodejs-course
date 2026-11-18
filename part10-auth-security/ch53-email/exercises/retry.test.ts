// 練習問題6 のテスト
// 使い方: node --test retry.test.ts
//   模範解答を試す: MODULE=../solutions/retry.ts node --test retry.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Mail } from './mailer.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './retry.ts');
const { isTransient, sendWithRetry }: typeof import('./retry.ts') = await import(pathToFileURL(file).href);

const mail: Mail = { to: 'alice@example.com', subject: 'テスト', text: 'テスト' };

/** nodemailer のエラーと同じ形のものを作る */
function smtpError(fields: Record<string, unknown>) {
  return Object.assign(new Error('送れませんでした'), fields);
}

/** 決めた順に失敗・成功する send と、待った時間の記録 */
function script(results: (Error | 'ok')[]) {
  const calls: Mail[] = [];
  const slept: number[] = [];
  const send = async (m: Mail) => {
    calls.push(m);
    const r = results.shift();
    if (r !== 'ok' && r !== undefined) throw r;
  };
  const sleep = async (ms: number) => {
    slept.push(ms);
  };
  return { send, sleep, calls, slept };
}

test('isTransient: permanent があれば、それで決める', () => {
  assert.equal(isTransient(smtpError({ code: 'EENVELOPE', responseCode: 451, permanent: false })), true);
  assert.equal(isTransient(smtpError({ code: 'EENVELOPE', responseCode: 550, permanent: true })), false);
});

test('isTransient: permanent が無ければ responseCode の 4xx', () => {
  assert.equal(isTransient(smtpError({ responseCode: 421 })), true);
  assert.equal(isTransient(smtpError({ responseCode: 554 })), false);
});

test('isTransient: 応答が無ければ code が ESOCKET・ETIMEDOUT・ECONNECTION のとき', () => {
  assert.equal(isTransient(smtpError({ code: 'ESOCKET' })), true);
  assert.equal(isTransient(smtpError({ code: 'ETIMEDOUT' })), true);
  assert.equal(isTransient(smtpError({ code: 'ECONNECTION' })), true);
  assert.equal(isTransient(smtpError({ code: 'EAUTH' })), false);
  assert.equal(isTransient(new Error('ふつうのエラー')), false);
  assert.equal(isTransient('文字列'), false);
  assert.equal(isTransient(null), false);
});

test('一度で送れたら 1 を返し、待たない', async () => {
  const s = script(['ok']);
  assert.equal(await sendWithRetry(s.send, mail, { sleep: s.sleep }), 1);
  assert.deepEqual(s.slept, []);
});

test('一時的な失敗は、1秒・2秒…と待ってやり直す', async () => {
  const s = script([smtpError({ code: 'ESOCKET' }), smtpError({ responseCode: 451, permanent: false }), 'ok']);
  assert.equal(await sendWithRetry(s.send, mail, { sleep: s.sleep }), 3);
  assert.deepEqual(s.slept, [1000, 2000]);
  assert.equal(s.calls.length, 3);
  assert.equal(s.calls[0], mail);
});

test('ずっと失敗するものは、やり直さずにそのエラーを投げる', async () => {
  const err = smtpError({ responseCode: 550, permanent: true });
  const s = script([err, 'ok']);
  await assert.rejects(sendWithRetry(s.send, mail, { sleep: s.sleep }), (e) => e === err);
  assert.equal(s.calls.length, 1);
});

test('retries 回やり直してもだめなら、最後のエラーを投げる（baseDelayMs も効く）', async () => {
  const errors = [1, 2, 3].map((n) => smtpError({ code: 'ETIMEDOUT', n }));
  const s = script([...errors]);
  await assert.rejects(sendWithRetry(s.send, mail, { retries: 2, baseDelayMs: 10, sleep: s.sleep }), (e) => e === errors[2]);
  assert.equal(s.calls.length, 3);
  assert.deepEqual(s.slept, [10, 20]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
