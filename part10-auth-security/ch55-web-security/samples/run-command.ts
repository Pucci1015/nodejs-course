// 6.2節: 外のコマンドに、利用者の値を渡す。exec（シェルを通す）と execFile（通さない）
// 動かし方: node samples/run-command.ts
import { exec, execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// 練習用のフォルダに、名前に ' と空白を含むファイルを作る（利用者がアップロードしたファイルの名前のつもり）
const dir = await mkdtemp(path.join(os.tmpdir(), 'run-command-'));
const name = "Let's go.txt";
await writeFile(path.join(dir, name), '1行目\n2行目\n3行目\n');

// ✗ exec: 1つの文字列をシェル（/bin/sh）に渡す。' がシェルの記号として読まれ、コマンドが壊れる
try {
  const { stdout } = await execAsync(`wc -l '${name}'`, { cwd: dir });
  console.log('exec:', stdout.trim());
} catch (err) {
  console.log('exec: 失敗しました:', err instanceof Error ? err.message.split('\n').slice(0, 2).join(' / ') : err);
}

// ✓ execFile: コマンドと引数を配列で渡す。シェルを通らないので、' も空白も、ただの文字
// '--' は「ここから後はオプションではない」の印（名前が - で始まっても、オプションと読まれない）
const { stdout } = await execFileAsync('wc', ['-l', '--', name], { cwd: dir });
console.log('execFile:', stdout.trim());

await rm(dir, { recursive: true });
