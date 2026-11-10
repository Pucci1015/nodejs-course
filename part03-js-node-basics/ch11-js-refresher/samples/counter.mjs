// 第11章 3.2節で書く、クロージャのカウンタの完成形
// 使い方（~/dev/part03/ch11-js-refresher で）: node samples/counter.mjs

function makeCounter() {
  let count = 0; // makeCounter が終わっても、返した関数が使い続ける
  return {
    increment: () => {
      count = count + 1;
      return count;
    },
    get: () => count,
  };
}

const a = makeCounter();
const b = makeCounter();
a.increment();
a.increment();
b.increment();
console.log(`a: ${a.get()}、b: ${b.get()}`); // それぞれ別の count を持つ
console.log(`count は外から見えない: ${a.count}`);
