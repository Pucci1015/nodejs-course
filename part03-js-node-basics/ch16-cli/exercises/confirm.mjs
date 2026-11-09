// 練習問題4: 「本当に消しますか？ [y/N]」と聞く関数
// 仕様は README の練習問題4を見てください。
// 確かめる: node --test confirm.test.mjs   /   動かす: node confirm-demo.mjs
import { createInterface } from 'node:readline/promises';

export class NotInteractiveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotInteractiveError';
    this.exitCode = 2;
  }
}

export class CancelledError extends Error {
  constructor(message = '中止しました') {
    super(message);
    this.name = 'CancelledError';
    this.exitCode = 130; // Ctrl+C で止めたときと同じ
  }
}

export async function confirm(
  message,
  { input = process.stdin, output = process.stderr, assumeYes = false, defaultAnswer = false, maxTries = 3 } = {},
) {
  // ここを書く
  // 最初の版（これでは足りません。テストを動かして、何が足りないか確かめてください）:
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} [y/N] `);
  rl.close();
  return answer === 'y';
}
