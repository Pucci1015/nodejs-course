// 一覧の条件と、URL の検索パラメータの行き来（第44章 4節）
import { STATUSES, type Status } from './api/schemas.ts';

export const SORTS = {
  dueDate: '締め切りが近い順',
  '-createdAt': '新しい順',
  createdAt: '古い順',
  title: '題名順',
} as const;
export type SortKey = keyof typeof SORTS;
export type Filters = { statuses: Status[]; sort: SortKey; q: string };

export const DEFAULT_FILTERS: Filters = { statuses: [], sort: 'dueDate', q: '' };

const isSort = (v: string | null): v is SortKey => v !== null && Object.hasOwn(SORTS, v);

export function parseFilters(params: URLSearchParams): Filters {
  const raw = (params.get('status') ?? '').split(',');
  const sort = params.get('sort');
  return {
    // 知らない値は捨て、同じものは1つにして、todo・doing・done の順にそろえる
    statuses: STATUSES.filter((s) => raw.includes(s)),
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    q: params.get('q') ?? '',
  };
}

export function toSearchParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  const statuses = STATUSES.filter((s) => f.statuses.includes(s));
  if (statuses.length > 0) p.set('status', statuses.join(','));
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  if (f.q !== '') p.set('q', f.q);
  return p;
}
