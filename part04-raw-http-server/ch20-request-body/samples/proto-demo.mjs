// JSON の "__proto__" と、プロトタイプ汚染（第20章 7節）
// 使い方: node proto-demo.mjs
// サーバは使わない。受け取った JSON を、よくある書き方でオブジェクトに混ぜると何が起きるかを見る
const body = '{"theme":"dark","__proto__":{"isAdmin":true}}';

console.log('--- JSON.parse そのもの');
const data = JSON.parse(body);
console.log('Object.keys(data)      →', Object.keys(data)); // __proto__ は、ふつうのキーとして入る
console.log('data.isAdmin           →', data.isAdmin); // JSON.parse だけなら、まだ何も起きない

console.log('\n--- Object.assign で、自分の設定に混ぜる');
const settings = Object.assign({ theme: 'light' }, data);
console.log('settings.theme         →', settings.theme);
console.log('settings.isAdmin       →', settings.isAdmin, '（settings のプロトタイプが差し替わった）');

console.log('\n--- よくある「深い」マージの関数');
function naiveMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object') {
      target[key] ??= {};
      naiveMerge(target[key], source[key]); // key が "__proto__" だと、target[key] は Object.prototype
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
const user = {};
naiveMerge({}, data);
console.log('関係ない user.isAdmin  →', user.isAdmin, '（すべてのオブジェクトの元 Object.prototype が書き換わった）');
console.log('({}).isAdmin           →', ({}).isAdmin);
delete Object.prototype.isAdmin; // 後片付け
console.log('片付けた後 ({}).isAdmin →', ({}).isAdmin);
