// 第60章 練習問題6の模範解答: 落ちたら起動し直す見張り役（本文4.2節の supervise.ts を、関数にして決まりを足す）
import { type ChildProcess, spawn } from 'node:child_process';

export type SuperviseEvent =
  | { type: 'start'; pid: number }
  | { type: 'exit'; code: number | null; signal: string | null }
  | { type: 'wait'; delayMs: number; restarts: number }
  | { type: 'give-up'; restarts: number };

export type SuperviseOptions = {
  /** 動かすファイル（node で動かす） */
  script: string;
  /** 子に渡す環境変数（無ければ process.env） */
  env?: NodeJS.ProcessEnv;
  /** 起動し直すまで待つ時間の、最初の値と上限（ミリ秒） */
  baseDelayMs: number;
  maxDelayMs: number;
  /** 続けて起動し直す回数の上限。これを超えて落ちたら、あきらめる */
  maxRestarts: number;
  /** これより長く動いてから落ちたら、続けて落ちた回数を 0 に戻す */
  stableMs: number;
  onEvent?: (e: SuperviseEvent) => void;
};

export type SuperviseResult = { reason: 'stopped' | 'gave-up'; restarts: number };

export type Supervisor = {
  /** 見張りをやめる。子が動いていれば SIGTERM を送り、終わるのを待つ。待っている間なら、起動し直さない */
  stop(): Promise<void>;
  /** 見張りが終わったら、理由と、起動し直した回数（全部で）で解決する */
  done: Promise<SuperviseResult>;
};

export function supervise(options: SuperviseOptions): Supervisor {
  const { script, env = process.env, baseDelayMs, maxDelayMs, maxRestarts, stableMs, onEvent = () => {} } = options;
  let child: ChildProcess | undefined;
  let waiting: NodeJS.Timeout | undefined;
  let stopping = false;
  let consecutive = 0; // 続けて落ちた回数（しばらく動けば 0 に戻す）
  let total = 0; // 起動し直した回数（全部で）
  let finish!: (r: SuperviseResult) => void;
  const done = new Promise<SuperviseResult>((resolve) => {
    finish = resolve;
  });

  function start() {
    const startedAt = Date.now();
    const c = spawn(process.execPath, [script], { env, stdio: 'ignore' });
    child = c;
    if (c.pid !== undefined) onEvent({ type: 'start', pid: c.pid });
    c.on('exit', (code, signal) => {
      child = undefined;
      onEvent({ type: 'exit', code, signal });
      if (stopping) {
        finish({ reason: 'stopped', restarts: total });
        return;
      }
      if (Date.now() - startedAt >= stableMs) consecutive = 0;
      if (consecutive >= maxRestarts) {
        onEvent({ type: 'give-up', restarts: total });
        finish({ reason: 'gave-up', restarts: total });
        return;
      }
      const delayMs = Math.min(baseDelayMs * 2 ** consecutive, maxDelayMs);
      consecutive += 1;
      total += 1;
      onEvent({ type: 'wait', delayMs, restarts: consecutive });
      waiting = setTimeout(() => {
        waiting = undefined;
        start();
      }, delayMs);
    });
  }
  start();

  return {
    done,
    async stop() {
      stopping = true;
      if (waiting !== undefined) {
        // 待っている間なら、タイマーを止めて終わり（子はいない）
        clearTimeout(waiting);
        waiting = undefined;
        finish({ reason: 'stopped', restarts: total });
      } else {
        child?.kill('SIGTERM');
      }
      await done;
    },
  };
}
