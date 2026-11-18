// 本文3.2節の mailer.ts のコピー（練習問題6〜8で使う。書き換えなくてよい）
import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html?: string };

/** アプリが使う形。テストでは、送らずに配列に覚えるだけの偽物に取り替える */
export type Mailer = { send(mail: Mail): Promise<void> };

export function createSmtpMailer({
  host = process.env.SMTP_HOST ?? '127.0.0.1',
  port = Number(process.env.SMTP_PORT ?? 1025),
  from = process.env.MAIL_FROM ?? '"タスク管理" <no-reply@example.test>',
} = {}): Mailer {
  const transporter = nodemailer.createTransport({ host, port, secure: false });
  return {
    async send(mail) {
      await transporter.sendMail({ from, ...mail });
    },
  };
}

/** テストと練習のための偽物: 送らずに、sent に覚えるだけ */
export function createMemoryMailer() {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    async send(mail) {
      sent.push(mail);
    },
  };
  return { mailer, sent };
}
