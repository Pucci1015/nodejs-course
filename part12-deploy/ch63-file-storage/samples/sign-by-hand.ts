// 第63章 4.2節: 署名付き URL（GET）を、SDK を使わずに node:crypto だけで作る（AWS 署名バージョン4）
// 動かし方（章のフォルダで）: node samples/sign-by-hand.ts <キー> [秒]
//   出てきた URL を curl で開く。秒（既定 60）を過ぎると 403
import { createHash, createHmac } from 'node:crypto';

const endpoint = new URL('http://127.0.0.1:9800');
const bucket = 'demo';
const region = 'us-east-1';
const accessKeyId = 'dev-only-access-key';
const secretAccessKey = 'dev-only-secret-key';

const key = process.argv[2] ?? 'notes/2026/a.txt';
const expires = Number(process.argv[3] ?? 60);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const hmac = (k: string | Buffer, s: string) => createHmac('sha256', k).update(s).digest();
// encodeURIComponent が残す ! ' ( ) * も %XX にする（AWS の決まり）
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

// 1. 時刻と「範囲」（scope）。20261118T141600Z と 20261118/us-east-1/s3/aws4_request
const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const date = amzDate.slice(0, 8);
const scope = `${date}/${region}/s3/aws4_request`;

// 2. 署名する頼みを、決まった形の文字列にする（正規化したリクエスト）
const path = `/${bucket}/${key.split('/').map(enc).join('/')}`;
const query = new Map([
  ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
  ['X-Amz-Credential', `${accessKeyId}/${scope}`],
  ['X-Amz-Date', amzDate],
  ['X-Amz-Expires', String(expires)],
  ['X-Amz-SignedHeaders', 'host'],
]);
const canonicalQuery = [...query].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
const canonicalRequest = ['GET', path, canonicalQuery, `host:${endpoint.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');

// 3. 署名する文字列
const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');

// 4. 鍵を、日付・リージョン・サービスで順に HMAC して、その日だけの鍵にする
const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), 's3'), 'aws4_request');
const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

console.log(`${endpoint.origin}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`);
