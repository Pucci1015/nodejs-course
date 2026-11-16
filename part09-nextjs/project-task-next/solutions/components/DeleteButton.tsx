'use client';
// 「消す」（2.4節）。ダイアログで確かめてから消す。開いたら、フォーカスは「キャンセル」に置く（第45章 8節）
import { useId, useRef, useState, useTransition } from 'react';
import { deleteTaskAction } from '../app/tasks/actions.ts';

export function DeleteButton({ id, version, title }: { id: number; version: number; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    startTransition(async () => {
      // 消せたら、Server Action の redirect で一覧に移る。戻ってきたら、失敗している
      const result = await deleteTaskAction(id, version, title);
      dialog.current?.close();
      setError(result.error);
    });
  }

  return (
    <>
      <button type="button" className="danger" onClick={() => dialog.current?.showModal()}>
        消す
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <dialog ref={dialog} aria-labelledby={headingId}>
        <h2 id={headingId}>「{title}」を消しますか</h2>
        {/* autoFocus: ダイアログを開くと、ここにフォーカスが移る */}
        <button type="button" autoFocus onClick={() => dialog.current?.close()}>
          キャンセル
        </button>{' '}
        <button type="button" className="danger" disabled={pending} onClick={confirm}>
          {pending ? '消しています…' : '消す'}
        </button>
      </dialog>
    </>
  );
}
