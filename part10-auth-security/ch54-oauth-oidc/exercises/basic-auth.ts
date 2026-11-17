// 第54章 練習問題2: client_id と client_secret の Basic 認証のヘッダ（本文3.3節、RFC 6749 2.3.1）

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${clientId} ${clientSecret}`);
}

export function parseBasicAuth(header: string): { clientId: string; clientSecret: string } | null {
  // ここを書く
  throw new Error(`まだ書いていません: ${header}`);
}
