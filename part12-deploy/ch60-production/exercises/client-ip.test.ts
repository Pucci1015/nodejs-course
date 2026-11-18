// 練習問題3 のテスト
// 使い方: node --test client-ip.test.ts
//   模範解答を試す: MODULE=../solutions/client-ip.ts node --test client-ip.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './client-ip.ts');
const { clientIp }: typeof import('./client-ip.ts') = await import(pathToFileURL(file).href);

// 例の IP アドレスは、説明用の 192.0.2.0/24・198.51.100.0/24・203.0.113.0/24（RFC 5737）
test('プロキシを信じない（0 段）: つながってきた相手', () => {
  assert.equal(clientIp({ remoteAddress: '203.0.113.5', forwardedFor: '192.0.2.10', trustedHops: 0 }), '203.0.113.5');
});

test('1 段: X-Forwarded-For のいちばん右', () => {
  assert.equal(clientIp({ remoteAddress: '10.0.0.2', forwardedFor: '192.0.2.10', trustedHops: 1 }), '192.0.2.10');
});

test('1 段で、客が X-Forwarded-For を書いてきても、プロキシが足した右端を使う', () => {
  assert.equal(
    clientIp({ remoteAddress: '10.0.0.2', forwardedFor: '198.51.100.99, 192.0.2.10', trustedHops: 1 }),
    '192.0.2.10',
  );
});

test('2 段: 右から2つ目', () => {
  assert.equal(
    clientIp({ remoteAddress: '10.0.0.3', forwardedFor: '198.51.100.99, 192.0.2.10, 10.0.0.2', trustedHops: 2 }),
    '192.0.2.10',
  );
});

test('段の数がヘッダより多いときは、いちばん左', () => {
  assert.equal(clientIp({ remoteAddress: '10.0.0.2', forwardedFor: '192.0.2.10', trustedHops: 5 }), '192.0.2.10');
  assert.equal(clientIp({ remoteAddress: '10.0.0.2', forwardedFor: undefined, trustedHops: 1 }), '10.0.0.2');
});

test('空白と空の要素は無視する', () => {
  assert.equal(clientIp({ remoteAddress: '10.0.0.2', forwardedFor: ' 192.0.2.10 ,, ', trustedHops: 1 }), '192.0.2.10');
});

test('IPv4 を写した IPv6（::ffff:）は IPv4 に直す', () => {
  assert.equal(clientIp({ remoteAddress: '::ffff:203.0.113.5', forwardedFor: undefined, trustedHops: 0 }), '203.0.113.5');
  assert.equal(clientIp({ remoteAddress: '10.0.0.2', forwardedFor: '::ffff:192.0.2.10', trustedHops: 1 }), '192.0.2.10');
  assert.equal(clientIp({ remoteAddress: '2001:db8::1', forwardedFor: undefined, trustedHops: 0 }), '2001:db8::1');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
