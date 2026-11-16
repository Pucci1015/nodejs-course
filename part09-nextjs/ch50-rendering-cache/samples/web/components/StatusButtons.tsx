'use client';
// 第49章 3.4節: 状態を変えるボタン。useOptimistic で、サーバの返事を待たずに新しい状態を出す
import { useOptimistic, useState, useTransition } from 'react';
import { setStatusAction } from '../app/tasks/actions.ts';
import { STATUSES, STATUS_LABELS, type Status } from '../lib/status.ts';

export function StatusButtons({ id, version, status }: { id: number; version: number; status: Status }) {
  // optimistic: トランジションの間だけ、仮の値。終わると、props の status（サーバで作り直した値）に戻る
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: Status) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatusAction(id, version, next);
      setError(result.error);
    });
  }

  return (
    <div>
      <p>
        状態: <strong>{STATUS_LABELS[optimistic]}</strong>
        {pending && '（保存しています…）'}
      </p>
      {STATUSES.filter((s) => s !== optimistic).map((s) => (
        <button key={s} type="button" disabled={pending} onClick={() => choose(s)}>
          {STATUS_LABELS[s]}にする
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
