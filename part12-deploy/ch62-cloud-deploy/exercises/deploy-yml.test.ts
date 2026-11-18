// 練習問題5 のテスト: 自分で書いた deploy.yml の形を確かめる（GitHub で動かすわけではない）
// 使い方: node --test deploy-yml.test.ts
//   模範解答を試す: MODULE=../solutions/deploy.yml node --test deploy-yml.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './deploy.yml');

type Step = { name?: string; uses?: string; run?: string; env?: Record<string, string>; with?: Record<string, unknown> };
type Job = {
  needs?: string | string[];
  if?: string;
  'timeout-minutes'?: number;
  environment?: string | { name?: string; url?: string };
  permissions?: Record<string, string>;
  steps?: Step[];
};
type Workflow = {
  on?: { push?: { branches?: string[] }; workflow_dispatch?: unknown };
  concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
  permissions?: Record<string, string>;
  jobs?: Record<string, Job>;
};

function load(): Workflow {
  if (!fs.existsSync(file)) assert.fail(`${path.basename(file)} がありません`);
  return parse(fs.readFileSync(file, 'utf8')) as Workflow;
}

function stepsOf(job: Job | undefined): Step[] {
  return job?.steps ?? [];
}

test('main への push と、手で動かす（workflow_dispatch）で動く', () => {
  const wf = load();
  assert.deepEqual(wf.on?.push?.branches, ['main']);
  assert.ok(wf.on && 'workflow_dispatch' in wf.on, 'workflow_dispatch がありません');
});

test('デプロイを同時に走らせず、途中で取り消さない', () => {
  const wf = load();
  assert.equal(typeof wf.concurrency?.group, 'string');
  assert.equal(wf.concurrency?.['cancel-in-progress'], false);
});

test('GITHUB_TOKEN は読むだけ', () => {
  assert.deepEqual(load().permissions, { contents: 'read' });
});

test('test のジョブ: npm ci と npm run check', () => {
  const runs = stepsOf(load().jobs?.test).map((s) => s.run ?? '');
  assert.ok(runs.includes('npm ci'), 'npm ci がありません');
  assert.ok(runs.includes('npm run check'), 'npm run check がありません');
});

test('deploy のジョブ: test の後で、main のときだけ、production の環境、15 分以内', () => {
  const job = load().jobs?.deploy;
  assert.ok(job, 'deploy のジョブがありません');
  const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
  assert.ok(needs.includes('test'), 'needs に test がありません');
  assert.equal(job.if?.replace(/\s+/g, ' ').trim(), "github.ref == 'refs/heads/main'");
  const env = typeof job.environment === 'string' ? job.environment : job.environment?.name;
  assert.equal(env, 'production');
  assert.ok(typeof job['timeout-minutes'] === 'number' && job['timeout-minutes'] <= 15, 'timeout-minutes を 15 以下に');
});

test('デプロイフックの URL は Secrets から env で渡し、run の中に ${{ secrets. }} を書かない', () => {
  const wf = load();
  const steps = Object.values(wf.jobs ?? {}).flatMap(stepsOf);
  for (const s of steps) {
    assert.ok(!(s.run ?? '').includes('${{ secrets.'), `run の中に secrets があります: ${s.run}`);
  }
  const hook = stepsOf(wf.jobs?.deploy).find((s) => s.env?.RENDER_DEPLOY_HOOK_URL !== undefined);
  assert.ok(hook, 'env に RENDER_DEPLOY_HOOK_URL を持つステップがありません');
  assert.equal(hook.env?.RENDER_DEPLOY_HOOK_URL?.replace(/\s+/g, ''), '${{secrets.RENDER_DEPLOY_HOOK_URL}}');
  assert.match(hook.run ?? '', /curl .*"\$RENDER_DEPLOY_HOOK_URL"/);
});

test('デプロイを頼んだ後で、wait-for-version.ts で新しい版を待つ', () => {
  const steps = stepsOf(load().jobs?.deploy);
  const hookAt = steps.findIndex((s) => s.env?.RENDER_DEPLOY_HOOK_URL !== undefined);
  const waitAt = steps.findIndex((s) => /node \S*wait-for-version\.ts .*\$GITHUB_SHA/.test(s.run ?? ''));
  assert.ok(waitAt >= 0, 'wait-for-version.ts を $GITHUB_SHA で動かすステップがありません');
  assert.ok(hookAt < waitAt, 'デプロイを頼む前に待っています');
});
