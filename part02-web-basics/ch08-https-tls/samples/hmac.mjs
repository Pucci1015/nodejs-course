// HMAC を作って確かめる（第8章 2.3節で書くものの完成形）
// 使い方: node hmac.mjs
import crypto from 'node:crypto';

const secret = 'dev-only-secret-change-me'; // 練習用の仮の鍵。本物の鍵はファイルに書かない（第3章13節）

function mac(text) {
  return crypto.createHmac('sha256', secret).update(text).digest('base64url');
}

// サーバが作って、値と一緒に渡す
const tag = mac('user_id=42');
console.log(`user_id=42 の HMAC: ${tag}`);

// 戻ってきたら、同じ鍵で計算し直して比べる
console.log(`user_id=42 と HMAC を確かめる: ${mac('user_id=42') === tag ? '本物' : '偽物'}`);
console.log(`user_id=1  と HMAC を確かめる: ${mac('user_id=1') === tag ? '本物' : '偽物'}`);
