// 鍵交換（X25519）で、2人が同じ秘密の値を得る（第8章 2.5節で書くものの完成形）
// 使い方: node key-exchange.mjs
import crypto from 'node:crypto';

// クライアントとサーバが、それぞれ使い捨ての鍵のペアを作る
const client = crypto.generateKeyPairSync('x25519');
const server = crypto.generateKeyPairSync('x25519');

// 送り合うのは公開鍵だけ。「自分の秘密鍵」と「相手の公開鍵」から計算する
const clientSecret = crypto.diffieHellman({ privateKey: client.privateKey, publicKey: server.publicKey });
const serverSecret = crypto.diffieHellman({ privateKey: server.privateKey, publicKey: client.publicKey });

console.log(`クライアントが計算した値: ${clientSecret.toString('hex')}`);
console.log(`サーバが計算した値      : ${serverSecret.toString('hex')}`);
console.log(`一致: ${clientSecret.equals(serverSecret)}`);
