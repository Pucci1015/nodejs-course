// 追加（第10部）: OpenID Connect でログインする部品（第54章 5節の oidc-client.ts と、練習問題8 の解答から）
// 設定は IdP の /.well-known/openid-configuration から読み、ID トークンは JWKS の公開鍵で確かめる
import { createHash, createPublicKey, randomBytes, verify, type JsonWebKey } from 'node:crypto';
import { z } from 'zod';

const Discovery = z.object({
  issuer: z.string(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  jwks_uri: z.url(),
});
const Jwks = z.object({ keys: z.array(z.looseObject({ kid: z.string().optional(), kty: z.string() })) });
const TokenResponse = z.object({ id_token: z.string() });
const Header = z.object({ alg: z.string(), kid: z.string().optional() });
const Claims = z.looseObject({
  iss: z.string(),
  sub: z.string().min(1),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string().optional(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
});
export type IdTokenClaims = z.infer<typeof Claims>;

export type OidcConfig = { issuer: string; clientId: string; clientSecret: string; redirectUri: string };
/** ログインを始めたときにセッションに覚える値 */
export type OidcState = { state: string; nonce: string; verifier: string };

const random = () => randomBytes(32).toString('base64url');
const decode = (part: string): unknown => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${url} を読めません: ${res.status}`);
  return res.json();
}

export function createOidcClient(config: OidcConfig) {
  /** IdP の設定は、最初に使うときに1回だけ読む（失敗したら、次にまた読む） */
  let discovered: Promise<z.infer<typeof Discovery>> | undefined;
  function discover() {
    discovered ??= (async () => {
      const meta = Discovery.parse(await getJson(`${config.issuer}/.well-known/openid-configuration`));
      if (meta.issuer !== config.issuer) throw new Error('issuer が違います');
      return meta;
    })().catch((err: unknown) => {
      discovered = undefined;
      throw err;
    });
    return discovered;
  }

  /** JWKS も覚えておく。知らない kid が来たら、1回だけ読み直す（IdP が鍵を取り替えたとき） */
  let keys: JsonWebKey[] | undefined;
  async function keyFor(kid: string | undefined, refresh = false): Promise<JsonWebKey | undefined> {
    if (keys === undefined || refresh) keys = Jwks.parse(await getJson((await discover()).jwks_uri)).keys;
    const usable = keys.filter((k) => k.kty === 'RSA' && (k.use === undefined || k.use === 'sig'));
    const found = kid === undefined ? (usable.length === 1 ? usable[0] : undefined) : usable.find((k) => k.kid === kid);
    if (found === undefined && !refresh) return keyFor(kid, true);
    return found;
  }

  /** ID トークンを確かめる（第54章 4節の表の 1〜7） */
  async function verifyIdToken(idToken: string, nonce: string): Promise<IdTokenClaims> {
    const [h = '', p = '', s = '', ...rest] = idToken.split('.');
    if (rest.length > 0 || s === '') throw new Error('JWT の形ではありません');
    const header = Header.parse(decode(h));
    if (header.alg !== 'RS256') throw new Error('alg が RS256 ではありません');
    const jwk = await keyFor(header.kid);
    if (jwk === undefined) throw new Error('鍵が見つかりません');
    if (
      !verify(
        'sha256',
        Buffer.from(`${h}.${p}`),
        createPublicKey({ key: jwk, format: 'jwk' }),
        Buffer.from(s, 'base64url'),
      )
    ) {
      throw new Error('署名が合いません');
    }
    const claims = Claims.parse(decode(p));
    if (claims.iss !== config.issuer) throw new Error('iss が違います');
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(config.clientId)) throw new Error('aud が違います');
    if (claims.exp + 60 <= Math.floor(Date.now() / 1000)) throw new Error('期限が切れています');
    if (claims.nonce !== nonce) throw new Error('nonce が違います');
    return claims;
  }

  return {
    /** ログインを始める: IdP の画面の URL と、セッションに覚える値 */
    async start(): Promise<{ url: string; saved: OidcState }> {
      const meta = await discover();
      const saved = { state: random(), nonce: random(), verifier: random() };
      const url = new URL(meta.authorization_endpoint);
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: 'openid email profile',
        state: saved.state,
        nonce: saved.nonce,
        code_challenge: createHash('sha256').update(saved.verifier).digest('base64url'),
        code_challenge_method: 'S256',
      }).toString();
      return { url: url.href, saved };
    },

    /** 戻ってきたコードをトークンに取り替え、ID トークンを確かめて、中身を返す */
    async finish(code: string, saved: OidcState): Promise<IdTokenClaims> {
      const meta = await discover();
      const form = (v: string) => new URLSearchParams({ v }).toString().slice(2);
      const res = await fetch(meta.token_endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${form(config.clientId)}:${form(config.clientSecret)}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          code_verifier: saved.verifier,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`トークンをもらえません: ${res.status}`);
      const tokens = TokenResponse.parse(await res.json());
      return verifyIdToken(tokens.id_token, saved.nonce);
    },
  };
}

export type OidcClient = ReturnType<typeof createOidcClient>;
