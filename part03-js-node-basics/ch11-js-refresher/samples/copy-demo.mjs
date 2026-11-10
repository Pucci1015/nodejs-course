// 参照とコピー（第11章 8節）
// 使い方: node copy-demo.mjs

console.log('== 1. オブジェクトは「参照」で受け渡される（Python と同じ）==');
const original = { title: '牛乳を買う', tags: ['買い物'], due: new Date('2026-11-05T09:00:00Z') };
const alias = original;
alias.title = '豆乳を買う';
console.log(`original.title = ${original.title}（alias と同じオブジェクト）`);

function rename(task) {
  task.title = '関数の中で変えた'; // 引数で受け取ったオブジェクトを変えると、呼んだ側のものも変わる
}
rename(original);
console.log(`original.title = ${original.title}`);

console.log('\n== 2. === は「同じオブジェクトか」を比べる ==');
console.log(`{ a: 1 } === { a: 1 } → ${({ a: 1 }) === ({ a: 1 })}`);
console.log(`[1, 2] === [1, 2] → ${[1, 2] === [1, 2]}`);
console.log(`JSON で比べる → ${JSON.stringify({ a: 1, b: 2 }) === JSON.stringify({ b: 2, a: 1 })}（キーの順番で結果が変わるので、比較には向かない）`);

console.log('\n== 3. スプレッドは「浅い」コピー ==');
const shallow = { ...original };
shallow.title = '浅いコピーの title';
shallow.tags.push('浅いコピーで追加');
console.log(`original.title = ${original.title}（変わらない）`);
console.log(`original.tags  = ${JSON.stringify(original.tags)}（中の配列は共有している）`);

console.log('\n== 4. JSON を通したコピーの問題 ==');
const viaJson = JSON.parse(JSON.stringify(original));
console.log(`typeof viaJson.due = ${typeof viaJson.due}（Date が文字列になる）`);
console.log(`JSON.stringify({ a: undefined, f() {}, n: NaN }) = ${JSON.stringify({ a: undefined, f() {}, n: NaN })}`);

console.log('\n== 5. structuredClone は「深い」コピー ==');
const deep = structuredClone(original);
deep.tags.push('深いコピーで追加');
console.log(`original.tags = ${JSON.stringify(original.tags)}（変わらない）`);
console.log(`deep.due instanceof Date = ${deep.due instanceof Date}`);
try {
  structuredClone({ f() {} });
} catch (err) {
  console.log(`関数はコピーできない: ${err.name}`);
}

console.log('\n== 6. const は「変数の付け替え」を禁止するだけ。中身は変えられる ==');
const frozenList = Object.freeze(['a', 'b']);
const list = ['a', 'b'];
list.push('c'); // const でも push できる
console.log(`list = ${JSON.stringify(list)}`);
try {
  frozenList.push('c'); // freeze したものは変えられない（strict モードではエラー）
} catch (err) {
  console.log(`freeze した配列に push: ${err.name}: ${err.message}`);
}
