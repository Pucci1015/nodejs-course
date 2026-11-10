// 処理されなかった失敗（unhandled rejection）（第12章 5節）
// 使い方: node unhandled-demo.mjs 番号
//   1: await し忘れた Promise が失敗する → プロセスが終わる
//   2: try/catch の中でも、await しなければ受け取れない
//   3: 後で catch を付けても間に合わない
//   4: process.on('unhandledRejection') で、記録してから終わる

const fail = (message, ms = 10) => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

async function saveLog(message) {
  await fail(`ログの保存に失敗: ${message}`);
}

const which = process.argv[2];

if (which === '1') {
  console.log('saveLog を呼ぶ（await しない）');
  saveLog('ログイン'); // 戻り値の Promise を誰も受け取らない
  setTimeout(() => console.log('この行は表示されるか？'), 100);
} else if (which === '2') {
  try {
    saveLog('ログイン'); // await が無いので、try を抜けた後で失敗する
    console.log('try の中は、エラーにならずに通り過ぎる');
  } catch (err) {
    console.log('ここには来ない', err);
  }
} else if (which === '3') {
  const p = fail('すぐ失敗する', 0);
  setTimeout(() => {
    p.catch((err) => console.log(`遅れて catch: ${err.message}`)); // 失敗した時点で catch が無かった
  }, 50);
} else if (which === '4') {
  process.on('unhandledRejection', (reason) => {
    // 本番では、ここでログを送ってから終わらせる。続けて動かすのは危険（状態が壊れている可能性がある）
    console.error(`[unhandledRejection] ${reason.message}`);
    process.exitCode = 1;
  });
  saveLog('ログイン');
  setTimeout(() => console.log('（ハンドラがあると、プロセスは止まらずに続く）'), 100);
} else {
  console.log('使い方: node unhandled-demo.mjs 1|2|3|4');
}
