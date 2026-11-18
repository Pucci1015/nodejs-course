// 練習問題8 のテスト（コマンドを子プロセスで動かす）
// 使い方: node --test check-env.test.ts
//   模範解答を試す: MODULE=../solutions/check-env.ts node --test check-env.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './check-env.ts');
const run = promisify(execFile);
let dir = '';

const EXAMPLE = `# アプリの設定の例（値が空のものは、本番では必須）
NODE_ENV=development
PORT=9807
SESSION_SECRETS=
DATABASE_URL=
LOG_LEVEL=info
`;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'check-env-'));
  await writeFile(path.join(dir, '.env.example'), EXAMPLE);
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** コマンドを動かして、終了コード・標準出力・標準エラー出力を返す。env は、これだけを渡す（PATH なども渡さない） */
async function check(args: string[], env: Record<string, string> = {}) {
  try {
    const r = await run(process.execPath, [file, ...args], { cwd: dir, env });
    return { code: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (err) {
    const e = err as { code: number; stdout: string; stderr: string };
    return { code: e.code, stdout: e.stdout, stderr: e.stderr };
  }
}

test('開発（--production なし）: 足りなくても [注意] だけで、終了コード 0', async () => {
  const r = await check(['.env.example']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^\[注意\] SESSION_SECRETS: 値がありません（本番では必須）$/m);
  assert.match(r.stdout, /^\[注意\] DATABASE_URL: 値がありません（本番では必須）$/m);
  assert.doesNotMatch(r.stdout, /PORT|LOG_LEVEL|NODE_ENV/); // 例に値があるもの（既定の値がある）は言わない
});

test('--production: 値が空の名前が環境変数に無ければ [NG] で、終了コード 1', async () => {
  const r = await check(['.env.example', '--production'], { DATABASE_URL: 'postgres://app:dev-only-x@db/taskapi' });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /^\[NG\] SESSION_SECRETS: 値がありません（本番では必須）$/m);
  assert.doesNotMatch(r.stdout, /DATABASE_URL/);
  assert.match(r.stdout, /^1 件の必須の設定が足りません$/m);
});

test('--production: 全部そろっていれば「問題ありません」で 0。値は出さない', async () => {
  const r = await check(['.env.example', '--production'], {
    SESSION_SECRETS: 'dev-only-secret-aaaaaaaaaaaaaaaaaaaaaaaa',
    DATABASE_URL: 'postgres://app:dev-only-x@db/taskapi',
  });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^問題ありません$/m);
  assert.doesNotMatch(r.stdout + r.stderr, /dev-only/);
});

test('--env-file: ファイルの値も見る。例に無い名前は [注意]（書き間違い?）', async () => {
  await writeFile(path.join(dir, '.env'), 'SESION_SECRETS=dev-only-typo\nDATABASE_URL=postgres://app:dev-only-x@db/taskapi\n');
  const r = await check(['.env.example', '--env-file', '.env', '--production']);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /^\[注意\] SESION_SECRETS: \.env\.example に無い名前です（書き間違い\?）$/m);
  assert.match(r.stdout, /^\[NG\] SESSION_SECRETS: 値がありません（本番では必須）$/m);
  assert.doesNotMatch(r.stdout, /DATABASE_URL/);
  assert.doesNotMatch(r.stdout + r.stderr, /dev-only/);
});

test('空の値（SESSION_SECRETS=）は、無いのと同じ', async () => {
  const r = await check(['.env.example', '--production'], { SESSION_SECRETS: '', DATABASE_URL: 'postgres://a@b/c' });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /^\[NG\] SESSION_SECRETS/m);
});

test('使い方の間違い・読めないファイルは、標準エラー出力に書いて終了コード 2', async () => {
  const none = await check([]);
  assert.equal(none.code, 2);
  assert.match(none.stderr, /使い方/);
  const missing = await check(['nope.example']);
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /nope\.example/);
  const unknown = await check(['.env.example', '--prod']);
  assert.equal(unknown.code, 2);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
