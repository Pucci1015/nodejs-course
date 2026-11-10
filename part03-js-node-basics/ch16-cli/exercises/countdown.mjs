// 練習問題3: カウントダウンする CLI を作ってください。Ctrl+C（SIGINT）で止められたら、片付けて終わります。
// 要件は README と countdown.test.mjs にあります。
// 使い方: node countdown.mjs [秒数]     既定: 5
// 確かめ方: node --test countdown.test.mjs

// テストを速くするため、1回の間隔は環境変数 TICK_MS（ミリ秒）で変えられる。既定は 1000
const TICK_MS = Number(process.env.TICK_MS ?? 1000);

// ここを書く
