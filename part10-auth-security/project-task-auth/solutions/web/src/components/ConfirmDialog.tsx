// 確かめのダイアログ（第45章 練習問題6と同じもの）
import { useEffect, useId, useRef, type ReactNode } from 'react';

type Props = { open: boolean; title: string; children?: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void };

export function ConfirmDialog({ open, title, children, confirmLabel = 'OK', onConfirm, onCancel }: Props): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    // 開く前にフォーカスのあった要素を覚え、閉じたら戻す
    const before = document.activeElement;
    dialog.showModal();
    // 消さない方のボタンにフォーカスを置く（うっかり Enter で決めないように）
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (before instanceof HTMLElement) before.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc。ブラウザに閉じさせず、親に「やめる」を伝える（開け閉めは open で決める）
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
      <div>
        <button ref={cancelRef} type="button" onClick={onCancel}>
          キャンセル
        </button>{' '}
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
