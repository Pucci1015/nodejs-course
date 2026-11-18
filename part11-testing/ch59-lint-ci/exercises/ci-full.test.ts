// 練習問題6のテスト（書き換えなくてよい）: node --test ci-full.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './ci-full.yml');
const doc: unknown = parse(await readFile(file, 'utf8'));

function at(value: unknown, route: string): unknown {
  let current = value;
  for (const key of route.split('.')) {
    if (current === null || typeof current !== 'object' || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** ジョブの手順を、uses か run の文字列の配列にする */
function stepNames(job: string): unknown[] {
  const steps = at(doc, `jobs.${job}.steps`);
  assert.ok(Array.isArray(steps), `jobs.${job}.steps が配列ではありません`);
  return steps.map((s) => at(s, 'uses') ?? at(s, 'run'));
}

test('問題3と同じ: push・プルリクエストで動き、読むことだけを許す', () => {
  assert.deepEqual(at(doc, 'on.push'), { branches: ['main'] });
  assert.deepEqual(at(doc, 'permissions'), { contents: 'read' });
});

test('同じブランチで新しく動いたら、古いほうを止める', () => {
  assert.deepEqual(at(doc, 'concurrency'), { group: 'ci-${{ github.ref }}', 'cancel-in-progress': true });
});

test('check: PostgreSQL 18 をサービスとして動かす', () => {
  assert.equal(at(doc, 'jobs.check.services.postgres.image'), 'postgres:18');
  assert.deepEqual(at(doc, 'jobs.check.services.postgres.env'), {
    POSTGRES_USER: 'app',
    POSTGRES_PASSWORD: 'dev-only-password',
    POSTGRES_DB: 'taskapi',
  });
  assert.deepEqual(at(doc, 'jobs.check.services.postgres.ports'), ['5433:5432']);
  const options = at(doc, 'jobs.check.services.postgres.options');
  assert.ok(typeof options === 'string' && options.includes('--health-cmd pg_isready'), 'options に --health-cmd pg_isready がありません');
});

test('check: ジョブの環境変数 DATABASE_URL で、テストに PostgreSQL の場所を渡す', () => {
  assert.equal(at(doc, 'jobs.check.env.DATABASE_URL'), 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi');
});

test('check: 手順は問題3と同じ', () => {
  assert.deepEqual(stepNames('check'), ['actions/checkout@v5', 'actions/setup-node@v5', 'npm ci --ignore-scripts', 'npm run check']);
});

test('e2e: check が通ってから動き、15 分で打ち切る', () => {
  const needs = at(doc, 'jobs.e2e.needs');
  assert.ok(needs === 'check' || (Array.isArray(needs) && needs.includes('check')), 'e2e の needs に check がありません');
  assert.equal(at(doc, 'jobs.e2e.runs-on'), 'ubuntu-latest');
  assert.equal(at(doc, 'jobs.e2e.timeout-minutes'), 15);
});

test('e2e: ブラウザを入れてから Playwright のテストを動かす', () => {
  assert.deepEqual(stepNames('e2e').slice(0, 5), [
    'actions/checkout@v5',
    'actions/setup-node@v5',
    'npm ci --ignore-scripts',
    'npx playwright install --with-deps chromium',
    'npx playwright test',
  ]);
});

test('e2e: 失敗したときだけ、test-results を 7 日間残す', () => {
  const steps = at(doc, 'jobs.e2e.steps');
  assert.ok(Array.isArray(steps));
  const upload = steps.find((s) => at(s, 'uses') === 'actions/upload-artifact@v4');
  assert.ok(upload !== undefined, 'actions/upload-artifact@v4 の手順がありません');
  assert.ok(['failure()', '${{ failure() }}'].includes(String(at(upload, 'if'))), 'if: failure() がありません');
  assert.deepEqual(at(upload, 'with'), { name: 'playwright-results', path: 'test-results', 'retention-days': 7 });
});
