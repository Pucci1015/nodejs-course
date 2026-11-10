// 練習問題1 の模範解答
export function mediaTypeOf(header) {
  if (typeof header !== 'string') return '';
  return header.split(';')[0].trim().toLowerCase();
}

export function isJson(header) {
  return mediaTypeOf(header) === 'application/json';
}

export function isForm(header) {
  return mediaTypeOf(header) === 'application/x-www-form-urlencoded';
}
