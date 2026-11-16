// 第41章 練習問題6: 題名と締め切りの、制御されたフォーム（本文6・7節）
import type { ReactNode } from 'react';
type Props = { onAdd: (input: { title: string; dueDate: string | null }) => void };

export function NewTaskForm({ onAdd }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
