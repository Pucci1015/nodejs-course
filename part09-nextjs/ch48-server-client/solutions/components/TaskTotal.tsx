'use client';
// 第48章 練習問題7の模範解答: Promise を受け取り、use で待って数を出す
import { use } from 'react';

export function TaskTotal({ total }: { total: Promise<number> }) {
  return <p>タスクの数: {use(total)}</p>;
}
