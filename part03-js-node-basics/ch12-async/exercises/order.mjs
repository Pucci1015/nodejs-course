// 練習問題1 用: 表示される順番を、実行する前に予想してください
// 使い方: node order.mjs

const log = (s) => console.log(s);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function task(name, ms) {
  log(`${name}: 開始`);
  await wait(ms);
  log(`${name}: 終了`);
  return name;
}

log('A');

const p1 = task('p1', 200);
const p2 = task('p2', 100);

log('B');

const first = await Promise.race([p1, p2]);
log(`C: race の結果は ${first}`);

const both = await Promise.all([p1, p2]);
log(`D: all の結果は ${both}`);

[300, 100, 200].forEach(async (ms) => {
  await wait(ms);
  log(`E: forEach ${ms}`);
});
log('F');

for (const ms of [30, 10, 20]) {
  await wait(ms);
  log(`G: for...of ${ms}`);
}

const results = await Promise.allSettled([
  task('p3', 80),
  (async () => {
    throw new Error('p4 は失敗');
  })(),
]);
log(`H: ${results.map((r) => r.status).join(', ')}`);
