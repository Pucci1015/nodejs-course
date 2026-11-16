// 第40章 練習問題8の模範解答: 第39章の画面を TypeScript で書き直す（追加のフォームと一覧）

export type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null; version: number };
export type TaskApi = {
  list(): Promise<Task[]>;
  create(input: { title: string; dueDate: string | null }): Promise<Task>;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className !== undefined) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** root の中に、フォーム・状態の文・一覧を作り、一覧を読み終えたら解決する */
export async function mountApp(root: HTMLElement, api: TaskApi): Promise<void> {
  const form = el('form');
  const input = el('input');
  input.name = 'title';
  const button = el('button', undefined, '追加');
  const formError = el('p', 'form-error');
  form.append(input, button, formError);
  const status = el('p', 'status');
  const list = el('ul');
  root.replaceChildren(form, status, list);

  async function load(): Promise<void> {
    status.textContent = '読み込み中…';
    try {
      const tasks = await api.list();
      list.replaceChildren(...tasks.map((t) => el('li', undefined, t.title)));
      status.textContent = `${tasks.length} 件`;
    } catch (err) {
      status.textContent = `読み込めませんでした: ${messageOf(err)}`;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (title === '') {
      formError.textContent = '題名を入れてください';
      return;
    }
    formError.textContent = '';
    button.disabled = true;
    api
      .create({ title, dueDate: null })
      .then(async () => {
        input.value = '';
        await load();
      })
      .catch((err: unknown) => {
        formError.textContent = messageOf(err);
      })
      .finally(() => {
        button.disabled = false;
      });
  });

  await load();
}
