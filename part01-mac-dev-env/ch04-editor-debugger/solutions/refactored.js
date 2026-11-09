// 練習問題3 の模範解答: 書き換えた後のファイル
// node refactored.js の出力は、元の refactor-me.js と同じ。
// 切り出した関数の引数（ここでは i）は、VS Code が自動で決める。人によって形が少し違ってもかまわない。

let tasks = [
  { title: '牛乳を買う', priority: 1, done: true },
  { title: 'レポートを書く', priority: 3, done: false },
  { title: '部屋を掃除する', priority: 2, done: false },
  { title: '発表の準備', priority: 5, done: false },
  { title: '本を返す', priority: 4, done: true },
];

function show() {
  let n = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].done == false) {
      console.log(`- ${tasks[i].title} (優先度 ${tasks[i].priority})`);
      n = n + 1;
    }
  }
  console.log(`未完了: ${n}件`);

  let h = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].done == false && isHighPriority(i)) {
      h = h + 1;
    }
  }
  console.log(`うち優先度3以上: ${h}件`);
}

function isHighPriority(i) {
  return tasks[i].priority >= 3;
}

show();
