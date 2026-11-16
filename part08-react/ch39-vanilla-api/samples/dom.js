// 第39章 2節: データ（タスクのオブジェクト）から、画面の部品（DOM の要素）を作る
const tasks = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-20' },
  { id: 2, title: '<b>太字？</b>', status: 'doing', dueDate: null },
];

/** タスク1つ分の <li> を作る */
function renderTask(task) {
  const li = document.createElement('li');
  li.textContent = task.title; // 文字として入れる（< や > も、そのまま文字で出る）
  if (task.dueDate !== null) {
    const small = document.createElement('small');
    small.textContent = ` 締め切り: ${task.dueDate}`;
    li.append(small);
  }
  li.dataset.status = task.status; // <li data-status="todo">
  return li;
}

const ul = document.querySelector('#tasks');
ul.replaceChildren(...tasks.map(renderTask));
