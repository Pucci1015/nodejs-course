// 第61章 練習問題6: Dockerfile の点検（問題5の parseDockerfile を使う）
// 使い方: node lint-dockerfile.ts Dockerfile   → 見つけたことを1行ずつ書き、あれば終了コード 1
import { readFile } from 'node:fs/promises';
import { type Instruction, parseDockerfile, parseEnv } from './dockerfile.ts';

export type Problem = { line: number; message: string };

// 使ってよい: parseDockerfile、parseEnv、Instruction の型
void parseEnv;
export type { Instruction };

export function lintDockerfile(text: string): Problem[] {
  const instructions = parseDockerfile(text);
  // ここを書く
  throw new Error(`まだ書いていません: ${instructions.length}`);
}

if (import.meta.main) {
  const file = process.argv[2] ?? 'Dockerfile';
  const problems = lintDockerfile(await readFile(file, 'utf8'));
  for (const p of problems) console.log(`${file}:${p.line}: ${p.message}`);
  process.exitCode = problems.length > 0 ? 1 : 0;
}
