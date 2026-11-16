// 第44章 練習問題3の模範解答
import type { ReactNode } from 'react';
import { useParams } from 'react-router';

export function parseId(s: string | undefined): number | null {
  return s !== undefined && /^[1-9][0-9]{0,8}$/.test(s) ? Number(s) : null;
}

export function TaskIdPage(): ReactNode {
  const id = parseId(useParams().id);
  if (id === null) return <h1>ページが見つかりません</h1>;
  return <h1>タスク {id}</h1>;
}
