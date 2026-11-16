// 第43章 練習問題7: 送る前に確かめ、API の間違いも出すフォーム（本文5節）
import type { ReactNode } from 'react';
import type { TaskInput } from './schemas.ts';

type Props = { onSubmit: (input: TaskInput) => Promise<unknown>; submitLabel?: string };

export function TaskForm({ onSubmit, submitLabel = '追加' }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
