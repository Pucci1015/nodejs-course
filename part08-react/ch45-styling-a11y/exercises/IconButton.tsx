// 第45章 練習問題2: アイコンだけのボタンに名前を付ける（本文5.3節）
import type { ReactNode } from 'react';

type Props = { icon: string; label: string; onClick: () => void; pressed?: boolean; disabled?: boolean };

export function IconButton({ icon, label, onClick, pressed, disabled = false }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
