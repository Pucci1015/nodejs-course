// 練習問題7 の模範解答: 修正したタスク一覧のページ（fixed-page.html から読み込まれる）
let tasks = [];

const form = document.getElementById('form');
const list = document.getElementById('list');
const hideDone = document.getElementById('hide-done');
const error = document.getElementById('error');

function render() {
  list.innerHTML = '';
  // 修正2: チェックボックスの状態は .checked（true/false）。
  //        .value は常に文字列 "on" なので、条件が常に真になっていた。
  const visible = hideDone.checked ? tasks.filter((t) => !t.done) : tasks;
  for (const task of visible) {
    const li = document.createElement('li');
    li.textContent = task.title;
    li.className = task.done ? 'done' : '';
    list.append(li);
  }
}

// 修正3: イベントの登録は render の外で1回だけ行う。
//        render の中にあると、描画のたびにリスナーが1つずつ増え、
//        1回の送信で同じタスクが何件も追加されていた。
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('title');
  tasks.push({ title: input.value, done: false });
  input.value = '';
  render();
});

async function load() {
  try {
    // 修正1: tasks.json はページと同じフォルダにある。/api/tasks.json は存在しないので 404 だった。
    //        先頭に / を付けない相対パスにすると、ページの URL を基準に解決される。
    const res = await fetch('tasks.json');
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
