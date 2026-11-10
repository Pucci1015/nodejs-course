// スコープとクロージャ（第11章 2節・3節）
// 使い方: node scope-closure-demo.mjs

console.log('== 1. let と const はブロックスコープ ==');
{
  const inner = 'ブロックの中';
  console.log(inner);
}
console.log(typeof inner); // ブロックの外からは見えない → 'undefined'

console.log('\n== 2. 宣言より前に使うと（TDZ）==');
try {
  console.log(later); // eslint-disable-line no-use-before-define
  let later = 1; // eslint-disable-line prefer-const
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
console.log(hoisted()); // 関数宣言は、宣言より前でも呼べる（ファイルの先頭に「巻き上げ」られる）
function hoisted() {
  return '関数宣言は巻き上げられる';
}

console.log('\n== 3. クロージャ: 関数は、作られた場所の変数を覚えている ==');
function makeCounter() {
  let count = 0; // makeCounter が終わっても、返した関数が使い続ける
  return {
    increment: () => ++count,
    get: () => count,
  };
}
const a = makeCounter();
const b = makeCounter();
a.increment();
a.increment();
b.increment();
console.log(`a: ${a.get()}、b: ${b.get()}（それぞれ別の count を持つ）`);
console.log(`count は外から触れない: ${'count' in a}`);

console.log('\n== 4. ループとクロージャ: var と let の違い ==');
const withVar = [];
for (var i = 0; i < 3; i++) withVar.push(() => i); // var は関数全体で1つの i
const withLet = [];
for (let j = 0; j < 3; j++) withLet.push(() => j); // let は繰り返しごとに新しい j
console.log('var:', withVar.map((f) => f()));
console.log('let:', withLet.map((f) => f()));

console.log('\n== 5. Python との違い: 外側の変数への代入 ==');
// Python では、内側の関数で外側の変数に代入するには nonlocal が要る。JavaScript では要らない
let total = 0;
const add = (n) => {
  total += n;
};
[1, 2, 3].forEach(add);
console.log(`total = ${total}`);

console.log('\n== 6. 既定の引数は、呼ぶたびに作られる ==');
// Python の def f(items=[]) は「同じリスト」を使い回す有名な罠。JavaScript は毎回新しく作る
function push(item, items = []) {
  items.push(item);
  return items;
}
console.log(push('a'), push('b'));
