// 練習問題6の確認の道具: 偽物の API の遅れと、テストの順番を変えて、何度も動かす（書き換えなくてよい）
// 使い方（exercises で）: node check-flaky.ts flaky.test.tsx
//                         node check-flaky.ts ../solutions/flaky.test.tsx   … 模範解答
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { z } from 'zod';

const testFile = process.argv[2];
if (testFile === undefined || !existsSync(testFile)) {
  console.error('使い方: node check-flaky.ts <テストのファイル>');
  process.exit(2);
}
const require = createRequire(path.join(process.cwd(), 'noop.js'));
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

// Vitest の JSON の結果のうち、使う所だけ
const JsonReport = z.object({
  testResults: z.array(z.object({ assertionResults: z.array(z.object({ title: z.string(), status: z.string() })) })),
});

/** 1回動かして、失敗したテストの名前を返す（動かせなかったら undefined） */
function run(delayMs: number, seed: number): Promise<string[] | undefined> {
  const args = [
    vitest, 'run',
    '--root', path.dirname(path.resolve(testFile!)), path.basename(testFile!),
    // テストの順番を、seed で決まる順に混ぜる
    '--sequence.shuffle', `--sequence.seed=${seed}`,
    '--reporter=json',
  ];
  const env = { ...process.env, FAKE_DELAY_MS: String(delayMs), NO_COLOR: '1' };
  return new Promise((resolve) => {
    execFile(process.execPath, args, { env, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (_err, stdout) => {
      try {
        const report = JsonReport.parse(JSON.parse(stdout.slice(stdout.indexOf('{'))));
        const results = report.testResults.flatMap((r) => r.assertionResults);
        if (results.length === 0) return resolve(undefined);
        resolve(results.filter((a) => a.status !== 'passed').map((a) => a.title));
      } catch {
        resolve(undefined);
      }
    });
  });
}

let failures = 0;
for (const delayMs of [0, 150]) {
  for (const seed of [1, 2, 3, 4]) {
    const failed = await run(delayMs, seed);
    const label = `遅れ ${delayMs}ms・順番 ${seed}`;
    if (failed === undefined) {
      failures++;
      console.log(`[NG] ${label}: テストを動かせませんでした（npx vitest run ${testFile} で、エラーを見てください）`);
    } else if (failed.length > 0) {
      failures++;
      console.log(`[NG] ${label}: 失敗 → ${failed.join(' / ')}`);
    } else {
      console.log(`[OK] ${label}: すべて通った`);
    }
  }
}
if (failures === 0) {
  console.log('すべて成功しました');
} else {
  console.log(`${failures} 個の確認が失敗しました`);
  process.exitCode = 1;
}
