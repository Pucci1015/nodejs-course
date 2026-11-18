// 一覧の条件。値は URL に持つので、ここは「見せて、変えたら知らせる」だけ（第44章 4節）
import type { ReactNode } from 'react';
import { STATUSES, STATUS_LABELS } from '../api/schemas.ts';
import { SORTS, type Filters, type SortKey } from '../filters.ts';

type Props = { filters: Filters; onChange: (patch: Partial<Filters>, options?: { replace?: boolean }) => void };

const isSortKey = (v: string): v is SortKey => Object.hasOwn(SORTS, v);

export function FilterBar({ filters, onChange }: Props): ReactNode {
  return (
    <search className="filters">
      <fieldset>
        <legend>状態</legend>
        {STATUSES.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={filters.statuses.includes(s)}
              onChange={(e) =>
                onChange({
                  statuses: e.target.checked ? [...filters.statuses, s] : filters.statuses.filter((x) => x !== s),
                })
              }
            />
            {STATUS_LABELS[s]}
          </label>
        ))}
      </fieldset>
      <label>
        並べ方{' '}
        <select
          value={filters.sort}
          onChange={(e) => {
            if (isSortKey(e.target.value)) onChange({ sort: e.target.value });
          }}
        >
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        題名で絞り込む {/* 1文字ごとに履歴を増やさないように replace（戻るボタンで1文字ずつ戻らない） */}
        <input type="search" value={filters.q} onChange={(e) => onChange({ q: e.target.value }, { replace: true })} />
      </label>
    </search>
  );
}
