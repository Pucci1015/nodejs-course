// 第51章 練習問題2: PHC 文字列を作る・読む（本文3節）
export type Params = { m: number; t: number; p: number };
export type Phc = Params & { salt: Buffer; hash: Buffer };

/** $argon2id$v=19$m=…,t=…,p=…$<ソルト>$<ハッシュ> を作る。base64 の最後の = は付けない */
export function formatPhc(params: Params, salt: Buffer, hash: Buffer): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(params)} ${salt.length} ${hash.length}`);
}

/** formatPhc の逆。形が違えば null */
export function parsePhc(text: string): Phc | null {
  // ここを書く
  throw new Error(`まだ書いていません: ${text}`);
}
