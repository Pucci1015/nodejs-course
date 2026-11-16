// 第44章 練習問題1の模範解答
import { STATUSES, type Status } from '../exercises/types.ts';

export type ListParams = { statuses: Status[]; page: number; q: string };

export function parseListParams(params: URLSearchParams): ListParams {
  const raw = (params.get('status') ?? '').split(',');
  // 知らない値は捨て、同じものは1つにして、todo・doing・done の順にそろえる
  const statuses = STATUSES.filter((s) => raw.includes(s));
  const p = params.get('page') ?? '';
  const page = /^[1-9][0-9]{0,5}$/.test(p) ? Number(p) : 1;
  return { statuses, page, q: (params.get('q') ?? '').trim() };
}

export function toListParams({ statuses, page, q }: ListParams): URLSearchParams {
  const out = new URLSearchParams();
  const list = STATUSES.filter((s) => statuses.includes(s));
  if (list.length > 0) out.set('status', list.join(','));
  if (page > 1) out.set('page', String(page));
  if (q.trim() !== '') out.set('q', q.trim());
  return out;
}
