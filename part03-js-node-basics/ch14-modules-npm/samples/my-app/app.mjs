// 第14章 6〜10節で作る my-app の完成形
// 使い方: cd samples/my-app → npm install → npm start
import ms from 'ms'; // node_modules/ms を読む（ms は CommonJS のパッケージ）

console.log('2日は', ms('2 days'), 'ミリ秒');
console.log('60000ミリ秒は', ms(60_000));
