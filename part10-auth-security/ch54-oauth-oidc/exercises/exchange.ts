// 第54章 練習問題6: コードをトークンに取り替える関数（本文3.3節の exchange.ts を、アプリで使える形に）
import { z } from 'zod';

export type ExchangeParams = {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  verifier: string;
};

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** IdP がトークンを出さなかったときのエラー */
export class OAuthError extends Error {
  readonly status: number;
  readonly error: string;
  constructor(status: number, error: string, description?: string) {
    super(description === undefined ? error : `${error}: ${description}`);
    this.name = 'OAuthError';
    this.status = status;
    this.error = error;
  }
}

export type TokenSet = { access_token: string; token_type: string; id_token: string; expires_in?: number | undefined; scope?: string | undefined };

export async function exchangeCode(params: ExchangeParams, fetchFn: FetchLike = fetch): Promise<TokenSet> {
  // ここを書く
  void z;
  void fetchFn;
  throw new Error(`まだ書いていません: ${params.code}`);
}
