// 練習問題2 の模範解答: HMAC を作る（make）コマンドと、確かめる（check）コマンド
// 使い方: node hmac-v2.mjs make 値 / node hmac-v2.mjs check 値 HMAC
import crypto from 'node:crypto';

const secret = 'dev-only-secret-change-me'; // 練習用の仮の鍵

function mac(text) {
  return crypto.createHmac('sha256', secret).update(text).digest('base64url');
}

// 同じ鍵で計算し直して、受け取った HMAC と同じか
function check(text, tag) {
  return mac(text) === tag;
}

const command = process.argv[2];
const text = process.argv[3];
const tag = process.argv[4];

if (command === 'make' && text !== undefined) {
  console.log(mac(text));
} else if (command === 'check' && text !== undefined && tag !== undefined) {
  console.log(check(text, tag) ? '本物' : '偽物');
} else {
  console.log('使い方: node hmac-v2.mjs make 値 / node hmac-v2.mjs check 値 HMAC');
}
