// 順番に待つか、同時に待つか。Promise.all・allSettled・race・any（第12章 6節）
// 使い方: node timing-demo.mjs

const start = performance.now();
const t = () => `${String(Math.round(performance.now() - start)).padStart(4)}ms`;

/** 時間のかかる処理のまね。ms 後に、ok なら値で成功、そうでなければ失敗する */
function fakeFetch(name, ms, ok = true) {
  return new Promise((resolve, reject) =>
    setTimeout(() => (ok ? resolve(`${name} の結果`) : reject(new Error(`${name} は失敗`))), ms),
  );
}

console.log('== 1. 順番に await（直列）: 時間は足し算 ==');
let s = performance.now();
const a = await fakeFetch('ユーザー', 300);
const b = await fakeFetch('タスク', 200);
const c = await fakeFetch('通知', 100);
console.log(`  ${[a, b, c].join('、')}  → ${Math.round(performance.now() - s)}ms`);

console.log('\n== 2. 先に全部始めてから待つ（並行）: 時間はいちばん長いもの ==');
s = performance.now();
const [a2, b2, c2] = await Promise.all([fakeFetch('ユーザー', 300), fakeFetch('タスク', 200), fakeFetch('通知', 100)]);
console.log(`  ${[a2, b2, c2].join('、')}  → ${Math.round(performance.now() - s)}ms`);
console.log('  （結果の順番は、終わった順ではなく、渡した順）');

console.log('\n== 3. Promise.all は、1つでも失敗するとすぐに失敗する ==');
s = performance.now();
try {
  await Promise.all([fakeFetch('ユーザー', 300), fakeFetch('タスク', 100, false), fakeFetch('通知', 200)]);
} catch (err) {
  console.log(`  ${err.message}  → ${Math.round(performance.now() - s)}ms（他の処理の終わりを待たない）`);
}

console.log('\n== 4. Promise.allSettled は、全部終わるのを待って、それぞれの結果を返す ==');
const settled = await Promise.allSettled([fakeFetch('ユーザー', 100), fakeFetch('タスク', 50, false)]);
for (const r of settled) console.log(`  ${r.status}: ${r.status === 'fulfilled' ? r.value : r.reason.message}`);

console.log('\n== 5. Promise.race は最初に終わったもの、Promise.any は最初に成功したもの ==');
console.log(`  race: ${await Promise.race([fakeFetch('遅い', 200), fakeFetch('速い', 50)])}`);
try {
  await Promise.race([fakeFetch('遅い', 200), fakeFetch('速いが失敗', 50, false)]);
} catch (err) {
  console.log(`  race（最初が失敗）: ${err.message}`);
}
console.log(`  any: ${await Promise.any([fakeFetch('遅い', 200), fakeFetch('速いが失敗', 50, false)])}`);
try {
  await Promise.any([fakeFetch('A', 10, false), fakeFetch('B', 20, false)]);
} catch (err) {
  console.log(`  any（全部失敗）: ${err.name}、errors: ${err.errors.map((e) => e.message).join('、')}`);
}

console.log('\n== 6. await を後に書いても、Promise を作った時点で処理は始まっている ==');
s = performance.now();
const userPromise = fakeFetch('ユーザー', 300); // ここで始まる
const taskPromise = fakeFetch('タスク', 300); // ここで始まる
const user = await userPromise;
const task = await taskPromise; // すでに終わっている
console.log(`  ${user}、${task}  → ${Math.round(performance.now() - s)}ms`);
console.log(`\n全体: ${t()}`);
