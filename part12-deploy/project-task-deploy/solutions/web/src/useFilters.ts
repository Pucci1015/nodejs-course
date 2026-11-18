// 一覧の条件を URL の検索パラメータに持つ（第44章 4節）
import { useSearchParams } from 'react-router';
import { parseFilters, toSearchParams, type Filters } from './filters.ts';

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);

  function setFilters(patch: Partial<Filters>, options?: { replace?: boolean }) {
    setParams((prev) => toSearchParams({ ...parseFilters(prev), ...patch }), options);
  }

  return [filters, setFilters] as const;
}
