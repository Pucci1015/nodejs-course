// 第39章 3〜7節: 練習用の API（http://127.0.0.1:9500）とつなぐ画面を、素の JavaScript で書く
// 画面は「状態（state）」から毎回作り直す。状態を変えるのは setState だけ
const API = 'http://127.0.0.1:9500';

const list = document.querySelector('#tasks');
const statusText = document.querySelector('#status');
const form = document.querySelector('#new-task');
const formError = document.querySelector('#form-error');

// 4節: 画面の状態。status は 'loading'・'error'・'success' のどれか
let state = { status: 'loading', tasks: [], error: null };

function setState(patch) {
  state = { ...state, ...patch };
  render();
}

// 3節: API を呼ぶ。2xx でなければ、problem+json の detail か title を持つエラーにする
class ApiError extends Error {
  constructor(status, problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

async function request(path, options = {}) {
  const res = await fetch(API + path, options);
  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw new ApiError(res.status, problem);
  }
  return res.status === 204 ? null : res.json();
}

// 2節: タスク1つ分の <li>
function renderTask(task) {
  const li = document.createElement('li');
  li.dataset.status = task.status;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = task.status === 'done';
  box.addEventListener('change', () => toggle(task));

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;

  const del = document.createElement('button');
  del.textContent = '削除';
  del.addEventListener('click', () => remove(task));

  li.append(box, ' ', title);
  if (task.dueDate !== null) li.append(` （締め切り: ${task.dueDate}）`);
  li.append(' ', del);
  return li;
}

// 4節: 状態から画面を作る
function render() {
  if (state.status === 'loading') statusText.textContent = '読み込み中…';
  else if (state.status === 'error') statusText.textContent = `読み込めませんでした: ${state.error}`;
  else statusText.textContent = state.tasks.length === 0 ? 'タスクはありません' : `${state.tasks.length} 件`;
  list.replaceChildren(...state.tasks.map(renderTask));
}

// 3節: 一覧を読む
async function load() {
  setState({ status: 'loading' });
  try {
    const page = await request('/api/tasks?limit=100&sort=dueDate');
    setState({ status: 'success', tasks: page.items, error: null });
  } catch (err) {
    setState({ status: 'error', error: err.message });
  }
}

// 5節: フォームで作る
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // ブラウザがページごと送り直すのを止める
  const data = new FormData(form);
  const body = { title: String(data.get('title')), dueDate: data.get('dueDate') || null };
  const button = form.querySelector('button');
  button.disabled = true; // 送っている間は、もう1回押せないように
  formError.textContent = '';
  try {
    await request('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    form.reset();
    await load();
  } catch (err) {
    formError.textContent = err.problem?.errors?.[0]?.detail ?? err.message;
  } finally {
    button.disabled = false;
  }
});

// 6節: 変える・消すときは If-Match に、読んだときの version を入れる。違えば 412
async function toggle(task) {
  try {
    await request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': `"${task.version}"` },
      body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }),
    });
  } catch (err) {
    alert(err.status === 412 ? 'ほかの画面で変えられていました。読み直します' : err.message);
  }
  await load();
}

async function remove(task) {
  try {
    await request(`/api/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
  } catch (err) {
    alert(err.status === 412 ? 'ほかの画面で変えられていました。読み直します' : err.message);
  }
  await load();
}

// 7節: サーバで起きたことを SSE で受け取り、状態に当てる
const events = new EventSource(`${API}/api/events`);
events.addEventListener('task.created', (e) => {
  const task = JSON.parse(e.data);
  if (!state.tasks.some((t) => t.id === task.id)) setState({ tasks: [...state.tasks, task] });
});
events.addEventListener('task.updated', (e) => {
  const task = JSON.parse(e.data);
  setState({ tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) });
});
events.addEventListener('task.deleted', (e) => {
  const task = JSON.parse(e.data);
  setState({ tasks: state.tasks.filter((t) => t.id !== task.id) });
});
events.addEventListener('reset', () => load()); // 送り直せないほど離れていたら、全部読み直す

load();
