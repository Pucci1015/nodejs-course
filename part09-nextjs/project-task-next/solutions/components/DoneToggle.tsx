'use client';
// 一覧の「完了（題名）」のチェック（第49章 3.4節・練習問題7）。返事を待たずにチェックを変え、失敗したら戻して理由を出す
import { useOptimistic, useState, useTransition } from 'react';
import { setStatusAction } from '../app/tasks/actions.ts';

type Props = { id: number; version: number; title: string; done: boolean };

export function DoneToggle({ id, version, title, done }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'status' | 'alert'; text: string } | null>(null);

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const { error } = await setStatusAction(id, version, next ? 'done' : 'todo');
      if (error) setMessage({ kind: 'alert', text: error });
      else setMessage({ kind: 'status', text: next ? `「${title}」を完了にしました` : `「${title}」を未着手に戻しました` });
    });
  }

  return (
    <>
      <label>
        <input type="checkbox" checked={optimistic} onChange={(e) => toggle(e.target.checked)} />
        <span className="visually-hidden">完了（{title}）</span>
      </label>
      {message?.kind === 'alert' && (
        <span role="alert" className="error">
          {message.text}
        </span>
      )}
      {/* 成功の知らせは、目では見えないが読み上げる（第45章 7節） */}
      <span role="status" className="visually-hidden">
        {message?.kind === 'status' ? message.text : ''}
      </span>
    </>
  );
}
