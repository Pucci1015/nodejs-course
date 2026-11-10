// 練習問題3 の模範解答
export function validateMessage(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: ['オブジェクトで送ってください'] };
  }

  const errors = [];
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (name.length < 1 || name.length > 20) errors.push('name は 1〜20 文字で書いてください');
  if (text.length < 1 || text.length > 200) errors.push('text は 1〜200 文字で書いてください');

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, text } }; // 決めたキーだけで、新しいオブジェクトを作る
}
