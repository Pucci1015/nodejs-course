// 練習問題8 のテスト: app/Dockerfile（マルチステージ）を確かめる
// 使い方: node --test app-image.test.ts                 → Dockerfile の中身だけを確かめる
//         DOCKER=1 node --test app-image.test.ts        → 本当に build して動かす（Docker を動かしてから。数分かかる）
//   模範解答を試す: MODULE=../solutions/app/Dockerfile node --test app-image.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { instructions } from './dockerfile-text.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app/Dockerfile');
const text = await readFile(file, 'utf8').catch(() => '');
const lines = instructions(text);
const fromIndexes = lines.flatMap((l, i) => (l.keyword === 'FROM' ? [i] : []));
const lastFrom = fromIndexes.at(-1) ?? 0;
const finalStage = lines.slice(lastFrom);
const earlier = lines.slice(0, lastFrom);

test('段階が2つ以上ある', () => {
  assert.ok(fromIndexes.length >= 2, `FROM が ${fromIndexes.length} 個です`);
  for (const i of fromIndexes) assert.match(lines[i]?.args ?? '', /^node:24-bookworm-slim\b/);
});

test('前の段階で npm ci と npm run typecheck（型の確かめに失敗したら build も失敗する）', () => {
  assert.ok(earlier.some((l) => l.keyword === 'RUN' && /\bnpm ci\b/.test(l.args)));
  assert.ok(earlier.some((l) => l.keyword === 'RUN' && /\bnpm run typecheck\b/.test(l.args)));
});

test('型を確かめる段階を、最後の段階が COPY --from で使っている（使わない段階は build されない）', () => {
  // typecheck を動かす段階の名前
  let stageName: string | undefined;
  let current: string | undefined;
  for (const l of earlier) {
    if (l.keyword === 'FROM') current = /\bAS\s+(\S+)/i.exec(l.args)?.[1];
    if (l.keyword === 'RUN' && /\bnpm run typecheck\b/.test(l.args)) stageName = current;
  }
  assert.ok(stageName !== undefined, 'typecheck を動かす段階に、FROM … AS 名前 で名前を付けてください');
  assert.ok(
    finalStage.some((l) => l.keyword === 'COPY' && l.args.includes(`--from=${stageName}`)),
    `最後の段階に COPY --from=${stageName} がありません`,
  );
});

test('最後の段階: 本番で要るパッケージだけ（--omit=dev か npm prune）', () => {
  assert.ok(lines.some((l) => l.keyword === 'RUN' && /--omit=dev/.test(l.args)));
  assert.ok(!finalStage.some((l) => l.keyword === 'RUN' && /\bnpm ci\b(?!.*--omit=dev)/.test(l.args)), '最後の段階で、devDependencies まで入れています');
});

test('最後の段階: NODE_ENV=production、HOST=0.0.0.0、USER node、CMD は exec の形', () => {
  const env = finalStage.filter((l) => l.keyword === 'ENV').map((l) => l.args).join(' ');
  assert.match(env, /\bNODE_ENV=production\b/);
  assert.match(env, /\bHOST=0\.0\.0\.0\b/);
  assert.equal(finalStage.filter((l) => l.keyword === 'USER').at(-1)?.args, 'node');
  const cmd = finalStage.filter((l) => l.keyword === 'CMD').at(-1)?.args ?? '';
  assert.deepEqual(JSON.parse(cmd), ['node', 'src/server.ts']);
});

test('最後の段階: ARG APP_VERSION を ENV APP_VERSION に入れる', () => {
  assert.ok(finalStage.some((l) => l.keyword === 'ARG' && /^APP_VERSION\b/.test(l.args)));
  assert.match(finalStage.filter((l) => l.keyword === 'ENV').map((l) => l.args).join(' '), /\bAPP_VERSION=\$\{?APP_VERSION\}?/);
});

test('最後の段階: HEALTHCHECK で /healthz を確かめる', () => {
  const hc = finalStage.find((l) => l.keyword === 'HEALTHCHECK');
  assert.ok(hc !== undefined, 'HEALTHCHECK がありません');
  assert.match(hc.args, /\/healthz/);
});

const docker = process.env.DOCKER === '1';
const run = promisify(execFile);
const context = path.join(import.meta.dirname, 'app');

test('（DOCKER=1）build して動かす: 版・ユーザー・NODE_ENV・healthy・TypeScript が入っていない・すぐ止まる', { skip: !docker && 'DOCKER=1 のときだけ', timeout: 600_000 }, async () => {
  const tag = 'ch61-exercise-app:test';
  await run('docker', ['build', '-q', '-f', file, '--build-arg', 'APP_VERSION=1.2.3', '-t', tag, context], { timeout: 600_000 });
  const { stdout: ts } = await run('docker', ['run', '--rm', tag, 'node', '-e', "try{require.resolve('typescript');console.log('あり')}catch{console.log('なし')}"]);
  assert.equal(ts.trim(), 'なし', '本番のイメージに typescript が入っています');
  const { stdout: id } = await run('docker', ['run', '-d', '-p', '127.0.0.1::9817', tag]);
  const container = id.trim();
  try {
    const { stdout: portLine } = await run('docker', ['port', container, '9817']);
    const port = /:(\d+)\s*$/.exec(portLine.trim().split('\n')[0] ?? '')?.[1];
    let body: { user?: string; env?: string; version?: string } = {};
    for (let i = 0; i < 50 && body.user === undefined; i += 1) {
      body = await fetch(`http://127.0.0.1:${port}/`).then(
        (r) => r.json() as Promise<typeof body>,
        async () => (await new Promise((r) => setTimeout(r, 200)), {}),
      );
    }
    assert.deepEqual([body.user, body.env, body.version], ['node', 'production', '1.2.3']);
    let health = '';
    for (let i = 0; i < 40 && health !== 'healthy'; i += 1) {
      health = (await run('docker', ['inspect', '--format', '{{.State.Health.Status}}', container])).stdout.trim();
      if (health !== 'healthy') await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(health, 'healthy');
    const started = Date.now();
    await run('docker', ['stop', container]);
    assert.ok(Date.now() - started < 5000, 'docker stop に 5 秒以上かかりました');
  } finally {
    await run('docker', ['rm', '-f', container]).catch(() => {});
  }
});

test('（DOCKER=1）型のエラーがあると build が失敗する', { skip: !docker && 'DOCKER=1 のときだけ', timeout: 600_000 }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ch61-typeerror-'));
  try {
    await cp(context, dir, { recursive: true, filter: (src) => !src.includes('node_modules') });
    const server = path.join(dir, 'src/server.ts');
    await writeFile(server, `${await readFile(server, 'utf8')}\nconst n: number = 'これは数ではない';\nconsole.log(n);\n`);
    await assert.rejects(run('docker', ['build', '-q', '-f', file, dir], { timeout: 600_000 }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
