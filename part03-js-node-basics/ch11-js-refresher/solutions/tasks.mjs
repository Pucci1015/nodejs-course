// 練習問題2 の解答: 配列のメソッドでタスクを集計する

export function undoneTitles(tasks) {
  return tasks.filter((t) => !t.done).map((t) => t.title);
}

export function totalMinutes(tasks, onlyDone = false) {
  const targets = onlyDone ? tasks.filter((t) => t.done) : tasks;
  return targets.reduce((sum, t) => sum + t.minutes, 0);
}

export function countByTag(tasks) {
  const counts = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1; // まだ無ければ 0 として足す
    }
  }
  return counts;
}

export function sortByMinutes(tasks) {
  // toSorted は新しい配列を返す（sort だと tasks が並び変わる）
  return tasks.toSorted((a, b) => a.minutes - b.minutes || a.id - b.id);
}
