// 練習問題4 用: 実行する前に、それぞれの「→ ?」の結果を予想してください
// 使い方: node predict.mjs        （予想を書いてから実行する）
//         node predict.mjs 5      （5番だけを実行する）
// エラーになるものは「エラーの種類」（TypeError など）を予想してください。

const problems = [
  // 1
  () => [10, 1, 3].sort(),
  // 2
  () => [1, 2, 3].map(parseInt),
  // 3
  () => {
    const fns = [];
    for (let i = 0; i < 4; i++) {
      fns.push(() => i);
      i++;
    }
    return fns.map((f) => f());
  },
  // 4
  () => [] + {},
  // 5
  () => ({ a: 1, b: { c: 2 } }) === structuredClone({ a: 1, b: { c: 2 } }),
  // 6
  () => {
    const user = { name: 'alice', greet() { return `hi ${this.name}`; } };
    const { greet } = user;
    return greet();
  },
  // 7
  () => {
    const user = { name: 'alice', greet: () => `hi ${this?.name}` };
    return user.greet();
  },
  // 8
  () => {
    const a = { list: [1] };
    const b = { ...a };
    b.list.push(2);
    b.list = [9];
    return a.list;
  },
  // 9
  () => (0 || null) ?? 'default',
  // 10
  () => {
    let x = 1;
    {
      x = 2;
      let y = x;
    }
    return typeof y;
  },
  // 11
  () => {
    class A {
      #secret = 1;
      static peek(obj) { return #secret in obj ? obj.#secret : 'なし'; }
    }
    return [A.peek(new A()), A.peek({ secret: 1 })];
  },
  // 12
  () => ['a', 'b', 'c'].reduce((acc, x) => acc + x),
  // 13
  () => [3, 1, 2].reduce((max, x) => (x > max ? x : max)) + [].length,
  // 14
  () => {
    const counts = {};
    for (const word of ['constructor', 'map', 'map']) counts[word] = (counts[word] ?? 0) + 1;
    return counts;
  },
  // 15
  () => '👍'.length + [...'👍'].length,
];

const only = process.argv[2] ? Number(process.argv[2]) : null;
for (const [index, fn] of problems.entries()) {
  const n = index + 1;
  if (only && n !== only) continue;
  try {
    console.log(`${String(n).padStart(2)}:`, fn());
  } catch (err) {
    console.log(`${String(n).padStart(2)}: ${err.name}: ${err.message}`);
  }
}
