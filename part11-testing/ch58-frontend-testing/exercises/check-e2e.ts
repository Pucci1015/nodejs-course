// 練習問題7の確認の道具: E2E のテストが、正しい API では通り、わざと壊した API（ミュータント）では落ちるかを確かめる（書き換えなくてよい）
// 使い方（exercises で）: node check-e2e.ts e2e/tasks.spec.ts
//                         node check-e2e.ts ../solutions/e2e/tasks.spec.ts   … 模範解答
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const spec = process.argv[2];
if (spec === undefined || !existsSync(spec)) {
  console.error('使い方: node check-e2e.ts <テストのファイル>');
  process.exit(2);
}
const require = createRequire(path.join(process.cwd(), 'noop.js'));
const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
const mutants = readdirSync('mutants')
  .filter((f) => /^api-\d+\.ts$/.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

/** API_ENTRY の API を相手に、テストを1回動かす。通れば true */
function run(apiEntry: string | undefined): Promise<{ passed: boolean; output: string }> {
  const env = { ...process.env, ...(apiEntry ? { API_ENTRY: apiEntry } : {}) };
  // ファイルの名前は正規表現として扱われるので、ほかのファイルに当たらないよう、絶対パスで渡す
  const args = [cli, 'test', '--config', 'playwright.config.ts', path.resolve(spec!)];
  return new Promise((resolve) => {
    execFile(process.execPath, args, { env, timeout: 300_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ passed: err === null, output: `${stdout}${stderr}` });
    });
  });
}

function tail(output: string, lines = 15): string {
  return output.trimEnd().split('\n').slice(-lines).map((l) => `      ${l}`).join('\n');
}

let failures = 0;
const first = await run(undefined);
if (first.passed) {
  console.log('[OK] 正しい API で、すべてのテストが通る');
} else {
  failures++;
  console.log('[NG] 正しい API で、通らないテストがあります');
  console.log(tail(first.output));
}
for (const [i, name] of mutants.entries()) {
  const file = path.join('mutants', name);
  const desc = (readFileSync(file, 'utf8').split('\n')[0] ?? '').replace(/^\/\/\s*ミュータント:\s*/, '');
  const result = await run(file);
  if (result.passed) {
    failures++;
    console.log(`[NG] ミュータント${i + 1}（${desc}）を見逃した（すべてのテストが通ってしまう）`);
  } else {
    console.log(`[OK] ミュータント${i + 1}（${desc}）を見つけた`);
  }
}
if (failures === 0) {
  console.log('すべて成功しました');
} else {
  console.log(`${failures} 個の確認が失敗しました`);
  process.exitCode = 1;
}
