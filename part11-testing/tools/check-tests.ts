// 「テストを書く」練習問題の確認の道具: 書いたテストが、正しい実装では通り、わざと壊した実装（ミュータント）では落ちるかを確かめる
// 使い方（練習問題のフォルダで）:
//   node ../../tools/check-tests.ts slug.test.ts            … node --test で動かす
//   node ../../tools/check-tests.ts list.test.tsx --vitest  … Vitest で動かす
//   模範解答のテストを確かめる: node ../../tools/check-tests.ts ../solutions/slug.test.ts
//   ミュータントの場所を変える: node ../tools/check-tests.ts duration.test.ts --mutants samples/mutants
// 決まり:
//   - テストのファイルが slug.test.ts なら、正しい実装は「今いるフォルダ」の slug.ts、ミュータントは mutants/slug-*.ts
//   - テストは、確かめる実装を環境変数 MODULE から読む（練習問題のテストのひな形のとおり）
//   - ミュータントの1行目は「// ミュータント: どこを壊したか」
// 書き換えなくてよいファイル（第56章 9節）
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const useVitest = args.includes('--vitest');
const mutantsAt = args.indexOf('--mutants');
const mutantDirArg = mutantsAt === -1 ? undefined : args[mutantsAt + 1];
const testFile = args.find((a, i) => !a.startsWith('--') && (mutantsAt === -1 || i !== mutantsAt + 1));
if (testFile === undefined) {
  console.error('使い方: node check-tests.ts <テストのファイル> [--vitest]');
  process.exit(2);
}
if (!existsSync(testFile)) {
  console.error(`テストのファイルがありません: ${testFile}`);
  process.exit(2);
}

const base = path.basename(testFile).replace(/\.test\.tsx?$/, '');
const cwd = process.cwd();
const ext = existsSync(path.join(cwd, `${base}.tsx`)) ? '.tsx' : '.ts';
const correct = path.join(cwd, `${base}${ext}`);
if (!existsSync(correct)) {
  console.error(`正しい実装 ${base}${ext} が、今いるフォルダにありません（練習問題のフォルダで動かしてください）`);
  process.exit(2);
}
const mutantDir = path.resolve(cwd, mutantDirArg ?? 'mutants');
const mutants = existsSync(mutantDir)
  ? readdirSync(mutantDir)
      .filter((f) => f.startsWith(`${base}-`) && /\.tsx?$/.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  : [];
if (mutants.length === 0) {
  console.error(`ミュータント（${path.relative(cwd, mutantDir) || '.'}/${base}-*${ext}）が見つかりません`);
  process.exit(2);
}

/** テストを1回動かす。通れば true */
function runTests(modulePath: string): Promise<{ passed: boolean; output: string }> {
  const env = { ...process.env, MODULE: modulePath, NO_COLOR: '1', FORCE_COLOR: '0' };
  let command: string[];
  if (useVitest) {
    // 今いるフォルダから入っている vitest を探す
    const require = createRequire(path.join(cwd, 'noop.js'));
    const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
    // テストのファイルのフォルダを root にする（Vitest は root の外のテストを探さないため。../solutions/ のテストも動かせるように）
    command = [vitest, 'run', '--root', path.dirname(path.resolve(testFile!)), path.basename(testFile!)];
  } else {
    command = ['--test', testFile!];
  }
  return new Promise((resolve) => {
    execFile(process.execPath, command, { env, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ passed: err === null, output: `${stdout}${stderr}` });
    });
  });
}

/** 失敗したときの出力の、見るべき所（最後のほう）だけ */
function tail(output: string, lines = 15): string {
  return output.trimEnd().split('\n').slice(-lines).map((l) => `      ${l}`).join('\n');
}

function describe(file: string): string {
  const first = readFileSync(file, 'utf8').split('\n')[0] ?? '';
  return first.replace(/^\/\/\s*ミュータント:\s*/, '').trim();
}

let failures = 0;
const first = await runTests(correct);
if (first.passed) {
  console.log(`[OK] 正しい実装（${base}${ext}）で、すべてのテストが通る`);
} else {
  failures++;
  console.log(`[NG] 正しい実装（${base}${ext}）で、通らないテストがあります（テストの期待が仕様と違うか、書き方の間違いです）`);
  console.log(tail(first.output));
}

for (const [i, name] of mutants.entries()) {
  const file = path.join(mutantDir, name);
  const result = await runTests(file);
  const label = `ミュータント${i + 1}（${describe(file)}）`;
  if (result.passed) {
    failures++;
    console.log(`[NG] ${label}を見逃した（すべてのテストが通ってしまう）`);
  } else {
    console.log(`[OK] ${label}を見つけた`);
  }
}

if (failures === 0) {
  console.log('すべて成功しました');
} else {
  console.log(`${failures} 個の確認が失敗しました`);
  process.exitCode = 1;
}
