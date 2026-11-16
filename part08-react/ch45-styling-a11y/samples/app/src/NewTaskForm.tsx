// 第45章 6節: 名前・説明・間違いが、スクリーンリーダーにも伝わるフォーム
import { useId, useRef, useState, type FormEvent } from 'react';

export function NewTaskForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // useId: この部品を2つ置いても重ならない id を作る（label の htmlFor や aria-describedby で使う）
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (t === '') {
      setError('題名を入れてください');
      // 間違いのある入力欄に、フォーカスを戻す（どこを直せばよいか、すぐ分かるように）
      inputRef.current?.focus();
      return;
    }
    onAdd(t);
    setTitle('');
    setError('');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={id}>題名</label>
      <input
        ref={inputRef}
        id={id}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        aria-invalid={error !== ''}
        // 説明と間違いの文を、この入力欄の「説明」としてつなぐ（入力欄に来たときに読み上げられる）
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      <p id={hintId}>100 文字まで</p>
      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
      <button>追加</button>
    </form>
  );
}
