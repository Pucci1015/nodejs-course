// 新しいタスク（/tasks/new）。作れたら、そのタスクの画面へ
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCreateTask } from '../api/queries.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { TaskForm } from '../components/TaskForm.tsx';
import { PageTitle } from '../components/PageTitle.tsx';

export function NewTaskPage(): ReactNode {
  const create = useCreateTask();
  const navigate = useNavigate();
  const announce = useAnnounce();
  // この画面で1つの冪等キー。「作る」を2回押しても、通信が切れて送り直しても、タスクは1つ
  const [key] = useState(() => crypto.randomUUID());

  return (
    <>
      <PageTitle>新しいタスク</PageTitle>
      <TaskForm
        submitLabel="作る"
        onSubmit={async (input) => {
          const task = await create.mutateAsync({ input, key });
          announce(`「${task.title}」を作りました`);
          await navigate(`/tasks/${task.id}`);
        }}
      />
    </>
  );
}
