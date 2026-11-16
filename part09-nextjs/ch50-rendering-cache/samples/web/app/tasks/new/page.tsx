// 第49章 3.2節: /tasks/new。Server Component から、Server Action を Client Component に props で渡す
import type { Metadata } from 'next';
import { TaskForm } from '../../../components/TaskForm.tsx';
import { createTaskAction } from '../actions.ts';

export const metadata: Metadata = { title: '新しいタスク' };

export default function NewTaskPage() {
  return (
    <>
      <h1>新しいタスク</h1>
      {/* 関数は渡せない（第48章 3.3節）が、Server Action は渡せる。ブラウザには「呼び出し方」だけが届く */}
      <TaskForm action={createTaskAction} />
    </>
  );
}
