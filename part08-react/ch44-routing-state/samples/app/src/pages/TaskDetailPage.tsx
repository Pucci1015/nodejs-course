// 第44章 3節: /tasks/:id のページ。URL の :id を読む
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api.ts';
import { useTask } from '../queries.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

export function TaskDetailPage() {
  const { id } = useParams();
  // URL は文字。数字だけでなければ、そのタスクは無い
  const taskId = id !== undefined && /^[1-9][0-9]{0,8}$/.test(id) ? Number(id) : null;
  if (taskId === null) return <NotFoundPage />;
  return <TaskDetail id={taskId} />;
}

function TaskDetail({ id }: { id: number }) {
  const task = useTask(id);
  const navigate = useNavigate();
  if (task.isPending) return <p>読み込み中…</p>;
  if (task.isError) {
    if (task.error instanceof ApiError && task.error.status === 404) return <NotFoundPage />;
    return <p role="alert">読み込めませんでした: {task.error.message}</p>;
  }
  const t = task.data;
  return (
    <article>
      <h1>{t.title}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{t.status}</dd>
        <dt>締め切り</dt>
        <dd>{t.dueDate ?? 'なし'}</dd>
      </dl>
      <Link to="/">一覧へ</Link>{' '}
      {/* -1 は「1つ前の履歴へ」。ブラウザの戻るボタンと同じ（絞り込んだ一覧に、そのまま戻れる） */}
      <button type="button" onClick={() => void navigate(-1)}>戻る</button>
    </article>
  );
}
