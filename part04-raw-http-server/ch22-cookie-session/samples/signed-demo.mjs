// 署名付きの値: 中身は読めるが、秘密の鍵を知らなければ、正しい署名は作れない（第22章 5節）
// 使い方: node signed-demo.mjs
//   Flask の session は、この仕組みで、中身を Cookie そのものに入れている
import crypto from 'node:crypto';

// 本物のアプリでは、鍵は環境変数などから読み、コードに書かない（第3部 第16章の .env）
const SECRET = 'dev-only-secret-change-me';

const mac = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

function sign(value, secret) {
  return `${value}.${mac(value, secret)}`;
}

function unsign(signed, secret) {
  const i = signed.lastIndexOf('.');
  if (i === -1) return null;
  const value = signed.slice(0, i);
  const given = Buffer.from(signed.slice(i + 1));
  const expected = Buffer.from(mac(value, secret));
  // 長さが違えば timingSafeEqual は例外を投げるので、先に比べる
  // timingSafeEqual: 何文字目まで合っていたかが、かかった時間から分からない比べ方
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return value;
}

const signed = sign('theme=dark', SECRET);
console.log('署名した値:          ', signed);
console.log('同じ鍵で確かめる:    ', unsign(signed, SECRET));
console.log('違う鍵で確かめる:    ', unsign(signed, 'another-secret'));
console.log('中身が1文字違うとき: ', unsign(signed.replace('dark', 'dart'), SECRET));
console.log('署名が無いとき:      ', unsign('theme=dark', SECRET));

console.log('\n中身は暗号化されていない。だれでも読める:');
const flaskLike = Buffer.from(JSON.stringify({ user_id: 1, theme: 'dark' })).toString('base64url');
console.log('  Cookie に入る値:', sign(flaskLike, SECRET));
console.log('  前半を base64url から戻すと:', Buffer.from(flaskLike, 'base64url').toString());
