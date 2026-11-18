// 第63章 練習問題5: 署名付き URL（GET）を作る関数（本文 4.2節の sign-by-hand.ts を関数にする）
import { createHash, createHmac } from 'node:crypto';

export type PresignInput = {
  /** 'http://127.0.0.1:9800' のような、ストレージの入口 */
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 使える秒数（1〜604800） */
  expiresIn: number;
  /** 署名する時刻 */
  now: Date;
  /** あれば、response-content-disposition を attachment; filename*=UTF-8''… にする */
  downloadName?: string;
};

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const hmac = (k: string | Buffer, s: string) => createHmac('sha256', k).update(s).digest();
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function presignGetUrl(input: PresignInput): string {
  const { bucket, key, region, accessKeyId, secretAccessKey, expiresIn, now } = input;
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 604800) {
    throw new Error(`expiresIn は 1〜604800 の整数です: ${expiresIn}`);
  }
  const endpoint = new URL(input.endpoint);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;

  const path = `/${bucket}/${key.split('/').map(enc).join('/')}`;
  const query = new Map([
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ]);
  // 追加: response-… のクエリも、署名に含める（書き換えられないように）
  if (input.downloadName !== undefined) {
    query.set('response-content-disposition', `attachment; filename*=UTF-8''${enc(input.downloadName)}`);
  }
  // 名前を %XX にしてから、その順に並べる（大文字は小文字より前）
  const canonicalQuery = [...query]
    .map(([k, v]) => [enc(k), enc(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const canonicalRequest = ['GET', path, canonicalQuery, `host:${endpoint.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `${endpoint.origin}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
