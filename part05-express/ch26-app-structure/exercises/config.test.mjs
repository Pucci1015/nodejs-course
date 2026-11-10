// 練習問題5のテスト
// 使い方: node --test config.test.mjs
//         MODULE=../solutions/config.mjs node --test config.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { loadConfig, ConfigError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './config.mjs')).href);

const SECRET = 'dev-only-secret-for-config-test-0123456789';

/** ConfigError になることと、間違っている名前の一覧を確かめる */
function fails(env, names) {
  let err;
  try {
    loadConfig(env);
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof ConfigError, `${JSON.stringify(env)} は ConfigError になるはず`);
  assert.deepEqual([...new Set(err.issues.map((i) => i.name))].sort(), [...names].sort());
  return err;
}

test('1. 何も無ければ、開発のときの既定の値', () => {
  assert.deepEqual({ ...loadConfig({}) }, {
    env: 'development',
    host: '127.0.0.1',
    port: 3000,
    logLevel: 'info',
    corsOrigins: [],
    sessionSecret: undefined,
    shutdownDelayMs: 0,
    shutdownTimeoutMs: 10000,
  });
});

test('2. 正しい値を読む。知らない名前（PATH など）は気にしない', () => {
  const c = loadConfig({
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: '8080',
    LOG_LEVEL: 'warn',
    CORS_ORIGINS: 'https://tasks.example.com, http://localhost:5173',
    SESSION_SECRET: SECRET,
    SHUTDOWN_DELAY_MS: '3000',
    SHUTDOWN_TIMEOUT_MS: '5000',
    PATH: '/usr/bin',
    HOME: '/Users/alice',
  });
  assert.equal(c.port, 8080);
  assert.equal(c.logLevel, 'warn');
  assert.deepEqual([...c.corsOrigins], ['https://tasks.example.com', 'http://localhost:5173']);
  assert.equal(c.shutdownDelayMs, 3000);
  assert.equal(c.shutdownTimeoutMs, 5000);
});

test('3. PORT は 0〜65535 の、数字だけの文字列', () => {
  for (const PORT of ['abc', '-1', '65536', '80.5', '0x50', ' 80', '1e3']) fails({ PORT }, ['PORT']);
  assert.equal(loadConfig({ PORT: '0' }).port, 0); // 0 は「空いている番号」（テストで使う）
});

test('4. 間違いは、すべて集めてから投げる', () => {
  fails({ PORT: 'abc', LOG_LEVEL: 'loud', NODE_ENV: 'prod', SHUTDOWN_TIMEOUT_MS: '99999999' }, ['PORT', 'LOG_LEVEL', 'NODE_ENV', 'SHUTDOWN_TIMEOUT_MS']);
});

test('5. 本番では SESSION_SECRET が必須。開発では無くてよい', () => {
  fails({ NODE_ENV: 'production' }, ['SESSION_SECRET']);
  assert.equal(loadConfig({ NODE_ENV: 'development' }).sessionSecret, undefined);
});

test('6. SESSION_SECRET は 32 文字以上。エラーの文に、値そのものを書かない', () => {
  const err = fails({ SESSION_SECRET: 'short-secret-value' }, ['SESSION_SECRET']);
  assert.ok(!err.message.includes('short-secret-value'), 'エラーの文に秘密の値が入っている');
  assert.ok(!JSON.stringify(err.issues).includes('short-secret-value'), 'issues に秘密の値が入っている');
  assert.ok(err.message.includes('SESSION_SECRET'), 'エラーの文に名前が無い');
});

test('7. CORS_ORIGINS はオリジンだけ（パス・最後の /・http(s) 以外はだめ）', () => {
  for (const CORS_ORIGINS of ['http://localhost:5173/', 'https://example.com/app', 'ftp://example.com', 'localhost:5173', '*']) {
    fails({ CORS_ORIGINS }, ['CORS_ORIGINS']);
  }
  assert.deepEqual([...loadConfig({ CORS_ORIGINS: ' , http://localhost:5173 ,' }).corsOrigins], ['http://localhost:5173']);
});

test('8. 空の文字列（.env の「PORT=」）は、書かなかったのと同じ', () => {
  const c = loadConfig({ PORT: '', LOG_LEVEL: '', CORS_ORIGINS: '' });
  assert.equal(c.port, 3000);
  assert.equal(c.logLevel, 'info');
});

test('9. LOG_LEVEL の既定は、テストのときだけ silent', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test' }).logLevel, 'silent');
  assert.equal(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }).logLevel, 'debug');
});

test('10. 返す設定は、後から書き換えられない', () => {
  const c = loadConfig({ CORS_ORIGINS: 'http://localhost:5173' });
  assert.ok(Object.isFrozen(c));
  assert.ok(Object.isFrozen(c.corsOrigins));
});
