// 第41章 6・7節: 入力欄の文字を state に持つ（制御されたコンポーネント）。送られたら onAdd を呼ぶ
import { type FormEvent, useState } from 'react';

type Props = {
  onAdd: (title: string) => void;
};

export function TaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const t = title.trim();
    if (t === '') return;
    onAdd(t);
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="やること" />
      <button disabled={title.trim() === ''}>追加</button>
    </form>
  );
}
