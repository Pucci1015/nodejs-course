// 第39章 練習問題6の模範解答: 読み込み中・失敗・成功の3つの状態を画面にする

/**
 * @param {HTMLElement} root
 * @param {{ status: 'loading' } | { status: 'error', message: string } | { status: 'success', tasks: { id: number, title: string }[] }} state
 * @param {{ onRetry?: () => void }} [options]
 */
export function renderView(root, state, { onRetry = () => {} } = {}) {
  switch (state.status) {
    case 'loading': {
      const p = document.createElement('p');
      p.className = 'loading';
      p.textContent = '読み込み中…';
      root.replaceChildren(p);
      return;
    }
    case 'error': {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = `読み込めませんでした: ${state.message}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'もう一度';
      button.addEventListener('click', () => onRetry());
      root.replaceChildren(p, button);
      return;
    }
    case 'success': {
      const ul = document.createElement('ul');
      for (const t of state.tasks) {
        const li = document.createElement('li');
        li.textContent = t.title;
        ul.append(li);
      }
      root.replaceChildren(ul);
      return;
    }
    default:
      throw new Error(`知らない状態です: ${state.status}`);
  }
}
