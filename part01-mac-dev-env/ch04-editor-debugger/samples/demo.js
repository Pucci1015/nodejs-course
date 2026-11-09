// demo.html から読み込まれる JavaScript（第4章 11節）
// DevTools で試すこと:
//   - Sources パネルで render 関数の中にブレークポイントを置き、タスクを追加して止める
//   - Elements パネルで <ul id="list"> を右クリック → Break on → subtree modifications
//   - Console で tasks と入力して中身を見る。console.table(tasks) も試す
//   - Network パネルで、demo.html と demo.js が 200 で届いていることを確かめる
const tasks = [
  { title: '牛乳を買う', done: true },
  { title: 'レポートを書く', done: false },
];

const list = document.getElementById('list');
const count = document.getElementById('count');

function render() {
  list.innerHTML = '';
  for (const [i, task] of tasks.entries()) {
    const li = document.createElement('li');
    li.textContent = task.title; // textContent は HTML として解釈しない（XSS 対策。第4部・第10部）
    li.className = task.done ? 'done' : '';
    li.addEventListener('click', () => {
      tasks[i].done = !tasks[i].done;
      render();
    });
    list.append(li);
  }
  const rest = tasks.filter((t) => !t.done).length;
  count.textContent = `残り ${rest} 件（クリックで完了を切り替え）`;
}

document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault(); // フォームを送信してページが再読み込みされるのを止める
  const input = document.getElementById('title');
  tasks.push({ title: input.value, done: false });
  input.value = '';
  render();
});

render();
