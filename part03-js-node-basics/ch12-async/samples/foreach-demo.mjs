// forEach と async の落とし穴（第12章 7節）
// 使い方: node foreach-demo.mjs

const ids = [3, 1, 2];
const fetchTask = (id) => new Promise((resolve) => setTimeout(() => resolve(`タスク${id}`), id * 100));

console.log('== 1. forEach に async 関数を渡す ==');
const results1 = [];
ids.forEach(async (id) => {
  results1.push(await fetchTask(id));
});
console.log(`  forEach の直後: ${JSON.stringify(results1)}（forEach は Promise を待たない）`);
await new Promise((r) => setTimeout(r, 400));
console.log(`  400ms 後: ${JSON.stringify(results1)}（終わった順に入る）`);

console.log('\n== 2. for...of で await（1つずつ順番に）==');
let s = performance.now();
const results2 = [];
for (const id of ids) results2.push(await fetchTask(id));
console.log(`  ${JSON.stringify(results2)}  ${Math.round(performance.now() - s)}ms`);

console.log('\n== 3. map で Promise の配列を作って Promise.all（同時に）==');
s = performance.now();
const results3 = await Promise.all(ids.map((id) => fetchTask(id)));
console.log(`  ${JSON.stringify(results3)}  ${Math.round(performance.now() - s)}ms`);

console.log('\n== 4. filter に async 関数を渡す ==');
const isDone = async (id) => id !== 1;
console.log(`  filter(async): ${JSON.stringify(ids.filter(isDone))}（Promise はオブジェクトなので、常に truthy）`);
const flags = await Promise.all(ids.map(isDone));
console.log(`  先に Promise.all してから filter: ${JSON.stringify(ids.filter((_, i) => flags[i]))}`);
