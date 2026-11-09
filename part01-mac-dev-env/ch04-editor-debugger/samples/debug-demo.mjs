// デバッガの操作を練習するための小さなプログラム（第4章 10節）
//
// 練習の手順（VS Code の JavaScript Debug Terminal で `node debug-demo.mjs 3` を実行）:
//   1. 【ブレークポイント】行(A) に置いて実行し、止まったら「変数」で tasks の中身を見る
//   2. 【ステップオーバー】F10 で1行ずつ進め、summary の値が変わる様子を見る
//   3. 【ステップイン】行(B) で F11 を押して formatTask の中に入る。Shift + F11 で戻る
//   4. 【条件付きブレークポイント】行(C) に条件 `task.priority >= 3` を付け、止まった task を確かめる
//   5. 【ログポイント】行(C) を右クリック →「Add Logpoint」で `{task.title}: {task.priority}` と入力
//   6. 【ウォッチ式】`tasks.filter(t => !t.done).length` を登録し、ステップのたびに見る
//   7. 【コールスタック】formatTask の中で止まったとき、呼び出し元の main の変数も見られることを確かめる
//   8. 【例外で止まる】「Uncaught Exceptions」にチェックを入れ、引数に 99 を渡して実行する

const tasks = [
  { id: 1, title: '牛乳を買う', priority: 1, done: true },
  { id: 2, title: 'レポートを書く', priority: 3, done: false },
  { id: 3, title: '部屋を掃除する', priority: 2, done: false },
  { id: 4, title: '発表の準備', priority: 5, done: false },
];

function formatTask(task) {
  const mark = task.done ? '✓' : ' ';
  const stars = '★'.repeat(task.priority);
  return `[${mark}] ${task.title} ${stars}`;
}

function findTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error(`タスク ${id} は見つかりません`);
  }
  return task;
}

function main() {
  const summary = { total: 0, done: 0, highPriority: 0 }; // 行(A)
  for (const task of tasks) {
    summary.total += 1;
    if (task.done) summary.done += 1;
    if (task.priority >= 3) summary.highPriority += 1; // 行(C)
    console.log(formatTask(task)); // 行(B)
  }
  console.log(summary);

  const id = Number(process.argv[2] ?? 1);
  console.log('選んだタスク:', findTask(id).title);
}

main();
