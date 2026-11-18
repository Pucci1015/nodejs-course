// メールのリンクの #token=… を読む。# の後ろはサーバに送られないので、アクセスログや Referer に残らない（第53章 4節）
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return token !== null && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
