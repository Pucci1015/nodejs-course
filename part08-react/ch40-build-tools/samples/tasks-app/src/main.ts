// 第40章 5〜7節: 第39章の画面を TypeScript にし、Vite で動かす
import { listTasks, type Task } from './api.ts';

/** 要素を探す。無ければ、すぐに止める（戻り値は null にならないので、この後 ! も if も要らない） */
function $<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (el === null) throw new Error(`index.html に ${selector} がありません`);
  return el;
}

const statusText = $<HTMLParagraphElement>('#status');
const list = $<HTMLUListElement>('#tasks');
const statsButton = $<HTMLButtonElement>('#stats');
const statsResult = $<HTMLPreElement>('#stats-result');

let tasks: Task[] = [];

function renderTask(task: Task): HTMLLIElement {
  const li = document.createElement('li');
  li.textContent = task.dueDate === null ? task.title : `${task.title}（締め切り: ${task.dueDate}）`;
  li.dataset.status = task.status;
  return li;
}

async function load(): Promise<void> {
  statusText.textContent = '読み込み中…';
  try {
    tasks = await listTasks();
    statusText.textContent = `${tasks.length} 件`;
    list.replaceChildren(...tasks.map(renderTask));
  } catch (err) {
    statusText.textContent = `読み込めませんでした: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// 7節: import() は、押されたときに初めて stats.ts を読み込む
async function showStats() {
  const { summarize } = await import('./stats.ts');
  statsResult.textContent = summarize(tasks);
}
// addEventListener は、渡した関数の Promise を待たない。待たないことを void で書く（第37章 6節）
statsButton.addEventListener('click', () => void showStats());

void load();
