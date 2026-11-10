// 練習問題3 の模範解答
export function maskQuery(url, names = ['token', 'password']) {
  const i = url.indexOf('?');
  if (i === -1) return url;
  const params = new URLSearchParams(url.slice(i + 1));
  const hide = names.map((n) => n.toLowerCase());
  const out = new URLSearchParams();
  for (const [name, value] of params) {
    out.append(name, hide.includes(name.toLowerCase()) ? '***' : value);
  }
  return `${url.slice(0, i)}?${out}`;
}
