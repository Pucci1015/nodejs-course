// 練習問題3 のテスト。files/render.yaml はアプリの render.yaml のコピー
// 使い方: node --test missing-env.test.ts
//   模範解答を試す: MODULE=../solutions/missing-env.ts node --test missing-env.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './missing-env.ts');
const mod: typeof import('./missing-env.ts') = await import(pathToFileURL(file).href);
const { envKeysOf, missingEnv, REQUIRED_IN_PRODUCTION } = mod;

const text = await readFile(path.join(import.meta.dirname, 'files/render.yaml'), 'utf8');
const blueprint: unknown = parse(text);

test('envKeysOf: サービスの分とグループの分を、重なりなしで順に', () => {
  assert.deepEqual(envKeysOf(blueprint, 'room-booking-worker'), [
    'APP_URL',
    'DATABASE_URL',
    'MAIL_FROM',
    'METRICS_TOKEN',
    'NODE_ENV',
    'REDIS_URL',
    'REMINDER_CRON',
    'SESSION_SECRET',
    'SMTP_HOST',
    'SMTP_PASS',
    'SMTP_PORT',
    'SMTP_USER',
  ]);
  const small = {
    envVarGroups: [{ name: 'g', envVars: [{ key: 'B', value: '1' }, { key: 'A' }] }],
    services: [{ name: 's', envVars: [{ fromGroup: 'g' }, { key: 'A', value: '2' }, { key: 'C' }] }],
  };
  assert.deepEqual(envKeysOf(small, 's'), ['A', 'B', 'C'], 'A は2回あっても1つ');
  assert.deepEqual(envKeysOf({ services: [{ name: 'empty' }] }, 'empty'), [], 'envVars もグループも無い');
});

test('missingEnv: 今の render.yaml は、どちらのサービスにも全部渡る', () => {
  assert.deepEqual(missingEnv(blueprint, 'room-booking', REQUIRED_IN_PRODUCTION), []);
  assert.deepEqual(missingEnv(blueprint, 'room-booking-worker', REQUIRED_IN_PRODUCTION), []);
});

test('missingEnv: ワーカーに REDIS_URL を書き忘れると見つかる', () => {
  const broken = parse(text.replace(/( {6}- key: REDIS_URL\n(?: {8}.*\n)+)(?![\s\S]*- key: REDIS_URL)/, ''));
  assert.deepEqual(missingEnv(broken, 'room-booking', REQUIRED_IN_PRODUCTION), []);
  assert.deepEqual(missingEnv(broken, 'room-booking-worker', REQUIRED_IN_PRODUCTION), ['REDIS_URL']);
  assert.deepEqual(missingEnv(blueprint, 'room-booking', ['STATIC_DIR', 'NODE_ENV', 'APP_VERSION']), [
    'STATIC_DIR',
    'APP_VERSION',
  ]);
});

test('サービスやグループが無ければ投げる。形が違えば投げる', () => {
  assert.throws(() => envKeysOf(blueprint, 'room-booking-api'), /room-booking-api/);
  assert.throws(() => envKeysOf({ services: [{ name: 's', envVars: [{ fromGroup: 'nope' }] }] }, 's'), /nope/);
  assert.throws(() => envKeysOf({ services: 'room-booking' }, 'room-booking'));
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
