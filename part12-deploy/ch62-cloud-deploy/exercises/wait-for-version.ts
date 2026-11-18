// 第62章 練習問題6: 新しい版が動くまで待つコマンド（本文7節）
// 使い方: node wait-for-version.ts <URL> <版> [--timeout 秒] [--interval 秒]
import { parseArgs } from 'node:util';

/** コマンドの本体。終了コードを返す（0: 来た、1: 時間切れ、2: 使い方の間違い） */
export async function main(argv: string[]): Promise<number> {
  // ここを書く
  console.error(`まだ書いていません: ${argv.join(' ')} ${typeof parseArgs}`);
  return 2;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
