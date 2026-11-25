// 練習問題6: バグのあるタスク一覧のページ（buggy-page.html から読み込まれる）
let tasks = [];

const form = document.getElementById('form');
const list = document.getElementById('list');
const hideDone = document.getElementById('hide-done');
const error = document.getElementById('error');

function render() {
  list.innerHTML = '';
  const visible = hideDone.value ? tasks.filter((t) => !t.done) : tasks;
  for (const task of visible) {
    const li = document.createElement('li');
    li.textContent = task.title;
    li.className = task.done ? 'done' : '';
    list.append(li);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('title');
    tasks.push({ title: input.value, done: false });
    input.value = '';
    render();
  });
}

async function load() {
  try {
    const res = await fetch('/api/tasks.json');
    if (!res.ok) {
      throw new Error(`読み込みに失敗しました（${res.status}）`);
    }
    tasks = await res.json();
  } catch (err) {
    error.textContent = err.message;
  }
  render();
}

hideDone.addEventListener('change', render);
load();
