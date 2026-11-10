// 第12章 4.1節で書く、delay.mjs を async/await で書き直したものの完成形
// 使い方（~/dev/part03/ch12-async で）: node samples/delay-await.mjs

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function delayFail(ms, message) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

async function main() {
  try {
    const text = await delay(500, 'こんにちは'); // 500ms 待ってから、次の行へ
    console.log('500ms 後:', text);
    const n = text.length;
    console.log('文字数:', n);
    await delayFail(100, 'わざと失敗'); // 失敗すると、ここで例外が投げられたのと同じになる
    console.log('ここは表示されない');
  } catch (err) {
    console.log('catch:', err.message);
  } finally {
    console.log('finally: 成功でも失敗でも実行');
  }
  return 'main の戻り値';
}

const result = main();
console.log('main() の戻り値:', result); // async 関数は、必ず Promise を返す
console.log('await すると:', await result);
