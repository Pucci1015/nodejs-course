// 第43章 2節: useEffect と fetch で、自分で読み込む。状態をユニオンで持ち、古い応答を捨てる
import { useEffect, useState } from 'react';
import { listTasks } from './api.ts';
import type { Status, Task } from './schemas.ts';

type Filter = Status | 'all';
type Load = { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; tasks: Task[] };

export function PlainList() {
  const [filter, setFilter] = useState<Filter>('all');
  // 結果と一緒に「どの絞り込みの結果か」を覚えておく
  const [result, setResult] = useState<{ filter: Filter; load: Load } | null>(null);
  // 今の絞り込みの結果がまだ無ければ「読み込み中」。state にせず、計算で決める（第42章 4節）
  const load: Load = result?.filter === filter ? result.load : { status: 'pending' };

  useEffect(() => {
    // 後片付けで止める。filter を素早く切り替えたとき、前のリクエストの応答で上書きしない
    const controller = new AbortController();
    listTasks(filter, controller.signal).then(
      (tasks) => setResult({ filter, load: { status: 'success', tasks } }),
      (error: unknown) => {
        if (controller.signal.aborted) return; // 止めたのは自分なので、エラーにしない
        setResult({ filter, load: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } });
      },
    );
    return () => controller.abort();
  }, [filter]);

  return (
    <section>
      <h2>useEffect で読む</h2>
      <select aria-label="状態" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
        <option value="all">すべて</option>
        <option value="todo">未着手</option>
        <option value="doing">作業中</option>
        <option value="done">完了</option>
      </select>
      {load.status === 'pending' && <p>読み込み中…</p>}
      {load.status === 'error' && <p role="alert">読み込めませんでした: {load.error.message}</p>}
      {load.status === 'success' && (
        <ul>
          {load.tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
