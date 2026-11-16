// 第39章 練習問題5の模範解答: フォームを読んで確かめ、間違いを出す

/**
 * @param {HTMLFormElement} form  name="title" と name="dueDate" の入力を持つ
 * @returns {{ values: { title: string, dueDate: string | null }, errors: Record<string, string> }}
 */
export function readTaskForm(form) {
  const data = new FormData(form);
  const title = String(data.get('title') ?? '').trim();
  const due = String(data.get('dueDate') ?? '');
  const errors = {};
  if (title.length === 0) errors.title = '題名を入れてください';
  else if (title.length > 100) errors.title = '題名は 100 文字までです';
  if (due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(due)) errors.dueDate = '日付は YYYY-MM-DD です';
  return { values: { title, dueDate: due === '' ? null : due }, errors };
}

/**
 * [data-error-for="名前"] の要素に、間違いの文を入れる。間違いの無い項目は空にする
 * @returns {boolean} 間違いがあったか
 */
export function showErrors(form, errors) {
  for (const el of form.querySelectorAll('[data-error-for]')) {
    el.textContent = errors[el.dataset.errorFor] ?? '';
  }
  return Object.keys(errors).length > 0;
}
