// 追加（第10部）: 第53章 3.2節の mailer.ts のコピー。設定は config.ts から受け取るように変えた（「変更」）
import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html?: string };

/** アプリが使う形。テストでは、送らずに配列に覚えるだけの偽物に取り替えられる */
export type Mailer = { send(mail: Mail): Promise<void> };

// 変更: 環境変数を直接読まず、引数で受け取る
export function createSmtpMailer({ host, port, from }: { host: string; port: number; from: string }): Mailer {
  const transporter = nodemailer.createTransport({ host, port, secure: false });
  return {
    async send(mail) {
      await transporter.sendMail({ from, ...mail });
    },
  };
}
