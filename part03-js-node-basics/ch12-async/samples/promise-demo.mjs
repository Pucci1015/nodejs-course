// Promise の基本（第12章 3節・4節）
// 使い方: node promise-demo.mjs

/** ms ミリ秒後に value で成功する Promise を返す */
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
/** ms ミリ秒後に失敗する Promise を返す */
function failAfter(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

console.log('== 1. Promise は「後で結果が入る箱」==');
const p = delay(100, '結果');
console.log('作った直後:', p); // Promise { <pending> }
await p; // ES Modules では、関数の外でも await が使える（トップレベル await）
console.log('待った後:  ', p); // Promise { '結果' }

console.log('\n== 2. then はつなげられる。return した値が次に渡る ==');
const length = await delay(10, 'こんにちは')
  .then((text) => text.length) // 値を返す
  .then((n) => delay(10, n * 2)) // Promise を返すと、それを待ってから次へ
  .then((n) => {
    console.log(`  2倍: ${n}`);
    return n;
  });
console.log(`  最後の値: ${length}`);

console.log('\n== 3. 失敗は catch まで飛ぶ（途中の then は飛ばされる）==');
await failAfter(10, 'ネットワークが切れた')
  .then(() => console.log('  ここは実行されない'))
  .catch((err) => {
    console.log(`  catch: ${err.message}`);
    return '代わりの値'; // catch で値を返すと、成功に戻る
  })
  .then((v) => console.log(`  その後の then: ${v}`))
  .finally(() => console.log('  finally: 成功でも失敗でも実行'));

console.log('\n== 4. async 関数は、必ず Promise を返す ==');
async function getUser(id) {
  if (id <= 0) throw new RangeError(`id が正しくありません: ${id}`); // throw は reject になる
  await delay(10);
  return { id, name: 'ryota' }; // return は resolve になる
}
console.log('  getUser(1) の戻り値:', getUser(1));
console.log('  await した値:', await getUser(1));
try {
  await getUser(0);
} catch (err) {
  console.log(`  try/catch で受け取れる: ${err.name}: ${err.message}`);
}

console.log('\n== 5. new Promise の中の同期の処理は、すぐに実行される ==');
console.log('  (1) new Promise の前');
const q = new Promise((resolve) => {
  console.log('  (2) new Promise に渡した関数の中（すぐ実行される）');
  resolve('済み');
});
q.then((v) => console.log(`  (4) then の中: ${v}（すでに resolve 済みでも、次の機会まで待つ）`));
console.log('  (3) new Promise の後');
await q;

console.log('\n== 6. resolve や reject は、最初の1回だけが有効 ==');
const once = await new Promise((resolve, reject) => {
  resolve('1回目');
  resolve('2回目（無視される）');
  reject(new Error('これも無視される'));
});
console.log(`  ${once}`);
