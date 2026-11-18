// 第60章 練習問題6: 落ちたら起動し直す見張り役（本文4.2節の supervise.ts を、関数にして決まりを足す）
import { spawn } from 'node:child_process';

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

// 使ってよい: spawn（子は spawn(process.execPath, [script], { env, stdio: 'ignore' }) で起動する）
void spawn;

export function supervise(options: SuperviseOptions): Supervisor {
  // ここを書く
  throw new Error(`まだ書いていません: ${options.script}`);
}
