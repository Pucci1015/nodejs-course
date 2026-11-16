// 第45章 練習問題2の模範解答
import type { ReactNode } from 'react';

type Props = { icon: string; label: string; onClick: () => void; pressed?: boolean; disabled?: boolean };

export function IconButton({ icon, label, onClick, pressed, disabled = false }: Props): ReactNode {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} title={label}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
