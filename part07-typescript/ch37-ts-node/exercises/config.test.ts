// 練習問題2 のテスト
// 使い方: node --test config.test.ts
//   模範解答を試す: MODULE=../solutions/config.ts node --test config.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './config.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('何も無ければ決まりの値', () => {
  assert.deepEqual(m.loadConfig({}), { port: 9470, host: '127.0.0.1', logLevel: 'info', env: 'development', databaseUrl: null });
});

test('全部を読む', () => {
  assert.deepEqual(
    m.loadConfig({ PORT: '8080', HOST: '0.0.0.0', LOG_LEVEL: 'debug', NODE_ENV: 'production', DATABASE_URL: 'postgres://db/app', OTHER: 'x' }),
    { port: 8080, host: '0.0.0.0', logLevel: 'debug', env: 'production', databaseUrl: 'postgres://db/app' },
  );
});

test('空の文字列は「無い」と同じ', () => {
  assert.deepEqual(m.loadConfig({ PORT: '', LOG_LEVEL: '', DATABASE_URL: '' }), m.loadConfig({}));
});

test('間違いを全部集めて ConfigError', () => {
  try {
    m.loadConfig({ PORT: '99999', LOG_LEVEL: 'verbose', NODE_ENV: 'staging' });
    assert.fail('投げるはず');
  } catch (err) {
    assert.ok(err instanceof m.ConfigError);
    assert.deepEqual((err as { problems: string[] }).problems, [
      'PORT は 1〜65535 の整数です（99999）',
      'LOG_LEVEL は debug・info・warn・error のどれかです（verbose）',
      'NODE_ENV は development・test・production のどれかです（staging）',
    ]);
  }
});

test('production では DATABASE_URL が必須', () => {
  assert.throws(() => m.loadConfig({ NODE_ENV: 'production' }), (err: { problems: string[] }) => {
    assert.deepEqual((err as { problems: string[] }).problems, ['production では DATABASE_URL が必須です']);
    return true;
  });
  assert.throws(() => m.loadConfig({ PORT: '1.5' }), /PORT は 1〜65535 の整数です（1\.5）/);
  assert.throws(() => m.loadConfig({ PORT: 'abc' }), /PORT は/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: any と as を使っていない', () => {
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
