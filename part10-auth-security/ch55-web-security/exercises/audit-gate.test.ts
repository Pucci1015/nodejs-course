// 練習問題8 のテスト。audit-part10.json は、執筆時点の第10部のフォルダで npm audit --json を動かした結果
// 使い方: node --test audit-gate.test.ts
//   模範解答を試す: MODULE=../solutions/audit-gate.ts node --test audit-gate.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './audit-gate.ts');
const { summarize, exceeds }: typeof import('./audit-gate.ts') = await import(pathToFileURL(file).href);

const real: unknown = JSON.parse(await readFile(path.join(import.meta.dirname, 'audit-part10.json'), 'utf8'));

/** テスト用の小さな結果（パッケージの名前も勧告も、説明のための作りもの） */
const small = {
  auditReportVersion: 2,
  vulnerabilities: {
    'demo-a': {
      name: 'demo-a',
      severity: 'high',
      isDirect: true,
      via: [{ source: 1, name: 'demo-a', title: 'テスト用の勧告 A', url: 'https://example.com/a', severity: 'high', range: '<2.0.0' }],
      fixAvailable: { name: 'demo-a', version: '2.0.0', isSemVerMajor: true },
    },
    'demo-b': { name: 'demo-b', severity: 'low', isDirect: false, via: ['demo-c'], fixAvailable: true },
    'demo-c': {
      name: 'demo-c',
      severity: 'low',
      isDirect: false,
      via: [{ source: 2, name: 'demo-c', title: 'テスト用の勧告 C', url: 'https://example.com/c', severity: 'low', range: '*' }],
      fixAvailable: false,
    },
  },
  metadata: { vulnerabilities: { info: 0, low: 2, moderate: 0, high: 1, critical: 0, total: 3 }, dependencies: {} },
};

/** コマンドとして動かす。標準入力に input を流す */
function run(args: string[], input: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [file, ...args], { env: { PATH: process.env.PATH ?? '' } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test('summarize: 重い順・名前の順。勧告（via のオブジェクト）と、依存の名前（via の文字列）を分ける', () => {
  const { counts, findings } = summarize(small);
  assert.deepEqual(counts, { info: 0, low: 2, moderate: 0, high: 1, critical: 0, total: 3 });
  assert.deepEqual(findings, [
    { name: 'demo-a', severity: 'high', isDirect: true, advisories: [{ title: 'テスト用の勧告 A', url: 'https://example.com/a' }], via: [], fix: 'demo-a@2.0.0（メジャー版の更新）' },
    { name: 'demo-b', severity: 'low', isDirect: false, advisories: [], via: ['demo-c'], fix: 'npm audit fix' },
    { name: 'demo-c', severity: 'low', isDirect: false, advisories: [{ title: 'テスト用の勧告 C', url: 'https://example.com/c' }], via: [], fix: '直す版なし' },
  ]);
});

test('summarize: 本物の結果（第10部のフォルダ）', () => {
  const { counts, findings } = summarize(real);
  assert.equal(counts.total, findings.length);
  const minimatch = findings.find((f) => f.name === 'minimatch');
  assert.equal(minimatch?.severity, 'moderate');
  assert.equal(minimatch.advisories.length, 1);
  assert.equal(findings.find((f) => f.name === 'eslint')?.isDirect, true);
});

test('summarize: 形が違えば例外', () => {
  for (const bad of [{}, { ...small, auditReportVersion: 1 }, { ...small, vulnerabilities: { x: { name: 'x', severity: 'huge' } } }]) {
    assert.throws(() => summarize(bad), (err: unknown) => err instanceof Error && !err.message.startsWith('まだ書いていません'));
  }
});

test('exceeds: level 以上が1件でもあれば true', () => {
  const counts = { info: 0, low: 2, moderate: 0, high: 1, critical: 0, total: 3 };
  assert.equal(exceeds(counts, 'critical'), false);
  assert.equal(exceeds(counts, 'high'), true);
  assert.equal(exceeds(counts, 'moderate'), true);
  assert.equal(exceeds({ ...counts, high: 0 }, 'moderate'), false);
  assert.equal(exceeds({ ...counts, high: 0 }, 'low'), true);
});

test('コマンド: 基準をこえなければ 0、こえたら 1。最後の行に合計', async () => {
  const ok = await run(['--level', 'critical'], JSON.stringify(small));
  assert.equal(ok.code, 0);
  const lines = ok.stdout.trimEnd().split('\n');
  assert.match(lines[0] ?? '', /^high\s+demo-a.*demo-a@2\.0\.0/);
  assert.match(ok.stdout, /テスト用の勧告 A https:\/\/example\.com\/a/);
  assert.match(lines.at(-1) ?? '', /合計 3 件/);
  const ng = await run([], JSON.stringify(small)); // 既定は high
  assert.equal(ng.code, 1);
  assert.equal((await run(['--level', 'high'], JSON.stringify(real))).code, 0);
  assert.equal((await run(['--level', 'moderate'], JSON.stringify(real))).code, 1);
});

test('コマンド: 読めない入力・知らない level は 2 と、標準エラー出力に理由', async () => {
  for (const [args, input] of [
    [[], 'not json'],
    [[], '{}'],
    [['--level', 'huge'], JSON.stringify(small)],
  ] as const) {
    const r = await run([...args], input);
    assert.equal(r.code, 2, input);
    assert.notEqual(r.stderr, '');
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
