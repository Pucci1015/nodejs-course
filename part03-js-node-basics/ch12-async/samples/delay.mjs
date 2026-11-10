// 第12章 3.2節・3.3節で書く、Promise を作って then でつなぐプログラムの完成形
// 使い方（~/dev/part03/ch12-async で）: node samples/delay.mjs

// ms ミリ秒たったら value で成功する Promise を返す
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ms ミリ秒たったら失敗する Promise を返す
function delayFail(ms, message) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

const p = delay(500, 'こんにちは');
console.log('作った直後:', p);

p.then((text) => {
  console.log('500ms 後:', text);
  return text.length; // 返した値は、次の then に渡る
})
  .then((n) => {
    console.log('文字数:', n);
    return delayFail(100, 'わざと失敗'); // 失敗する Promise を返す
  })
  .then(() => {
    console.log('ここは表示されない（前で失敗したので飛ばされる）');
  })
  .catch((err) => {
    console.log('catch:', err.message);
  })
  .finally(() => {
    console.log('finally: 成功でも失敗でも実行');
  });
