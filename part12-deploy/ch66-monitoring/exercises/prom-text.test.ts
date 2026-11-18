// 練習問題3 のテスト
// 使い方: node --test prom-text.test.ts
//   模範解答を試す: MODULE=../solutions/prom-text.ts node --test prom-text.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './prom-text.ts');
const { formatCounter }: typeof import('./prom-text.ts') = await import(pathToFileURL(file).href);

test('HELP・TYPE の行と、ラベルの組ごとの行。最後は改行', () => {
  const text = formatCounter('http_requests_total', 'リクエストの数', [
    { labels: { method: 'GET', status: '200' }, value: 2 },
    { labels: { method: 'GET', status: '500' }, value: 1 },
  ]);
  assert.equal(
    text,
    '# HELP http_requests_total リクエストの数\n# TYPE http_requests_total counter\n' +
      'http_requests_total{method="GET",status="200"} 2\nhttp_requests_total{method="GET",status="500"} 1\n',
  );
});

test('ラベルは名前の順に並べる（書いた順によらず、同じ行になる）', () => {
  const a = formatCounter('x_total', 'x', [{ labels: { status: '200', method: 'GET' }, value: 1 }]);
  assert.match(a, /^x_total\{method="GET",status="200"\} 1$/m);
});

test('ラベルが無ければ { } を書かない', () => {
  assert.match(formatCounter('jobs_total', '仕事', [{ labels: {}, value: 5 }]), /^jobs_total 5$/m);
});

test('ラベルの値の \\ と " と改行をエスケープする', () => {
  const text = formatCounter('x_total', 'x', [{ labels: { path: 'C:\\tmp "a"\nb' }, value: 1 }]);
  assert.match(text, /^x_total\{path="C:\\\\tmp \\"a\\"\\nb"\} 1$/m);
});

test('HELP の中の \\ と改行もエスケープする', () => {
  assert.match(formatCounter('x_total', '1 行目\n2 行目', []), /^# HELP x_total 1 行目\\n2 行目$/m);
});

test('名前・ラベルの名前が正しくなければ例外（__ で始まるラベルは予約）', () => {
  assert.throws(() => formatCounter('http-requests', 'x', []), /name/);
  assert.throws(() => formatCounter('1st_total', 'x', []), /name/);
  assert.throws(() => formatCounter('x_total', 'x', [{ labels: { 'bad-name': 'a' }, value: 1 }]), /ラベル/);
  assert.throws(() => formatCounter('x_total', 'x', [{ labels: { __name__: 'a' }, value: 1 }]), /ラベル/);
});

test('カウンタの値は 0 以上の数', () => {
  assert.throws(() => formatCounter('x_total', 'x', [{ labels: {}, value: -1 }]), /value/);
  assert.throws(() => formatCounter('x_total', 'x', [{ labels: {}, value: Number.NaN }]), /value/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
