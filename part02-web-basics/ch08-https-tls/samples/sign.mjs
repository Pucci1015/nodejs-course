// 電子署名を作って確かめる（第8章 2.4節で書くものの完成形）
// 使い方: node sign.mjs
import crypto from 'node:crypto';

// 鍵のペアを作る。privateKey は自分だけが持ち、publicKey は誰に見せてもよい
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
console.log(publicKey.export({ type: 'spki', format: 'pem' }));

// 秘密鍵で署名する
const message = Buffer.from('localhost の公開鍵はこれです');
const signature = crypto.sign(null, message, privateKey);
console.log(`署名（${signature.length} バイト）: ${signature.toString('base64')}`);

// 公開鍵で確かめる（誰でもできる）
console.log(`元の文を確かめる      : ${crypto.verify(null, message, publicKey, signature)}`);
const changed = Buffer.from('evil.example の公開鍵はこれです');
console.log(`書き換えた文を確かめる: ${crypto.verify(null, changed, publicKey, signature)}`);
