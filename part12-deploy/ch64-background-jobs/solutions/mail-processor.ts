// 第64章 練習問題6: メールを送る仕事の処理。2 回送らない・直せない失敗は再試行しない（本文 4・5節）
import { UnrecoverableError } from 'bullmq';
import { z } from 'zod';

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

const MailData = z.strictObject({ to: z.email(), subject: z.string().min(1), text: z.string() });

/** Worker に渡す処理の関数を作る。戻り値は 'sent'（送った）か 'skipped'（もう送ってあった） */
export function createMailProcessor(options: ProcessorOptions): (job: MailJob) => Promise<'sent' | 'skipped'> {
  return async (job) => {
    const parsed = MailData.safeParse(job.data);
    // 形の違うデータは、何回やり直しても直らない。UnrecoverableError を投げると、BullMQ は再試行しない
    if (!parsed.success) throw new UnrecoverableError(`データの形が違います: ${parsed.error.issues[0]?.message ?? ''}`);
    const key = `mail:${job.id ?? ''}`;

    let result: 'sent' | 'skipped' = 'skipped';
    if (!(await options.sent.has(key))) {
      try {
        await options.mailer.send(parsed.data);
      } catch (err) {
        // SMTP の 5xx（宛先が無いなど）は、直らない失敗（第10部 第53章）
        if (typeof err === 'object' && err !== null && 'responseCode' in err && Number(err.responseCode) >= 500) {
          throw new UnrecoverableError(`送れません: ${err instanceof Error ? err.message : ''}`);
        }
        throw err; // ほかは、BullMQ に再試行させる
      }
      // 送った直後に覚える。ここより後で失敗して再試行されても、もう送らない
      await options.sent.add(key);
      result = 'sent';
    }
    await options.afterSend?.(parsed.data.to);
    return result;
  };
}
