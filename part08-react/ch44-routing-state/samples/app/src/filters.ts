// 第44章 4節: 一覧の条件（絞り込み・並べ方・検索の文字）と、URL の検索パラメータの行き来
import { STATUSES, type Status } from './schemas.ts';

export const SORTS = { dueDate: '締め切り順', '-createdAt': '新しい順', title: '題名順' } as const;
export type SortKey = keyof typeof SORTS;
export type Filters = { status: Status | 'all'; sort: SortKey; q: string };

export const DEFAULT_FILTERS: Filters = { status: 'all', sort: 'dueDate', q: '' };

const isStatus = (v: string | null): v is Status => STATUSES.some((s) => s === v);
const isSort = (v: string | null): v is SortKey => v !== null && Object.hasOwn(SORTS, v);

// URL は利用者が書き換えられるので、知らない値は決まりの値にする
export function parseFilters(params: URLSearchParams): Filters {
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    status: isStatus(status) ? status : 'all',
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    q: params.get('q') ?? '',
  };
}

// 決まりの値は URL に書かない（/ と /?status=all が、同じ画面なのに別の URL にならないように）
export function toSearchParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status !== 'all') p.set('status', f.status);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  if (f.q !== '') p.set('q', f.q);
  return p;
}
