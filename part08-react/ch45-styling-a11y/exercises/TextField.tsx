// 第45章 練習問題3: ラベル・説明・間違いがつながった入力欄（本文6節）
import type { ReactNode } from 'react';

type Props = { label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string; required?: boolean };

export function TextField({ label, value, onChange, hint, error, required = false }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
