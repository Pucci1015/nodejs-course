// 第44章 5節: 作ったら、そのタスクのページへ移る（useNavigate）
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateTask } from '../queries.ts';
import { TaskInputSchema } from '../schemas.ts';

export function NewTaskPage() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const create = useCreateTask();
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const r = TaskInputSchema.safeParse({ title, dueDate: '' });
        if (!r.success) return setError(r.error.issues[0]?.message ?? '');
        create.mutate(r.data, {
          onSuccess: (task) => void navigate(`/tasks/${task.id}`),
          onError: (err) => setError(err.message),
        });
      }}
    >
      <h1>新しいタスク</h1>
      <label>
        題名 <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button disabled={create.isPending}>作る</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
