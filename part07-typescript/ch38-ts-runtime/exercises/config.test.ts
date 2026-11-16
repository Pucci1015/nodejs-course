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
  assert.deepEqual(m.loadConfig({}), { port: 9480, host: '127.0.0.1', logLevel: 'info', env: 'development', databaseUrl: null });
});

test('全部を読む。知らない環境変数は無視する', () => {
  assert.deepEqual(
    m.loadConfig({ PORT: '8080', HOST: '0.0.0.0', LOG_LEVEL: 'debug', NODE_ENV: 'production', DATABASE_URL: 'postgres://db/app', OTHER: 'x' }),
    { port: 8080, host: '0.0.0.0', logLevel: 'debug', env: 'production', databaseUrl: 'postgres://db/app' },
  );
});

test('空の文字列は「無い」と同じ', () => {
  assert.deepEqual(m.loadConfig({ PORT: '', HOST: '', LOG_LEVEL: '', NODE_ENV: '', DATABASE_URL: '' }), m.loadConfig({}));
});

/** loadConfig が投げた ConfigError の problems */
function problemsOf(env: Record<string, string>): string[] {
  try {
    m.loadConfig(env);
  } catch (err) {
    assert.ok(err instanceof m.ConfigError, 'ConfigError を投げる');
    return (err as { problems: string[] }).problems;
  }
  assert.fail('投げるはず');
}

test('間違っている環境変数の名前を、全部集めて ConfigError', () => {
  assert.deepEqual(problemsOf({ PORT: '99999', LOG_LEVEL: 'verbose', NODE_ENV: 'staging' }), ['PORT', 'LOG_LEVEL', 'NODE_ENV']);
  for (const port of ['0', '1.5', 'abc', '-1', '80 ', '123456']) assert.deepEqual(problemsOf({ PORT: port }), ['PORT'], port);
});

test('production では DATABASE_URL が必須。値はエラーの文に書かない', () => {
  assert.deepEqual(problemsOf({ NODE_ENV: 'production' }), ['DATABASE_URL']);
  try {
    m.loadConfig({ PORT: 'dev-only-password' });
  } catch (err) {
    assert.doesNotMatch(String(err), /dev-only-password/);
  }
});

test('型: tsc のエラーが無い（config.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: Zod で確かめ、型はスキーマから作る。any と as を使っていない', () => {
  assert.match(code, /from 'zod'/);
  assert.match(code, /z\.infer|z\.output/);
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
