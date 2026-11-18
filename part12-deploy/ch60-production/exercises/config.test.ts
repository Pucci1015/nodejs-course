// 練習問題1 のテスト
// 使い方: node --test config.test.ts
//   模範解答を試す: MODULE=../solutions/config.ts node --test config.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './config.ts');
const { loadConfig, ConfigError, DEV_DATABASE_URL, DEV_SESSION_SECRET }: typeof import('./config.ts') = await import(pathToFileURL(file).href);

const SECRET_A = 'dev-only-secret-aaaaaaaaaaaaaaaaaaaaaaaa';
const SECRET_B = 'dev-only-secret-bbbbbbbbbbbbbbbbbbbbbbbb';
const DB = 'postgres://app:dev-only-password@db.internal:5432/taskapi';

/** loadConfig が ConfigError を投げ、その names が expected であることを確かめる */
function assertNames(env: Record<string, string | undefined>, expected: string[]) {
  assert.throws(
    () => loadConfig(env),
    (err: unknown) => {
      assert.ok(err instanceof ConfigError, `ConfigError ではありません: ${String(err)}`);
      assert.deepEqual([...err.names].sort(), [...expected].sort());
      return true;
    },
  );
}

test('何も無ければ、開発の既定の値', () => {
  assert.deepEqual(loadConfig({}), {
    env: 'development',
    port: 9807,
    sessionSecrets: [DEV_SESSION_SECRET],
    databaseUrl: DEV_DATABASE_URL,
  });
});

test('PORT は数字だけ・0〜65535', () => {
  assert.equal(loadConfig({ PORT: '8080' }).port, 8080);
  assert.equal(loadConfig({ PORT: '0' }).port, 0);
  for (const bad of ['abc', '80a', '-1', '65536', '1e3']) assertNames({ PORT: bad }, ['PORT']);
});

test('SESSION_SECRETS はカンマ区切り。空白を除き、どれも 32 文字以上', () => {
  assert.deepEqual(loadConfig({ SESSION_SECRETS: `${SECRET_A}, ${SECRET_B}` }).sessionSecrets, [SECRET_A, SECRET_B]);
  assertNames({ SESSION_SECRETS: `${SECRET_A},short` }, ['SESSION_SECRETS']);
  assertNames({ SESSION_SECRETS: `${SECRET_A},,${SECRET_B}` }, ['SESSION_SECRETS']);
});

test('本番では SESSION_SECRETS と DATABASE_URL が必須（両方の名前を一度に知らせる）', () => {
  assertNames({ NODE_ENV: 'production' }, ['SESSION_SECRETS', 'DATABASE_URL']);
  assertNames({ NODE_ENV: 'production', DATABASE_URL: DB }, ['SESSION_SECRETS']);
  assert.deepEqual(loadConfig({ NODE_ENV: 'production', SESSION_SECRETS: SECRET_A, DATABASE_URL: DB }), {
    env: 'production',
    port: 9807,
    sessionSecrets: [SECRET_A],
    databaseUrl: DB,
  });
});

test('空の文字列（.env に「PORT=」と書いた）は、書かなかったのと同じ', () => {
  assert.equal(loadConfig({ PORT: '', SESSION_SECRETS: '' }).port, 9807);
  assertNames({ NODE_ENV: 'production', SESSION_SECRETS: '', DATABASE_URL: DB }, ['SESSION_SECRETS']);
});

test('DATABASE_URL は postgres:// か postgresql:// で始まる', () => {
  assertNames({ DATABASE_URL: 'mysql://x@y/z' }, ['DATABASE_URL']);
  assert.equal(loadConfig({ DATABASE_URL: 'postgresql://a@b/c' }).databaseUrl, 'postgresql://a@b/c');
});

test('NODE_ENV は development・test・production のどれか', () => {
  assertNames({ NODE_ENV: 'prod' }, ['NODE_ENV']);
  assert.equal(loadConfig({ NODE_ENV: 'test' }).env, 'test');
});

test('エラーのメッセージに、値（秘密）が入らない', () => {
  try {
    loadConfig({ SESSION_SECRETS: 'dev-only-tooshort', DATABASE_URL: 'mysql://user:dev-only-pass@h/d' });
    assert.fail('投げませんでした');
  } catch (err) {
    assert.ok(err instanceof ConfigError);
    assert.doesNotMatch(err.message, /dev-only-tooshort|dev-only-pass/);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
