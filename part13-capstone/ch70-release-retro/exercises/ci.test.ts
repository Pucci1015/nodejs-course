// 練習問題2 のテスト。ci.yml を YAML として読んで、形を確かめる（GitHub で動かすわけではない）
// 使い方: node --test ci.test.ts
//   模範解答を試す: MODULE=../solutions/ci.yml node --test ci.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { z } from 'zod';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './ci.yml');

const Step = z.object({
  uses: z.string().optional(),
  run: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
});
const Job = z.object({
  'runs-on': z.string(),
  'timeout-minutes': z.number().optional(),
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  defaults: z.object({ run: z.object({ 'working-directory': z.string().optional() }) }).optional(),
  steps: z.array(Step),
});
const Workflow = z.object({
  permissions: z.record(z.string(), z.string()),
  jobs: z.object({ api: Job, web: Job, e2e: Job }),
});

const workflow = Workflow.parse(parse(await readFile(file, 'utf8')));
const { web, e2e } = workflow.jobs;

test('web: run を web/ の中で動かす', () => {
  assert.equal(web.defaults?.run['working-directory'], 'web');
});

test('web: キャッシュは web/package-lock.json で、run は3つ', () => {
  const setup = web.steps.find((s) => s.uses?.startsWith('actions/setup-node@'));
  assert.equal(setup?.with?.['cache-dependency-path'], 'web/package-lock.json');
  assert.deepEqual(
    web.steps.flatMap((s) => (s.run === undefined ? [] : [s.run.trim()])),
    ['npm ci --ignore-scripts', 'npm run check', 'npm audit --omit=dev --audit-level=high'],
  );
});

test('e2e: api と web の両方が通ってから', () => {
  const needs = typeof e2e.needs === 'string' ? [e2e.needs] : (e2e.needs ?? []);
  assert.deepEqual(needs.toSorted(), ['api', 'web']);
});

test('全体: トークンは読むだけ。どのジョブにも時間の上限', () => {
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  for (const [name, job] of Object.entries(workflow.jobs))
    assert.ok(job['timeout-minutes'], `${name} に timeout-minutes`);
});
