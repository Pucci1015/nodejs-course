// 第39章 練習問題2の模範解答: 一覧を作り直す・状態ごとに数える

/**
 * ul の中身を、tasks の <li> で置き換える。空なら「タスクはありません」の <li class="empty"> を1つ
 * @returns {number} 出したタスクの数
 */
export function renderList(ul, tasks) {
  if (tasks.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'タスクはありません';
    ul.replaceChildren(li);
    return 0;
  }
  ul.replaceChildren(
    ...tasks.map((task) => {
      const li = document.createElement('li');
      li.dataset.id = String(task.id);
      li.textContent = task.title;
      return li;
    }),
  );
  return tasks.length;
}

/** 状態ごとの数。無い状態も 0 で入れる */
export function countByStatus(tasks) {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}
