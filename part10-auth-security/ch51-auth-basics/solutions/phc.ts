// 第51章 練習問題2 の模範解答: PHC 文字列を作る・読む
export type Params = { m: number; t: number; p: number };
export type Phc = Params & { salt: Buffer; hash: Buffer };

const b64 = (buf: Buffer) => buf.toString('base64').replace(/=+$/, '');

/** $argon2id$v=19$m=…,t=…,p=…$<ソルト>$<ハッシュ> を作る */
export function formatPhc(params: Params, salt: Buffer, hash: Buffer): string {
  return `$argon2id$v=19$m=${params.m},t=${params.t},p=${params.p}$${b64(salt)}$${b64(hash)}`;
}

/** formatPhc の逆。形が違えば null */
export function parsePhc(text: string): Phc | null {
  const parts = text.split('$'); // ['', 'argon2id', 'v=19', 'm=…,t=…,p=…', ソルト, ハッシュ]
  if (parts.length !== 6 || parts[0] !== '' || parts[1] !== 'argon2id' || parts[2] !== 'v=19') return null;
  const params = /^m=(\d+),t=(\d+),p=(\d+)$/.exec(parts[3] ?? '');
  if (params === null) return null;
  const isB64 = (s: string) => /^[A-Za-z0-9+/]+$/.test(s);
  const salt = parts[4] ?? '';
  const hash = parts[5] ?? '';
  if (!isB64(salt) || !isB64(hash)) return null;
  return {
    m: Number(params[1]),
    t: Number(params[2]),
    p: Number(params[3]),
    salt: Buffer.from(salt, 'base64'),
    hash: Buffer.from(hash, 'base64'),
  };
}
