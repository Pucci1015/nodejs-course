// 第64章 練習問題6: メールを送る仕事の処理。2 回送らない・直せない失敗は再試行しない（本文 4・5節）
import { UnrecoverableError } from 'bullmq';

export type Mailer = { send(mail: { to: string; subject: string; text: string }): Promise<void> };

/** 送ったことを覚えておく場所（本番は PostgreSQL や Redis） */
export type SentStore = { has(key: string): Promise<boolean>; add(key: string): Promise<void> };

/** BullMQ の Job のうち、使う所だけ */
export type MailJob = { id?: string; data: unknown };

export type ProcessorOptions = {
  mailer: Mailer;
  sent: SentStore;
  /** 送った後にすること（ログを書くなど）。テストでわざと失敗させる */
  afterSend?: (to: string) => Promise<void>;
};

/** Worker に渡す処理の関数を作る。戻り値は 'sent'（送った）か 'skipped'（もう送ってあった） */
export function createMailProcessor(options: ProcessorOptions): (job: MailJob) => Promise<'sent' | 'skipped'> {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof options} ${typeof UnrecoverableError}）`);
}
