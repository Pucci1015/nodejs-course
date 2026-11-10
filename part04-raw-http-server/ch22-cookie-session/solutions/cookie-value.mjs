// 練習問題1 の模範解答
export function getCookie(header, name) {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() !== name) continue;
    const value = part.slice(i + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value; // %xx として読めないものは、そのまま
    }
  }
  return null;
}

export function cookieLine(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}
