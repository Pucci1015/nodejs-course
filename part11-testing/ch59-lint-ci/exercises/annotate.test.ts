// 練習問題7のテスト（書き換えなくてよい）: node --test annotate.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LintResult } from './annotate.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './annotate.ts');
const { toAnnotations, summarize }: typeof import('./annotate.ts') = await import(pathToFileURL(file).href);

const CWD = '/Users/alice/dev/app';
const results: LintResult[] = [
  {
    filePath: '/Users/alice/dev/app/src/orders.ts',
    messages: [
      { ruleId: 'eqeqeq', severity: 2, message: "Expected '===' and instead saw '=='.", line: 21, column: 20 },
      { ruleId: 'prefer-const', severity: 1, message: "'sum' is never reassigned.", line: 3, column: 7 },
    ],
  },
  { filePath: '/Users/alice/dev/app/src/ok.ts', messages: [] },
];

test('error と warning を、それぞれの行にする', () => {
  assert.deepEqual(toAnnotations(results, CWD), [
    "::error file=src/orders.ts,line=21,col=20,title=eqeqeq::Expected '===' and instead saw '=='.",
    "::warning file=src/orders.ts,line=3,col=7,title=prefer-const::'sum' is never reassigned.",
  ]);
});

test('ルールの無い指摘（構文のエラー）は、title=ESLint', () => {
  const lines = toAnnotations(
    [{ filePath: '/Users/alice/dev/app/a.ts', messages: [{ ruleId: null, severity: 2, message: 'Parsing error', line: 1, column: 1 }] }],
    CWD,
  );
  assert.deepEqual(lines, ['::error file=a.ts,line=1,col=1,title=ESLint::Parsing error']);
});

test('メッセージの % と改行は %25・%0D・%0A にする', () => {
  const lines = toAnnotations(
    [{ filePath: '/Users/alice/dev/app/a.ts', messages: [{ ruleId: 'r', severity: 1, message: '100%\r\n次の行', line: 2, column: 3 }] }],
    CWD,
  );
  assert.deepEqual(lines, ['::warning file=a.ts,line=2,col=3,title=r::100%25%0D%0A次の行']);
});

test('file と title の , と : も %2C・%3A にする（区切りと間違えないように）', () => {
  const lines = toAnnotations(
    [{ filePath: '/Users/alice/dev/app/a,b.ts', messages: [{ ruleId: 'local:x', severity: 2, message: 'a, b: c', line: 1, column: 1 }] }],
    CWD,
  );
  assert.deepEqual(lines, ['::error file=a%2Cb.ts,line=1,col=1,title=local%3Ax::a, b: c']);
});

test('summarize: error と warning の数', () => {
  assert.deepEqual(summarize(results), { errors: 1, warnings: 1 });
  assert.deepEqual(summarize([]), { errors: 0, warnings: 0 });
});

test('コマンド: 行を出し、error があれば終了コード 1', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'annotate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const json = path.join(dir, 'eslint.json');
  await writeFile(json, JSON.stringify([{ ...results[0], filePath: path.join(dir, 'src/orders.ts') }]));

  const { code, stdout } = await new Promise<{ code: number | null; stdout: string }>((resolve) => {
    execFile(process.execPath, [file, json], { cwd: dir }, (err, out) => resolve({ code: err ? (err.code as number) : 0, stdout: out }));
  });

  assert.equal(code, 1);
  assert.deepEqual(stdout.trimEnd().split('\n'), [
    "::error file=src/orders.ts,line=21,col=20,title=eqeqeq::Expected '===' and instead saw '=='.",
    "::warning file=src/orders.ts,line=3,col=7,title=prefer-const::'sum' is never reassigned.",
    'error 1 個、warning 1 個',
  ]);
});
