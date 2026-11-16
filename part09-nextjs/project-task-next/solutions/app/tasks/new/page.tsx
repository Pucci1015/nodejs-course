// 作る（2.3節）
import type { Metadata } from 'next';
import { TaskForm } from '../../../components/TaskForm.tsx';
import { createTaskAction } from '../actions.ts';

export const metadata: Metadata = { title: '新しいタスク' };

export default function NewTaskPage() {
  return (
    <>
      <h1>新しいタスク</h1>
      <TaskForm action={createTaskAction} initial={{ title: '', dueDate: '' }} submitLabel="作る" pendingLabel="作っています…" />
    </>
  );
}
