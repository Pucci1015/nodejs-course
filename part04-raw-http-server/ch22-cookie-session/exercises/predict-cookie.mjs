// 練習問題1: Cookie と乱数・base64url の結果を予想する
// 実行する前に 14 個の結果を予想して書き出してから: node predict-cookie.mjs
import crypto from 'node:crypto';
import { parseCookies, serializeCookie } from '../samples/cookie-basic.mjs';

const items = [
  () => parseCookies('a=1; b=2'),
  () => parseCookies('a=1;b=2'),
  () => parseCookies('sid=x; sid=y'),
  () => parseCookies('msg=hello%20world'),
  () => parseCookies('p=100%'),
  () => parseCookies('flag; ok=1'),
  () => parseCookies('t=abc=='),
  () => serializeCookie('name', '日本 語'),
  () => serializeCookie('sid', '', { maxAge: 0 }),
  () => crypto.randomBytes(32).toString('hex').length,
  () => crypto.randomBytes(32).toString('base64').length,
  () => crypto.randomBytes(32).toString('base64url').length,
  () => Buffer.from('eyJ1c2VyIjoxfQ', 'base64url').toString(),
  () => typeof Math.random().toString(36).slice(2),
];

items.forEach((f, i) => {
  let out;
  try {
    out = JSON.stringify(f());
  } catch (err) {
    out = `${err.name}: ${err.message}`;
  }
  console.log(`${String(i + 1).padStart(2)}: ${out}`);
});
