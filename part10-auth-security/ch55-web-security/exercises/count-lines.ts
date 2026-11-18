// 第55章 練習問題3: 利用者が付けた名前のファイルの行数を数える（本文6.2節）
// この関数には、名前によっては動かない・別のファイルを読んでしまう問題がある。execFile を使って直す
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/** dir の中の name というファイルの行数を、wc -l で数える */
export async function countLines(dir: string, name: string): Promise<number> {
  const { stdout } = await execAsync(`wc -l "${name}"`, { cwd: dir });
  return Number.parseInt(stdout.trim(), 10);
}
