// 練習問題1 用: 結果を、実行する前に予想してください
// 使い方: node predict.mjs       （すべて）
//         node predict.mjs 5     （5番だけ）
import path from 'node:path';

const items = [
  () => path.join('/srv/app', 'public', '../uploads/a.png'),
  () => path.join('/srv/app', '/etc/passwd'),
  () => path.resolve('/srv/app', '/etc/passwd'),
  () => path.join('/srv/app/public', '../../../../etc/passwd'),
  () => path.basename('/srv/app/memo.txt/'),
  () => path.extname('photo.JPG'),
  () => path.extname('Makefile'),
  () => path.relative('/srv/app/public', '/srv/app/public/img/a.png'),
  () => path.relative('/srv/app/public', '/srv/app/secret.txt'),
  () => path.join('a', '', 'b'),
  () => path.normalize('./a/../../b'),
  () => Buffer.from('é').length,
  () => Buffer.from('é'.normalize('NFD')).length,
  () => Buffer.byteLength('😀') + '/' + '😀'.length,
  () => Buffer.from('68656c6c6f', 'hex').toString(),
];

const only = Number(process.argv[2]);
items.forEach((fn, i) => {
  if (only && only !== i + 1) return;
  let result;
  try {
    result = JSON.stringify(fn());
  } catch (err) {
    result = `${err.constructor.name}: ${err.message}`;
  }
  console.log(`${String(i + 1).padStart(2)}: ${result}`);
});
