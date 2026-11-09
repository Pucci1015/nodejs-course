// 「本当に消しますか？ [y/N]」と聞く（第16章 練習問題4）
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

const YES = new Set(['y', 'yes', 'はい']);
const NO = new Set(['n', 'no', 'いいえ']);

export async function confirm(
  message,
  { input = process.stdin, output = process.stderr, assumeYes = false, defaultAnswer = false, maxTries = 3 } = {},
) {
  // --yes のときは聞かない。何も書かず、入力にも触らない
  if (assumeYes) return true;
  // パイプやファイルから読んでいるときは、人が答えているとは限らない。勝手に「はい」にしない
  if (!input.isTTY) {
    throw new NotInteractiveError('端末ではないので確認できません。確認なしで進めるなら --yes を付けてください');
  }

  // 両方が端末のときだけ terminal モード（行の編集・Ctrl+C の受け取り）にする
  const rl = createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const ac = new AbortController();
  let cancelled = false;
  // Ctrl+D などで入力が終わると close になる。question は待ったままになるので、自分で止める
  rl.once('close', () => ac.abort());
  // terminal モードで Ctrl+C が押されると、rl に SIGINT が来る
  rl.once('SIGINT', () => {
    cancelled = true;
    ac.abort();
  });

  const hint = defaultAnswer ? '[Y/n]' : '[y/N]';
  try {
    for (let i = 0; i < maxTries; i++) {
      let answer;
      try {
        answer = await rl.question(`${message} ${hint} `, { signal: ac.signal });
      } catch (err) {
        if (err.name !== 'AbortError') throw err;
        if (!rl.terminal) output.write('\n'); // terminal モードなら readline が改行を出す
        if (cancelled) throw new CancelledError();
        return false; // 答えずに入力が終わった。安全な方（いいえ）にする
      }
      const a = answer.trim().toLowerCase();
      if (a === '') return defaultAnswer;
      if (YES.has(a)) return true;
      if (NO.has(a)) return false;
      output.write('y か n で答えてください\n');
    }
    return false; // 何度聞いても分からなければ、いいえ
  } finally {
    rl.close(); // 入力は閉じない（pause するだけ）。続けてもう一度聞ける
  }
}
