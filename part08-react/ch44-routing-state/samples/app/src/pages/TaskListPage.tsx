// 第44章 4節: 一覧のページ。条件は URL の検索パラメータに持つ
import { Link } from 'react-router';
import { SORTS, type Filters, type SortKey } from '../filters.ts';
import { useTasks } from '../queries.ts';
import { useSettings } from '../settings.tsx';
import { useFilters } from '../useFilters.ts';

const STATUS_LABELS: Record<Filters['status'], string> = { all: 'すべて', todo: '未着手', doing: '作業中', done: '完了' };

export function TaskListPage() {
  const [filters, setFilters] = useFilters();
  const tasks = useTasks(filters.status, filters.sort);
  const { settings } = useSettings();
  // 検索の文字での絞り込みは、API に無いので画面で行う（計算できるので state にしない）
  const q = filters.q.trim().toLowerCase();
  const shown = tasks.data?.filter((t) => t.title.toLowerCase().includes(q));

  return (
    <section>
      <h1>タスク</h1>
      <div>
        {(Object.keys(STATUS_LABELS) as Filters['status'][]).map((s) => (
          <button key={s} type="button" aria-pressed={s === filters.status} onClick={() => setFilters({ status: s })}>
            {STATUS_LABELS[s]}
          </button>
        ))}{' '}
        <select aria-label="並べ方" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })}>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORTS[k]}
            </option>
          ))}
        </select>{' '}
        {/* 1文字ごとに履歴を増やさないように、replace で今の履歴を書き換える */}
        <input aria-label="検索" value={filters.q} onChange={(e) => setFilters({ q: e.target.value }, { replace: true })} />
      </div>
      {tasks.isPending ? (
        <p>読み込み中…</p>
      ) : tasks.isError ? (
        <p role="alert">読み込めませんでした: {tasks.error.message}</p>
      ) : (
        <ul style={{ lineHeight: settings.compact ? 1.2 : 2 }}>
          {shown?.map((t) => (
            <li key={t.id}>
              <Link to={`/tasks/${t.id}`}>{t.title}</Link> {t.status === 'done' && '（完了）'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
