// 第55章 練習問題1: CSP のヘッダの値を作る（本文3節）

export type CspOptions = {
  /** リクエストごとの nonce（base64 の文字だけ）。無ければ script-src に nonce を書かない */
  nonce?: string;
  /** fetch などでつないでよい、ほかのオリジン（例: 'https://api.example.com'） */
  connectSrc?: string[];
};

export function buildCsp(options: CspOptions = {}): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(options)}`);
}
