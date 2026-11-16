// 第39章 練習問題5: フォームを読んで確かめ、間違いを出す（本文5節）

/**
 * @param {HTMLFormElement} form  name="title" と name="dueDate" の入力を持つ
 * @returns {{ values: { title: string, dueDate: string | null }, errors: Record<string, string> }}
 */
export function readTaskForm(form) {
  throw new Error('まだ書いていません');
}

/**
 * [data-error-for="名前"] の要素に、間違いの文を入れる。間違いの無い項目は空にする
 * @returns {boolean} 間違いがあったか
 */
export function showErrors(form, errors) {
  throw new Error('まだ書いていません');
}
