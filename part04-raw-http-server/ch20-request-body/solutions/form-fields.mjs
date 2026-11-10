// 練習問題2 の模範解答
export function readContactForm(bodyText) {
  const form = new URLSearchParams(bodyText);
  return {
    name: (form.get('name') ?? '').trim(),
    message: (form.get('message') ?? '').trim(),
    tags: form.getAll('tags'),
    agree: form.has('agree'), // チェックしなかったチェックボックスは、名前ごと送られない
  };
}
