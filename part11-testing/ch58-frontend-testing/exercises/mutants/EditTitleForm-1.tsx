// ミュータント: 前後の空白を除かずに onSave に渡す
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';

interface Props {
  initialTitle: string;
  onSave: (title: string) => Promise<void>;
  onCancel: () => void;
}

export function EditTitleForm({ initialTitle, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '') {
      setError('題名を入れてください');
      return;
    }
    // 変わっていなければ、保存せずに閉じる
    if (trimmed === initialTitle) {
      onCancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') onCancel();
  }

  return (
    <form aria-label="題名を直す" onSubmit={(e) => void handleSubmit(e)}>
      <label>
        題名
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? '保存中…' : '保存'}
      </button>
      <button type="button" onClick={onCancel}>
        やめる
      </button>
      {error !== null && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
