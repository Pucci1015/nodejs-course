// 分割代入・スプレッド・配列のメソッド（第11章 6節・7節）
// 使い方: node array-demo.mjs

const tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'], minutes: 10 },
  { id: 2, title: '第11章を読む', done: true, tags: ['勉強'], minutes: 90 },
  { id: 3, title: '練習問題を解く', done: false, tags: ['勉強', 'Node.js'], minutes: 120 },
  { id: 4, title: 'パンを買う', done: true, tags: ['買い物'], minutes: 5 },
];

console.log('== 1. 分割代入 ==');
const [first, , third] = tasks; // 2つ目を飛ばす
const { title, done: isDone, priority = '普通' } = first; // 名前を変える・既定の値
console.log({ title, isDone, priority, third: third.title });
const { id, ...rest } = tasks[1]; // 残りをまとめる
console.log({ id, rest });

console.log('\n== 2. スプレッド: コピーしながら一部を変える ==');
const updated = { ...first, done: true }; // first 自体は変わらない
console.log(`first.done = ${first.done}、updated.done = ${updated.done}`);
const merged = [...tasks.slice(0, 1), { id: 5, title: '新しいタスク' }];
console.log(merged.map((t) => t.title));

console.log('\n== 3. オプショナルチェーン（?.）と Null 合体（??）==');
const config = { server: { port: 0 } };
console.log(`config.db?.host = ${config.db?.host}`); // config.db が無くても TypeError にならない
console.log(`port || 3000 = ${config.server.port || 3000}`); // 0 は falsy なので 3000 になってしまう
console.log(`port ?? 3000 = ${config.server.port ?? 3000}`); // null と undefined のときだけ 3000

console.log('\n== 4. map・filter・reduce ==');
const todoTitles = tasks.filter((t) => !t.done).map((t) => t.title);
console.log('未完了:', todoTitles);
const totalMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
console.log(`合計 ${totalMinutes} 分`);

console.log('\n== 5. find・some・every・flatMap ==');
console.log(`find: ${tasks.find((t) => t.minutes > 60)?.title}`);
console.log(`some（完了がある）: ${tasks.some((t) => t.done)}、every（すべて完了）: ${tasks.every((t) => t.done)}`);
const allTags = [...new Set(tasks.flatMap((t) => t.tags))]; // Set で重複を取り除く
console.log('タグの一覧:', allTags);

console.log('\n== 6. Object.groupBy・Object.entries・Object.fromEntries ==');
const byTag = Object.groupBy(tasks, (t) => t.tags[0]);
console.log(Object.fromEntries(Object.entries(byTag).map(([tag, list]) => [tag, list.length])));

console.log('\n== 7. sort は元の配列を書き換える。数値は比較関数が必要 ==');
const nums = [10, 9, 1, 100, 25];
console.log('toSorted()           :', nums.toSorted()); // 文字列として比べる → [1, 10, 100, 25, 9]
console.log('toSorted((a,b)=>a-b) :', nums.toSorted((a, b) => a - b));
console.log('nums（元のまま）     :', nums);
nums.sort((a, b) => b - a);
console.log('sort の後の nums     :', nums);
const byMinutes = tasks.toSorted((a, b) => a.minutes - b.minutes || a.id - b.id);
console.log('短い順:', byMinutes.map((t) => `${t.title}(${t.minutes})`).join(' / '));
console.log('日本語の並べ替え:', ['ぱん', 'はし', 'ばら', 'ハム'].toSorted((a, b) => a.localeCompare(b, 'ja')));

console.log('\n== 8. 反復の方法 ==');
for (const [index, task] of tasks.entries()) {
  if (index >= 2) break; // for...of は break できる（forEach はできない）
  console.log(index, task.title);
}
const map = new Map([['ryota', 3], ['hanako', 5]]); // キーに何でも使える。入れた順を保つ
for (const [name, n] of map) console.log(`${name}: ${n}`);
