// 3.1節: nodemailer で、練習用の SMTP サーバ（Mailpit か tools/fake-smtp.ts）にメールを送る
// 動かし方: node samples/send-mail.ts   （先に、別のターミナルで Mailpit か npm run mail を動かしておく）
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false, // 最初から TLS でつなぐか（465 番のとき true）。練習用のサーバは TLS を使わない
});

const info = await transporter.sendMail({
  from: '"タスク管理" <no-reply@example.test>',
  to: 'alice@example.com',
  subject: 'ねこからのお知らせ',
  text: 'こんにちは、alice さん。\nこれはテキストの本文です。',
  html: '<p>こんにちは、<b>alice</b> さん。</p><p>これは HTML の本文です。</p>',
});

console.log('messageId:', info.messageId);
console.log('accepted:', info.accepted);
console.log('response:', info.response);
