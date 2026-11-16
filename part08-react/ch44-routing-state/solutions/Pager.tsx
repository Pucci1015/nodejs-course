// 第44章 練習問題5の模範解答
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';

const read = (params: URLSearchParams) => {
  const p = params.get('page') ?? '';
  return /^[1-9][0-9]{0,5}$/.test(p) ? Number(p) : 1;
};

export function usePage(): [number, (page: number) => void] {
  const [params, setParams] = useSearchParams();
  function setPage(page: number) {
    setParams((prev) => {
      // ほかのパラメータ（status など）は残す。prev は変えずに、コピーしてから変える
      const next = new URLSearchParams(prev);
      if (page <= 1) next.delete('page');
      else next.set('page', String(page));
      return next;
    });
  }
  return [read(params), setPage];
}

export function Pager({ hasNext }: { hasNext: boolean }): ReactNode {
  const [page, setPage] = usePage();
  return (
    <nav aria-label="ページ">
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        前へ
      </button>
      <span> {page} ページ目 </span>
      <button type="button" disabled={!hasNext} onClick={() => setPage(page + 1)}>
        次へ
      </button>
    </nav>
  );
}
