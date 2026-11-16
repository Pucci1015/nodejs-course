// 第39章 練習問題6: 読み込み中・失敗・成功の3つの状態を画面にする（本文4節）

/**
 * @param {HTMLElement} root
 * @param {{ status: 'loading' } | { status: 'error', message: string } | { status: 'success', tasks: { id: number, title: string }[] }} state
 * @param {{ onRetry?: () => void }} [options]
 */
export function renderView(root, state, { onRetry = () => {} } = {}) {
  throw new Error('まだ書いていません');
}
