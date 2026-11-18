// 練習問題2 のテスト: broken/Dockerfile を確かめる
// 使い方: node --test broken.test.ts
//   模範解答を試す: MODULE=../solutions/broken/Dockerfile node --test broken.test.ts
//   本当に build して動かして確かめるときは、Docker を動かしてから DOCKER=1 node --test broken.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { instructions } from './dockerfile-text.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './broken/Dockerfile');
const lines = instructions(await readFile(file, 'utf8'));
const indexOf = (pred: (l: { keyword: string; args: string }) => boolean) => lines.findIndex(pred);

test('FROM は版を決めたイメージ（node:24-bookworm-slim）', () => {
  assert.deepEqual(lines.filter((l) => l.keyword === 'FROM').map((l) => l.args), ['node:24-bookworm-slim']);
});

test('package.json と package-lock.json を先にコピーしてから npm ci（キャッシュが効く順番）', () => {
  const copyPkg = indexOf((l) => l.keyword === 'COPY' && /package\.json/.test(l.args) && /package-lock\.json|package\*\.json/.test(l.args));
  const ci = indexOf((l) => l.keyword === 'RUN' && /\bnpm ci\b/.test(l.args));
  const copySrc = indexOf((l) => l.keyword === 'COPY' && /^src\b/.test(l.args));
  assert.ok(copyPkg >= 0, 'package.json と package-lock.json をコピーする COPY がありません');
  assert.ok(ci > copyPkg, 'npm ci が、package.json のコピーの後にありません');
  assert.ok(copySrc > ci, 'src のコピー（COPY src …）が、npm ci の後にありません');
  assert.equal(indexOf((l) => l.keyword === 'COPY' && /^\.\s/.test(l.args)), -1, 'COPY . . は使わない（ソースを変えるたびに npm ci し直しになる）');
});

test('npm install ではなく npm ci。本番で要らないパッケージは入れない（--omit=dev）', () => {
  assert.equal(indexOf((l) => l.keyword === 'RUN' && /\bnpm (install|i)\b/.test(l.args)), -1);
  assert.ok(indexOf((l) => l.keyword === 'RUN' && /\bnpm ci\b/.test(l.args) && /--omit=dev/.test(l.args)) >= 0);
});

test('NODE_ENV=production と HOST=0.0.0.0 を ENV で決める', () => {
  const env = lines.filter((l) => l.keyword === 'ENV').map((l) => l.args).join(' ');
  assert.match(env, /\bNODE_ENV=production\b/);
  assert.match(env, /\bHOST=0\.0\.0\.0\b/);
});

test('USER node（root で動かさない）を CMD より前に', () => {
  const user = indexOf((l) => l.keyword === 'USER' && l.args === 'node');
  assert.ok(user >= 0, 'USER node がありません');
  assert.ok(user < indexOf((l) => l.keyword === 'CMD'));
});

test('CMD は exec の形で node を直接動かす', () => {
  const cmd = lines.filter((l) => l.keyword === 'CMD').map((l) => l.args);
  assert.equal(cmd.length, 1);
  const args: unknown = JSON.parse(cmd[0] ?? '');
  assert.deepEqual(args, ['node', 'src/server.ts']);
});

const docker = process.env.DOCKER === '1';
test('（DOCKER=1 のとき）build して動かすと、node ユーザー・production で答え、docker stop がすぐ終わる', { skip: !docker && 'DOCKER=1 のときだけ' }, async () => {
  const run = promisify(execFile);
  const tag = 'ch61-exercise-broken:test';
  await run('docker', ['build', '-q', '-f', file, '-t', tag, path.join(import.meta.dirname, 'broken')], { timeout: 300_000 });
  const { stdout: id } = await run('docker', ['run', '-d', '-p', '127.0.0.1::9817', tag]);
  const container = id.trim();
  try {
    const { stdout: portLine } = await run('docker', ['port', container, '9817']);
    const port = /:(\d+)\s*$/.exec(portLine.trim().split('\n')[0] ?? '')?.[1];
    let body: { user?: string; env?: string } = {};
    for (let i = 0; i < 50; i += 1) {
      try {
        body = (await (await fetch(`http://127.0.0.1:${port}/`)).json()) as typeof body;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    assert.equal(body.user, 'node');
    assert.equal(body.env, 'production');
    const started = Date.now();
    await run('docker', ['stop', container]);
    assert.ok(Date.now() - started < 5000, 'docker stop に 5 秒以上かかりました（SIGTERM が node に届いていない）');
  } finally {
    await run('docker', ['rm', '-f', container]).catch(() => {});
  }
});
