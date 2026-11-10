// 練習問題1 の模範解答
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

export function textToHtml(text) {
  return escapeHtml(text).replaceAll('\n', '<br>\n');
}
