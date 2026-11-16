// 第49章 練習問題6: 題名を変えるフォーム（ここに書きます）
import type { ReactNode } from 'react';
import type { RenameState } from '../app/tasks/[id]/actions.ts';

export function RenameForm(_props: { title: string; action: (prev: RenameState, formData: FormData) => Promise<RenameState> }): ReactNode {
  throw new Error('まだ書いていません');
}
