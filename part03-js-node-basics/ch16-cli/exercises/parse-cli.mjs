// 練習問題2: サブコマンドのある todo CLI の引数を解析する
// 仕様は README の練習問題2を見てください。
// 確かめる: node --test parse-cli.test.mjs
import { parseArgs } from 'node:util';

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
    this.exitCode = 2; // 使い方の間違い
  }
}

// argv は process.argv.slice(2) と同じ形（例: ['add', '牛乳', '--tag', '買い物']）
export function parseCli(argv) {
  // ここを書く
  // ヒント: 1つ目の引数でサブコマンドを決めてから、サブコマンドごとの options で parseArgs を呼ぶ
  throw new Error('まだ書いていません');
}
