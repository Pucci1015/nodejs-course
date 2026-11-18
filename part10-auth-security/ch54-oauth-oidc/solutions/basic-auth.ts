// 第54章 練習問題2 の模範解答: client_id と client_secret の Basic 認証のヘッダ（本文3.3節、RFC 6749 2.3.1）

/** フォームの形（application/x-www-form-urlencoded）で、1つの値を符号にする（空白は +） */
const formEncode = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  // それぞれを先に符号にしてから「:」でつなぐ。id や secret に「:」が入っていても、区切りと間違えない
  return `Basic ${Buffer.from(`${formEncode(clientId)}:${formEncode(clientSecret)}`).toString('base64')}`;
}

export function parseBasicAuth(header: string): { clientId: string; clientSecret: string } | null {
  const m = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (m?.[1] === undefined) return null;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon === -1) return null;
  // URLSearchParams に読ませると、+ を空白に、%XX を文字に戻してくれる
  const form = new URLSearchParams(`id=${decoded.slice(0, colon)}&secret=${decoded.slice(colon + 1)}`);
  const clientId = form.get('id') ?? '';
  const clientSecret = form.get('secret') ?? '';
  if (clientId === '') return null;
  return { clientId, clientSecret };
}
