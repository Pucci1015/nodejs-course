// 練習問題1 の模範解答
export function parseId(text) {
  if (typeof text !== 'string' || !/^[1-9][0-9]*$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

export function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
