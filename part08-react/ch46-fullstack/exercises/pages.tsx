// 第46章 練習問題5で使うページ（書き換えなくてよい）
export type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null };

export function TaskListPage({ tasks }: { tasks: Task[] }) {
  return (
    <section>
      <h1>タスク（{tasks.length} 件）</h1>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <a href={`/tasks/${t.id}`}>{t.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TaskPage({ task }: { task: Task }) {
  return <h1>{task.title}</h1>;
}

export function NotFoundPage() {
  return <h1>ページが見つかりません</h1>;
}
