// 第54章 練習問題6 の模範解答: コードをトークンに取り替える関数（本文3.3節の exchange.ts を、アプリで使える形に）
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

const TokenSet = z.object({
  access_token: z.string().min(1),
  token_type: z.string().refine((t) => t.toLowerCase() === 'bearer'),
  id_token: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
  scope: z.string().optional(),
});
export type TokenSet = z.infer<typeof TokenSet>;

const ErrorBody = z.object({ error: z.string(), error_description: z.string().optional() });

export async function exchangeCode(params: ExchangeParams, fetchFn: FetchLike = fetch): Promise<TokenSet> {
  const form = (v: string) => new URLSearchParams({ v }).toString().slice(2);
  const res = await fetchFn(params.tokenEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${form(params.clientId)}:${form(params.clientSecret)}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.verifier,
    }).toString(),
    signal: AbortSignal.timeout(5000),
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const e = ErrorBody.safeParse(body);
    if (e.success) throw new OAuthError(res.status, e.data.error, e.data.error_description);
    throw new OAuthError(res.status, 'server_error');
  }
  const tokens = TokenSet.safeParse(body);
  if (!tokens.success) throw new OAuthError(res.status, 'invalid_response', '応答の形が違います');
  return tokens.data;
}
