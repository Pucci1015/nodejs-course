// 練習問題2のテスト（書き換えなくてよい）: node --test config-practice.test.ts
// config-practice/ を、あなたの eslint.config.js で lint して、出た指摘を比べる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ESLint } from 'eslint';

const dir = path.resolve(import.meta.dirname, 'config-practice');
const configFile = path.resolve(import.meta.dirname, process.env.MODULE ?? './config-practice/eslint.config.js');

/** ファイルごとに「ルール:重さ」の一覧を作る（重さは 1 = warn、2 = error） */
async function lintAll(): Promise<Record<string, string[]>> {
  const eslint = new ESLint({ cwd: dir, overrideConfigFile: configFile });
  const results = await eslint.lintFiles(['.']);
  const found: Record<string, string[]> = {};
  for (const r of results) {
    const rel = path.relative(dir, r.filePath);
    if (rel === 'eslint.config.js') continue;
    found[rel] = r.messages.map((m) => `${m.ruleId ?? '(構文)'}:${m.severity}`).sort();
  }
  return found;
}

test('src/app.js: eqeqeq と no-console は error、prefer-const は warn', async () => {
  const found = await lintAll();
  assert.deepEqual(found['src/app.js'], ['eqeqeq:2', 'no-console:2', 'prefer-const:1']);
});

test('src/unused.js: おすすめのルール（no-unused-vars）が効いている', async () => {
  const found = await lintAll();
  assert.deepEqual(found['src/unused.js'], ['no-unused-vars:2']);
});

test('scripts/seed.js: console.log を使ってよい。console が「無い変数」にならない', async () => {
  const found = await lintAll();
  assert.deepEqual(found['scripts/seed.js'], []);
});

test('generated/ は lint しない', async () => {
  const found = await lintAll();
  assert.equal(found['generated/api.js'], undefined);
});
