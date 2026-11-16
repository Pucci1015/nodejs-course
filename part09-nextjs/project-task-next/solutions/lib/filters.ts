// 一覧の条件と、URL の検索パラメータの行き来（第8部の成果物の filters.ts を、Next.js の searchParams に合わせたもの）
import { STATUSES, type Status } from './schemas.ts';

export const SORTS = { dueDate: '締め切りが近い順', '-createdAt': '新しい順', createdAt: '古い順', title: '題名順' } as const;
export type SortKey = keyof typeof SORTS;
export type Filters = { statuses: Status[]; sort: SortKey; q: string };

export const DEFAULT_FILTERS: Filters = { statuses: [], sort: 'dueDate', q: '' };

/** Next.js の searchParams の値（文字・文字の配列・無し） */
type Param = string | string[] | undefined;
type SearchParams = Record<string, Param>;

const first = (v: Param) => (Array.isArray(v) ? v[0] : v);
const isSort = (v: string | undefined): v is SortKey => v !== undefined && Object.hasOwn(SORTS, v);

/**
 * URL の条件を読む。状態は ?status=todo,doing（第8部の形）でも、
 * ?status=todo&status=doing（チェックボックスのフォームを送った形）でもよい
 */
export function parseFilters(params: SearchParams): Filters {
  const raw = [params.status ?? []].flat().flatMap((s) => s.split(','));
  const sort = first(params.sort);
  return {
    statuses: STATUSES.filter((s) => raw.includes(s)),
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    q: first(params.q) ?? '',
  };
}

/** 条件を URL の検索パラメータにする（既定の値は書かない） */
export function toSearchParams(f: Filters, cursor?: string): URLSearchParams {
  const p = new URLSearchParams();
  if (f.statuses.length > 0) p.set('status', f.statuses.join(','));
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  if (f.q !== '') p.set('q', f.q);
  if (cursor !== undefined) p.set('cursor', cursor);
  return p;
}

export const cursorOf = (params: SearchParams) => first(params.cursor);
