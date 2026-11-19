// ラベル・入力・間違いの文の組（第45章 6節）
import { useId, type ReactNode } from 'react';

type Props = {
  label: string;
  name: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  /** 入力の下に出す説明（パスワードの決まりなど） */
  hint?: string;
  /** パスワードマネージャに、何の欄かを伝える（email・current-password・new-password） */
  autoComplete: string;
};

export function Field({ label, name, type, value, onChange, error, hint, autoComplete }: Props): ReactNode {
  const id = useId();
  const describedBy = [hint !== undefined ? `${id}-hint` : '', error !== undefined ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
      />
      {hint !== undefined && (
        <>
          <br />
          <small id={`${id}-hint`}>{hint}</small>
        </>
      )}
      {error !== undefined && (
        <span id={`${id}-error`} className="error">
          {error}
        </span>
      )}
    </p>
  );
}
