// 練習問題3のテスト（書き換えなくてよい）: node --test ci.test.ts
// ci.yml を YAML として読み、決まりどおりの形かを確かめる（GitHub で動かすわけではない）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './ci.yml');
const doc: unknown = parse(await readFile(file, 'utf8'));

/** 'jobs.check.steps' のような道をたどって、値を取り出す */
function at(value: unknown, route: string): unknown {
  let current = value;
  for (const key of route.split('.')) {
    if (current === null || typeof current !== 'object' || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

test('名前は CI', () => {
  assert.equal(at(doc, 'name'), 'CI');
});

test('main への push と、プルリクエストで動く', () => {
  assert.deepEqual(at(doc, 'on.push'), { branches: ['main'] });
  const on = at(doc, 'on');
  assert.ok(on !== null && typeof on === 'object' && 'pull_request' in on, 'on に pull_request がありません');
});

test('GITHUB_TOKEN には、読むことだけを許す', () => {
  assert.deepEqual(at(doc, 'permissions'), { contents: 'read' });
});

test('ジョブ check は ubuntu-latest で、10 分で打ち切る', () => {
  assert.equal(at(doc, 'jobs.check.runs-on'), 'ubuntu-latest');
  assert.equal(at(doc, 'jobs.check.timeout-minutes'), 10);
});

test('手順は checkout → setup-node → npm ci → npm run check', () => {
  const steps = at(doc, 'jobs.check.steps');
  assert.ok(Array.isArray(steps), 'jobs.check.steps が配列ではありません');
  assert.deepEqual(
    steps.map((s) => at(s, 'uses') ?? at(s, 'run')),
    ['actions/checkout@v5', 'actions/setup-node@v5', 'npm ci --ignore-scripts', 'npm run check'],
  );
  assert.deepEqual(at(steps[1], 'with'), { 'node-version': 24, cache: 'npm' });
});
