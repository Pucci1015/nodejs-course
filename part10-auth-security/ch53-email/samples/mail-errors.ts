// 3.3節: 送れなかったとき、nodemailer はどんなエラーを投げるか
// 動かし方: node samples/mail-errors.ts   （先に npm run mail。Mailpit では、決まった宛先で失敗させる仕組みが無い）
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({ host: '127.0.0.1', port: 1025, secure: false });
const broken = nodemailer.createTransport({ host: '127.0.0.1', port: 1026, secure: false }); // だれも待っていないポート

const tries = [
  { label: '一時的な失敗（451）', transporter, to: 'temp-fail@example.com' },
  { label: 'ずっと失敗（550）', transporter, to: 'no-such-user@example.com' },
  { label: 'つながらない', transporter: broken, to: 'alice@example.com' },
];

for (const { label, transporter: t, to } of tries) {
  try {
    await t.sendMail({ from: 'no-reply@example.test', to, subject: 'テスト', text: 'テスト' });
    console.log(label, '→ 送れた');
  } catch (err) {
    // nodemailer のエラーには、code・responseCode・permanent が付く（付かないこともあるので、in で確かめる）
    if (err instanceof Error) {
      const info = {
        code: 'code' in err ? err.code : undefined,
        responseCode: 'responseCode' in err ? err.responseCode : undefined,
        permanent: 'permanent' in err ? err.permanent : undefined,
      };
      console.log(label, '→', info);
    }
  }
}
