// 練習問題1 の模範解答
export function toSse({ event, data, id }) {
  let text = '';
  if (event !== undefined) text += `event: ${event}\n`;
  text += `data: ${JSON.stringify(data)}\n`;
  if (id !== undefined) text += `id: ${id}\n`;
  return text + '\n';
}

export function ping() {
  return ': ping\n\n';
}
