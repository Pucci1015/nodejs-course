'use client';
// タスクのページの「状態」（2.4節）。変えたらすぐに送る。API が断ったら（409 など）、元に戻して理由を出す
import { useOptimistic, useState, useTransition } from 'react';
import { setStatusAction } from '../app/tasks/actions.ts';
import { STATUSES, STATUS_LABELS, type Status } from '../lib/schemas.ts';

export function StatusSelect({ id, version, status }: { id: number; version: number; status: Status }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: Status) {
    startTransition(async () => {
      setOptimistic(next);
      setError((await setStatusAction(id, version, next)).error);
    });
  }

  return (
    <p>
      <label>
        状態{' '}
        <select value={optimistic} disabled={pending} onChange={(e) => choose(e.target.value as Status)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <span role="alert" className="error">
          {' '}
          {error}
        </span>
      )}
    </p>
  );
}
