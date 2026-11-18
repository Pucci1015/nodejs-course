// 第60章 練習問題8: .env.example と見比べて、設定の漏れと書き間違いを知らせるコマンド（本文2・6節）
// 使い方: node check-env.ts .env.example [--env-file .env] [--production]
//   終了コード: 0 = 問題なし、1 = 足りない設定がある、2 = 使い方の間違い・ファイルが読めない
import { readFile } from 'node:fs/promises';
import { parseArgs, parseEnv } from 'node:util';

// 使ってよい: readFile、parseArgs、parseEnv
void readFile;
void parseArgs;
void parseEnv;

export async function main(argv: string[], env: NodeJS.ProcessEnv): Promise<number> {
  // ここを書く
  console.error(`まだ書いていません: ${argv.join(' ')} ${Object.keys(env).length}`);
  return 2;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
