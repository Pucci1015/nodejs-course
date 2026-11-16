// 第45章 8節: <dialog> の showModal で、本当に消すかを聞く
import { useEffect, useId, useRef } from 'react';

type Props = { title: string | null; onConfirm: () => void; onClose: () => void };

export function DeleteDialog({ title, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const open = title !== null;

  // React の外（ブラウザのダイアログの開け閉め）と合わせる
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // onClose: Esc で閉じたとき・close() したときに呼ばれる
    <dialog ref={ref} aria-labelledby={headingId} onClose={onClose}>
      <h2 id={headingId}>「{title}」を削除しますか？</h2>
      <p>削除すると、元に戻せません。</p>
      {/* showModal は、中の最初のボタンにフォーカスを移す。消さない方を先に置く（うっかり Enter で消さないように） */}
      <button type="button" onClick={onClose}>
        やめる
      </button>{' '}
      <button type="button" onClick={onConfirm}>
        削除する
      </button>
    </dialog>
  );
}
