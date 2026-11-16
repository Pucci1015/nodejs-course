// 第41章 練習問題6の模範解答: 題名と締め切りの、制御されたフォーム
import { type FormEvent, useState } from 'react';

type Props = { onAdd: (input: { title: string; dueDate: string | null }) => void };

export function NewTaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const t = title.trim();
    if (t === '') {
      setError('題名を入れてください');
      return;
    }
    if (t.length > 100) {
      setError('題名は 100 文字までです');
      return;
    }
    onAdd({ title: t, dueDate: dueDate === '' ? null : dueDate });
    setTitle('');
    setDueDate('');
    setError('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        題名
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        締め切り
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <button>追加</button>
      {error !== '' && <p role="alert">{error}</p>}
    </form>
  );
}
