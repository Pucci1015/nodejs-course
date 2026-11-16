// 第41章 練習問題7の模範解答: 追加・完了の切り替え・削除ができる一覧（state は TaskBoard が持つ）
import { type FormEvent, useState } from 'react';
import type { Task } from './types.ts';

export function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState('');
  const left = tasks.filter((t) => t.status !== 'done').length;

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const t = title.trim();
    if (t === '') return;
    const id = Math.max(0, ...tasks.map((x) => x.id)) + 1;
    setTasks([...tasks, { id, title: t, status: 'todo', dueDate: null }]);
    setTitle('');
  }
  const toggle = (id: number) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)));
  const remove = (id: number) => setTasks(tasks.filter((t) => t.id !== id));

  return (
    <div>
      <p>残り {left} 件</p>
      <form onSubmit={add}>
        <input aria-label="新しいタスク" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button>追加</button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t.id)} />
              {t.title}
            </label>
            <button type="button" aria-label={`${t.title}を削除`} onClick={() => remove(t.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
