// 第43章: 2節の PlainList と、3節からの TanStack Query の画面を並べる
import { NewTaskForm } from './NewTaskForm.tsx';
import { PlainList } from './PlainList.tsx';
import { useTaskEvents } from './queries.ts';
import { TaskList } from './TaskList.tsx';

export function App() {
  useTaskEvents(); // 7節
  return (
    <main>
      <h1>タスク（API とつなぐ）</h1>
      <NewTaskForm />
      <TaskList />
      <PlainList />
    </main>
  );
}
