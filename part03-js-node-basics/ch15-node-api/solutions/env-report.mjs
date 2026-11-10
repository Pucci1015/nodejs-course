// 練習問題3 の模範解答
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function commandVersion(cmd, args = ['--version']) {
  try {
    const { stdout } = await execFileAsync(cmd, args);
    return stdout.trim();
  } catch (err) {
    if (err.code === 'ENOENT') return null; // そのコマンドが入っていない
    throw err;
  }
}

export async function envReport() {
  // npm と git は、同時に調べる（第12章の Promise.all）
  const [npm, git] = await Promise.all([commandVersion('npm'), commandVersion('git')]);
  return {
    node: process.version,
    npm,
    git,
    platform: process.platform,
    arch: process.arch,
    home: os.homedir(),
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(await envReport(), null, 2));
}
