'use client';
// 第49章 練習問題7の模範解答: 完了のチェックボックス。useOptimistic で、返事を待たずにチェックを変える
import { useOptimistic, useState, useTransition } from 'react';

export function DoneToggle({ done, action }: { done: boolean; action: (done: boolean) => Promise<{ error: string | null }> }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await action(next);
      setError(result.error);
    });
  }

  return (
    <div>
      <label>
        <input type="checkbox" checked={optimistic} onChange={(e) => toggle(e.target.checked)} /> 完了
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
