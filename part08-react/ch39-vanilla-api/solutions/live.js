// 第39章 練習問題8の模範解答: SSE のイベントを、タスクの一覧に当てる

/** 新しい配列を返す。元の配列は変えない */
export function applyEvent(tasks, type, task) {
  switch (type) {
    case 'task.created':
      return tasks.some((t) => t.id === task.id) ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task];
    case 'task.updated':
      // 古い知らせ（version が今のもの以下）は無視する
      return tasks.map((t) => (t.id === task.id && task.version > t.version ? task : t));
    case 'task.deleted':
      return tasks.filter((t) => t.id !== task.id);
    default:
      return tasks;
  }
}

/**
 * url の SSE につなぎ、イベントが来たら store の tasks に当てる。reset が来たら reload を呼ぶ
 * @returns {() => void} やめる関数
 */
export function connectLive(url, store, { reload, EventSourceImpl = EventSource }) {
  const es = new EventSourceImpl(url);
  for (const type of ['task.created', 'task.updated', 'task.deleted']) {
    es.addEventListener(type, (e) => {
      const task = JSON.parse(e.data);
      store.setState((s) => ({ tasks: applyEvent(s.tasks, type, task) }));
    });
  }
  es.addEventListener('reset', () => reload());
  return () => es.close();
}
