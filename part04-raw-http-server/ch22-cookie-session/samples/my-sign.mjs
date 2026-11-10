// 第22章 5節で書く、HMAC で値に署名し、確かめるプログラムの完成形
// 使い方（~/dev/part04/ch22-cookie-session で）: node samples/my-sign.mjs   （サーバは使わない）
import crypto from 'node:crypto';

const SECRET = 'dev-only-secret-change-me'; // 練習用。本物の鍵は環境変数から読む

function mac(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function sign(value) {
  return `${value}.${mac(value)}`;
}

function unsign(signed) {
  const i = signed.lastIndexOf('.');
  if (i === -1) return null;
  const value = signed.slice(0, i);
  const sent = Buffer.from(signed.slice(i + 1));
  const expected = Buffer.from(mac(value));
  if (sent.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sent, expected)) return null;
  return value;
}

const signed = sign('theme=dark');
console.log('署名した値     :', signed);
console.log('確かめる       :', unsign(signed));
console.log('中身を変えると :', unsign(signed.replace('dark', 'light')));
console.log('署名が無いと   :', unsign('theme=dark'));
