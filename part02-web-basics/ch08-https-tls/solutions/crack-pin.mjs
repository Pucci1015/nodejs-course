// 練習問題6 の模範解答: SHA-256 で「ハッシュ化」した4桁の暗証番号を、0000〜9999 をすべて試して見つける
// 使い方: node crack-pin.mjs
// 問題に書かれたハッシュ値で仕組みを確かめるためのもの（他人のパスワードの解析に使ってはいけない）。
import crypto from 'node:crypto';

const target = '2c16a0622069b5e83fa149e604e24040856495fcd41b254301538a85f36b1f01';

// 1. SHA-256: 0000〜9999 をすべて試す
let start = performance.now();
let found = '見つかりませんでした';
for (let i = 0; i <= 9999; i++) {
  const pin = String(i).padStart(4, '0');
  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  if (hash === target) {
    found = pin;
    break; // 見つかったら for を抜ける
  }
}
console.log(`SHA-256: 暗証番号は ${found}（${(performance.now() - start).toFixed(1)} ミリ秒）`);

// 2. scrypt: 1回の計算にかかる時間を、20回の平均で測る
const salt = crypto.randomBytes(16); // ソルト: 利用者ごとに変える、ランダムな値
start = performance.now();
for (let i = 0; i < 20; i++) {
  crypto.scryptSync(String(i).padStart(4, '0'), salt, 32);
}
const scryptMs = (performance.now() - start) / 20;
const totalSec = (scryptMs * 10000) / 1000;
console.log(`scrypt: 1回 ${scryptMs.toFixed(1)} ミリ秒 → 10000通りを試すと約 ${totalSec.toFixed(0)} 秒`);
