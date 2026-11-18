// 練習問題で使う、本文の samples/app/src/AddTaskForm.tsx のコピー（書き換えなくてよい）
// 第58章: タスクを足すフォーム。空なら送らない。送っている間はボタンを押せない。失敗したら理由を出す
import { useId, useRef, useState, type FormEvent } from 'react';

interface Props {
  onAdd: (title: string) => Promise<void>;
}

export function AddTaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '') {
      setError('題名を入れてください');
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加できませんでした');
    } finally {
      setPending(false);
    }
  }

  return (
    <form aria-label="タスクを足す" onSubmit={(e) => void handleSubmit(e)}>
      <label>
        新しいタスク
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? '追加中…' : '追加'}
      </button>
      {error !== null && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
