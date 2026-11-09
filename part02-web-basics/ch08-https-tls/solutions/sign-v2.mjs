// 練習問題3 の模範解答: a の秘密鍵で作った署名は、b の公開鍵では確かめられない
// 使い方: node sign-v2.mjs
import crypto from 'node:crypto';

const a = crypto.generateKeyPairSync('ed25519');
const b = crypto.generateKeyPairSync('ed25519');

const message = Buffer.from('localhost の公開鍵はこれです');
const signature = crypto.sign(null, message, a.privateKey);

console.log(`a の公開鍵で確かめる: ${crypto.verify(null, message, a.publicKey, signature)}`);
console.log(`b の公開鍵で確かめる: ${crypto.verify(null, message, b.publicKey, signature)}`);
