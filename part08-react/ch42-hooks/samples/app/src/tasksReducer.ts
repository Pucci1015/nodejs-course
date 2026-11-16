// 第42章 8節: 「今の state と出来事（action）から、次の state を返す」関数
export type Task = { id: number; title: string; done: boolean };

export type Action =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number };

export function tasksReducer(tasks: Task[], action: Action): Task[] {
  switch (action.type) {
    case 'added': {
      const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
      return [...tasks, { id, title: action.title, done: false }];
    }
    case 'toggled':
      return tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'deleted':
      return tasks.filter((t) => t.id !== action.id);
  }
}
