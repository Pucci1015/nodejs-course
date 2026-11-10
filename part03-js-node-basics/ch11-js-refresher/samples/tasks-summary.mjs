// 第11章 7.1節で書く、配列のメソッドで集計するプログラムの完成形
// 使い方（~/dev/part03/ch11-js-refresher で）: node samples/tasks-summary.mjs

const tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'], minutes: 10 },
  { id: 2, title: '第11章を読む', done: true, tags: ['勉強'], minutes: 90 },
  { id: 3, title: '練習問題を解く', done: false, tags: ['勉強', 'Node.js'], minutes: 120 },
  { id: 4, title: 'パンを買う', done: true, tags: ['買い物'], minutes: 5 },
];

// filter で「未完了」だけにして、map でタイトルだけにする
const todoTitles = tasks.filter((t) => !t.done).map((t) => t.title);
console.log('未完了:', todoTitles);

// reduce で、minutes を足し合わせる（0 から始める）
const total = tasks.reduce((sum, t) => sum + t.minutes, 0);
console.log(`合計 ${total} 分`);

// find で、最初に条件に合うものを1つ
const long = tasks.find((t) => t.minutes > 60);
console.log(`60分を超える最初のタスク: ${long.title}`);

// toSorted で、短い順に並べた新しい配列（tasks は変わらない）
const byMinutes = tasks.toSorted((a, b) => a.minutes - b.minutes);
console.log('短い順:', byMinutes.map((t) => t.title));
