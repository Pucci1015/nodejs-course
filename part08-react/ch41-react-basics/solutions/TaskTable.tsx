// 第41章 練習問題2の模範解答: 見出しと一覧。空なら「タスクはありません」
import type { Task } from './types.ts';

export function TaskTable({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <section>
      <h2>
        {title}（{tasks.length} 件）
      </h2>
      {tasks.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
