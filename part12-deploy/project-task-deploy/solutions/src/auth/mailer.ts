// 追加（第10部）: 第53章 3.2節の mailer.ts のコピー。設定は config.ts から受け取るように変えた（「変更」）
// 追加（第12部）: 本番の送信サービスのための auth と secure を足した
import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html?: string };

/** アプリが使う形。テストでは、送らずに配列に覚えるだけの偽物に取り替えられる */
export type Mailer = { send(mail: Mail): Promise<void> };

export type SmtpOptions = {
  host: string;
  port: number;
  from: string;
  /** 追加（第12部）: true なら最初から TLS（465）。false なら、サーバが対応していれば STARTTLS に切り替える */
  secure?: boolean;
  /** 追加（第12部）: 本番の送信サービスのユーザー名とパスワード（第53章 8節） */
  auth?: { user: string; pass: string } | undefined;
};

// 変更: 環境変数を直接読まず、引数で受け取る
export function createSmtpMailer({ host, port, from, secure = false, auth }: SmtpOptions): Mailer {
  const transporter = nodemailer.createTransport({ host, port, secure, ...(auth !== undefined && { auth }) });
  return {
    async send(mail) {
      await transporter.sendMail({ from, ...mail });
    },
  };
}
