// 第39章 練習問題1の模範解答: タスク1つ分の <li> を作る

/**
 * @param {{ id: number, title: string, status: string, dueDate: string | null }} task
 * @returns {HTMLLIElement}
 */
export function renderTask(task) {
  const li = document.createElement('li');
  li.dataset.id = String(task.id);
  li.dataset.status = task.status;
  if (task.status === 'done') li.classList.add('done');

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title; // innerHTML にしない（< や & を、文字のまま出す）
  li.append(title);

  if (task.dueDate !== null) {
    const small = document.createElement('small');
    small.textContent = `締め切り: ${task.dueDate}`;
    li.append(' ', small);
  }
  return li;
}
