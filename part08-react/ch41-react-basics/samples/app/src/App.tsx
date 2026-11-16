// 第41章 7節: タスクの配列（state）は、それを使う部品の共通の親（App）が持つ
import { useState } from 'react';
import { Counter } from './Counter.tsx';
import { TaskForm } from './TaskForm.tsx';
import { TaskList } from './TaskList.tsx';
import type { Task } from './types.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-20' },
  { id: 2, title: '第41章を読む', status: 'doing', dueDate: null },
  { id: 3, title: '<b>太字？</b>', status: 'done', dueDate: null },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const left = tasks.filter((t) => t.status !== 'done').length;

  function addTask(title: string) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks([...tasks, { id, title, status: 'todo', dueDate: null }]); // 新しい配列を作って渡す
  }

  function toggleTask(id: number) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)));
  }

  return (
    <main>
      <h1>タスク（残り {left} 件）</h1>
      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} />
      <Counter />
    </main>
  );
}
