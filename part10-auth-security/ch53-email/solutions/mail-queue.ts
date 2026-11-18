// 第53章 練習問題7 の模範解答: メールを後ろで1通ずつ送る列（本文7節）
import type { Mail } from '../exercises/mailer.ts';

export function createMailQueue(send: (mail: Mail) => Promise<void>, { onError = (_mail: Mail, _err: unknown) => {} } = {}) {
  const waiting: Mail[] = [];
  let running = false;
  /** 列が空になるのを待っている人たち */
  let idleWaiters: (() => void)[] = [];

  async function run() {
    running = true;
    // 送っている間に enqueue されたものも、続けて送る
    for (let mail = waiting.shift(); mail !== undefined; mail = waiting.shift()) {
      try {
        await send(mail);
      } catch (err) {
        // 1通の失敗で、列全体を止めない
        onError(mail, err);
      }
    }
    running = false;
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  }

  return {
    /** 列に足すだけで、すぐ戻る（送り終わるのを待たない） */
    enqueue(mail: Mail): void {
      waiting.push(mail);
      if (!running) void run();
    },
    /** まだ送っていない数（送っている途中の1通は含めない） */
    pending: () => waiting.length,
    /** 列が空になり、送っている途中のものも終わったら解決する Promise */
    idle(): Promise<void> {
      if (!running && waiting.length === 0) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
  };
}
