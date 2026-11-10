// 第15章 5節で書く、EventEmitter を使うプログラムの完成形
// 使い方（~/dev/part03/ch15-node-api で）: node samples/emitter.mjs
import { EventEmitter } from 'node:events';

const download = new EventEmitter();

download.on('progress', (percent) => console.log(`進み具合: ${percent}%`));
download.once('done', (info) => console.log('終わった:', info));

console.log('emit の前');
download.emit('progress', 50);
download.emit('progress', 100);
download.emit('done', { bytes: 1234 });
download.emit('done', { bytes: 9999 }); // once で登録したので、2回目は呼ばれない
console.log('emit の後');
