// 第55章 練習問題3 の模範解答: 利用者が付けた名前のファイルの行数を数える（本文6.2節）
import { execFile } from 'node:child_process'; // 修正: exec ではなく execFile
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile); // 修正

/** dir の中の name というファイルの行数を、wc -l で数える */
export async function countLines(dir: string, name: string): Promise<number> {
  // 追加: dir の外を指す名前・隠しファイルは断る（第4部 第19章のパストラバーサル）
  if (name === '' || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
    throw new Error(`使えない名前です: ${name}`);
  }
  // 修正: シェルを通さない。'--' の後は、- で始まる名前でもオプションと読まれない
  const { stdout } = await execFileAsync('wc', ['-l', '--', name], { cwd: dir });
  return Number.parseInt(stdout.trim(), 10);
}
