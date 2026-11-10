// 入力の確かめ。間違いがあれば、項目ごとの説明を返す（第20章 6.3節の 422）

const NAME_RE = /^[A-Za-z0-9_]{3,20}$/;
// 文字の数は、絵文字なども1文字と数える（[...s].length。第3部 第11章）
const len = (s) => [...s].length;

export function validateSignup({ name, password }) {
  const errors = {};
  if (!NAME_RE.test(name)) errors.name = '名前は英数字と _ で 3〜20 文字にしてください';
  if (len(password) < 8 || len(password) > 100) errors.password = 'パスワードは 8〜100 文字にしてください';
  return errors;
}

export function validateThread({ title, body }) {
  const errors = {};
  if (len(title.trim()) === 0 || len(title) > 100) errors.title = '題名は 1〜100 文字にしてください';
  Object.assign(errors, validatePost({ body }));
  return errors;
}

export function validatePost({ body }) {
  const errors = {};
  if (len(body.trim()) === 0 || len(body) > 2000) errors.body = '本文は 1〜2000 文字にしてください';
  return errors;
}

/** フォームの改行を \n にそろえる（ブラウザは \r\n で送ってくる） */
export const normalizeNewlines = (s) => s.replace(/\r\n?/g, '\n');
