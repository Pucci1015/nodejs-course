// 第45章: ランドマーク・見出し・本文へのリンク・知らせる場所（aria-live）を持つ画面
import { useState } from 'react';
import { DeleteDialog } from './DeleteDialog.tsx';
import { NewTaskForm } from './NewTaskForm.tsx';
import { TailwindCard } from './TailwindCard.tsx';
import { TaskCard } from './TaskCard.tsx';
import { ThemePicker } from './theme.tsx';
import type { Task } from './types.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null },
  { id: 2, title: '第8部を読む', status: 'doing', dueDate: null },
  { id: 3, title: '本を返す', status: 'done', dueDate: null },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [deleting, setDeleting] = useState<Task | null>(null);
  // 7節: 画面のどこかが変わったことを、スクリーンリーダーに知らせる文
  const [message, setMessage] = useState('');

  function add(title: string) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks([...tasks, { id, title, status: 'todo', dueDate: null }]);
    setMessage(`「${title}」を追加しました`);
  }

  function toggle(task: Task) {
    const status = task.status === 'done' ? 'todo' : 'done';
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    setMessage(`「${task.title}」を${status === 'done' ? '完了にしました' : '未着手に戻しました'}`);
  }

  function remove(task: Task) {
    setTasks(tasks.filter((t) => t.id !== task.id));
    setDeleting(null);
    setMessage(`「${task.title}」を削除しました`);
  }

  return (
    <>
      <a href="#main" className="skip-link">
        本文へ移動
      </a>
      <header>
        <nav aria-label="メニュー">
          <a href="#main">タスク</a> | <a href="#settings">設定</a>
        </nav>
      </header>
      <main id="main">
        <h1>タスク</h1>
        <section aria-labelledby="add-heading">
          <h2 id="add-heading">タスクを足す</h2>
          <NewTaskForm onAdd={add} />
        </section>
        <section aria-labelledby="list-heading">
          <h2 id="list-heading">一覧（CSS Modules）</h2>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => setDeleting(t)} />
            ))}
          </ul>
        </section>
        <section aria-labelledby="tw-heading">
          <h2 id="tw-heading">一覧（Tailwind CSS）</h2>
          <ul className="list-none p-0">
            {tasks.map((t) => (
              <TailwindCard key={t.id} task={t} />
            ))}
          </ul>
        </section>
        <section id="settings" aria-labelledby="settings-heading">
          <h2 id="settings-heading">設定</h2>
          <ThemePicker />
        </section>
        {/* 知らせる場所は、最初から置いておき、中の文だけを変える */}
        <p role="status" className="visually-hidden">
          {message}
        </p>
      </main>
      <DeleteDialog title={deleting?.title ?? null} onConfirm={() => deleting && remove(deleting)} onClose={() => setDeleting(null)} />
    </>
  );
}
