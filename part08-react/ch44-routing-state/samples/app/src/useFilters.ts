// 第44章 4節: 一覧の条件を、state ではなく URL の検索パラメータに持つカスタムフック
import { useSearchParams } from 'react-router';
import { parseFilters, toSearchParams, type Filters } from './filters.ts';

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);

  function setFilters(patch: Partial<Filters>, options?: { replace?: boolean }) {
    // 更新関数の形（第42章 2.3節）。prev は「今の URL」の検索パラメータ
    setParams((prev) => toSearchParams({ ...parseFilters(prev), ...patch }), options);
  }

  return [filters, setFilters] as const;
}
