// 第45章 練習問題3の模範解答
import { useId, type ReactNode } from 'react';

type Props = { label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string; required?: boolean };

export function TextField({ label, value, onChange, hint, error, required = false }: Props): ReactNode {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
      />
      {hint && <p id={hintId}>{hint}</p>}
      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
