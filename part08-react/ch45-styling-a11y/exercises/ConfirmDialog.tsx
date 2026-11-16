// 第45章 練習問題6: <dialog> で確かめるダイアログ（本文8節）
import type { ReactNode } from 'react';

type Props = { open: boolean; title: string; children?: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void };

export function ConfirmDialog({ open, title, children, confirmLabel = 'OK', onConfirm, onCancel }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
