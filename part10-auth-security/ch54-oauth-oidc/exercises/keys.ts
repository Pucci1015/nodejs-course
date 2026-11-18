// テストの部品: 練習問題3・5 のテストで使う、RSA の鍵と、署名した JWT を作る。書き換えなくてよいファイル
import { generateKeyPairSync, sign, type JsonWebKey, type KeyObject } from 'node:crypto';

export function makeKey(kid: string | undefined): { privateKey: KeyObject; jwk: JsonWebKey } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk: JsonWebKey = { ...publicKey.export({ format: 'jwk' }), use: 'sig', alg: 'RS256' };
  if (kid !== undefined) jwk.kid = kid;
  return { privateKey, jwk };
}

/** ヘッダと中身を、その秘密鍵で RS256 の署名をした JWT にする */
export function signRs256(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: KeyObject): string {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc(header)}.${enc(payload)}`;
  return `${data}.${sign('sha256', Buffer.from(data), privateKey).toString('base64url')}`;
}
