// ページの見出し（h1）。ほかのページから移ってきたら、ここにフォーカスを移す（第45章 7節「画面の変化を知らせる」と同じ考え）
// ふつうのリンクならブラウザがページを読み直し、スクリーンリーダーが新しいページの名前を読む。
// React Router はページを読み直さないので、そのままでは「ページが替わった」ことが伝わらない
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';

export function PageTitle({ children }: { children: ReactNode }): ReactNode {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname, key } = useLocation();

  useEffect(() => {
    // 最初に開いたページ（key が 'default'）は、ブラウザに任せる
    if (key !== 'default') ref.current?.focus();
    // pathname だけを見る。同じページで条件（?status=…）を変えたときは、フォーカスを動かさない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
