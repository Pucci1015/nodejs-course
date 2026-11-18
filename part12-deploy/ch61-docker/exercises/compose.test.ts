// 練習問題7 のテスト: compose.yaml を確かめる
// 使い方: node --test compose.test.ts
//   模範解答を試す: MODULE=../solutions/compose.yaml node --test compose.test.ts
//   本当に動かして確かめるときは、Docker を動かしてから DOCKER=1 node --test compose.test.ts（練習問題8の Dockerfile も要る）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'yaml';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './compose.yaml');
const text = await readFile(file, 'utf8').catch(() => '');
type Service = {
  image?: string;
  build?: unknown;
  environment?: Record<string, string> | string[];
  ports?: string[];
  depends_on?: Record<string, { condition?: string }> | string[];
  healthcheck?: { test?: unknown };
  restart?: string;
  volumes?: string[];
};
const doc = (parse(text) ?? {}) as { name?: string; services?: Record<string, Service>; volumes?: Record<string, unknown> };
const services = doc.services ?? {};
const env = (s: Service | undefined): Record<string, string> =>
  Array.isArray(s?.environment)
    ? Object.fromEntries(s.environment.map((e) => [e.split('=')[0] ?? '', e.slice(e.indexOf('=') + 1)]))
    : (s?.environment ?? {});

test('name は ch61-exercise、サービスは db・redis・app の3つ', () => {
  assert.equal(doc.name, 'ch61-exercise');
  assert.deepEqual(Object.keys(services).sort(), ['app', 'db', 'redis']);
});

test('db: postgres:18、pg_isready の healthcheck、ports を書かない（外に出さない）', () => {
  const db = services.db;
  assert.equal(db?.image, 'postgres:18');
  assert.match(JSON.stringify(db?.healthcheck?.test ?? ''), /pg_isready/);
  assert.equal(db?.ports, undefined);
  assert.equal(env(db).POSTGRES_PASSWORD, 'dev-only-password');
});

test('db: データをボリューム pgdata（/var/lib/postgresql）に置く', () => {
  assert.ok((services.db?.volumes ?? []).includes('pgdata:/var/lib/postgresql'));
  assert.ok(doc.volumes !== undefined && 'pgdata' in doc.volumes);
});

test('redis: redis:8、redis-cli ping の healthcheck、ports を書かない', () => {
  const redis = services.redis;
  assert.equal(redis?.image, 'redis:8');
  assert.match(JSON.stringify(redis?.healthcheck?.test ?? ''), /redis-cli.*ping/);
  assert.equal(redis?.ports, undefined);
});

test('app: build は ./app、ポートは 127.0.0.1:9817 だけ', () => {
  const app = services.app;
  assert.equal(app?.build, './app');
  assert.deepEqual(app?.ports, ['127.0.0.1:9817:9817']);
});

test('app: DATABASE_URL と REDIS_URL は、サービスの名前（db・redis）でつなぐ', () => {
  const e = env(services.app);
  assert.equal(e.DATABASE_URL, 'postgres://app:dev-only-password@db:5432/app');
  assert.equal(e.REDIS_URL, 'redis://redis:6379');
});

test('app: db と redis の healthcheck が通ってから起動。落ちたら起動し直す', () => {
  const app = services.app;
  assert.deepEqual(app?.depends_on, { db: { condition: 'service_healthy' }, redis: { condition: 'service_healthy' } });
  assert.equal(app?.restart, 'unless-stopped');
});

const docker = process.env.DOCKER === '1';
test('（DOCKER=1 のとき）docker compose up で、/readyz が ok', { skip: !docker && 'DOCKER=1 のときだけ' }, async () => {
  const run = promisify(execFile);
  const opts = { cwd: path.dirname(file), timeout: 600_000 };
  try {
    await run('docker', ['compose', '-f', file, 'up', '-d', '--build', '--wait'], opts);
    const res = await fetch('http://127.0.0.1:9817/readyz');
    assert.equal(res.status, 200);
  } finally {
    await run('docker', ['compose', '-f', file, 'down', '-v'], opts).catch(() => {});
  }
});
