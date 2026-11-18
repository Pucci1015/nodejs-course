// 練習用の S3 互換のサーバ（第63章）。Amazon S3 の API のうち、この部で使うものだけを、node:http と node:crypto で書いたもの
// 使い方: npm run s3（部のフォルダで）→ http://127.0.0.1:9800
//   アクセスキー dev-only-access-key、シークレット dev-only-secret-key、リージョン us-east-1、バケット task-files と demo
//   環境変数: S3_PORT（既定 9800）、S3_BUCKETS（カンマ区切り）、S3_DIR（指定すると、そのフォルダに保存して、次の起動で読み直す）、
//            S3_CORS_ORIGINS（ブラウザから直接 PUT してよいオリジン。カンマ区切り）
// 本物の S3 の代わりに、手元とテストで使うためのもの。本番では使わない（中身は読まなくてよい。第63章 4節で、署名の確かめ方だけを読みます）
//
// できること（パス形式の URL だけ: http://127.0.0.1:9800/バケット/キー）
//   PUT /b（バケットを作る）、HEAD /b、GET /b?list-type=2（一覧。prefix・max-keys・continuation-token・start-after）、
//   PUT /b/k（置く）、GET /b/k（取り出す。Range・If-None-Match・response-content-disposition など）、HEAD /b/k、DELETE /b/k
//   署名: AWS 署名バージョン4（Authorization ヘッダ、または署名付き URL のクエリ）。署名が無い・違う・期限切れは 403
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

export type MiniS3Options = {
  port?: number;
  host?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  buckets?: string[];
  /** 保存するフォルダ。無ければメモリだけ（止めると消える） */
  dir?: string;
  /** ブラウザから直接使ってよいオリジン（CORS） */
  corsOrigins?: string[];
  /** 1つのオブジェクトの上限（バイト） */
  maxObjectBytes?: number;
  /** 今の時刻（テストで決めるため） */
  now?: () => Date;
};

type StoredObject = {
  body: Buffer;
  etag: string;
  lastModified: Date;
  headers: Record<string, string>;
};

class S3Error extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest();

/** RFC 3986 の「そのままでよい文字」以外を %XX にする（AWS の署名の決まり） */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** 置くときに覚えておくヘッダ（取り出すときに返す） */
const KEPT_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'content-encoding', 'content-language'];

export async function startMiniS3(options: MiniS3Options = {}) {
  const {
    port = 9800,
    host = '127.0.0.1',
    accessKeyId = 'dev-only-access-key',
    secretAccessKey = 'dev-only-secret-key',
    region = 'us-east-1',
    buckets = ['task-files', 'demo'],
    dir,
    corsOrigins = [],
    maxObjectBytes = 20 * 1024 * 1024,
    now = () => new Date(),
  } = options;

  const store = new Map<string, Map<string, StoredObject>>();
  for (const b of buckets) store.set(b, new Map());

  // 保存するフォルダがあれば読み直す（1つのオブジェクト = 中身の .bin と、ヘッダなどの .json）
  if (dir !== undefined) {
    await mkdir(dir, { recursive: true });
    for (const b of await readdir(dir)) {
      const objects = store.get(b) ?? new Map<string, StoredObject>();
      store.set(b, objects);
      for (const name of await readdir(path.join(dir, b))) {
        if (!name.endsWith('.json')) continue;
        const meta = JSON.parse(await readFile(path.join(dir, b, name), 'utf8')) as {
          key: string;
          etag: string;
          lastModified: string;
          headers: Record<string, string>;
        };
        const body = await readFile(path.join(dir, b, name.replace(/\.json$/, '.bin')));
        objects.set(meta.key, { body, etag: meta.etag, lastModified: new Date(meta.lastModified), headers: meta.headers });
      }
    }
  }
  const fileBase = (bucket: string, key: string) => path.join(dir ?? '', bucket, sha256(key));

  /** 署名を確かめる（第63章 4節）。合っていなければ S3Error を投げる */
  function verifySignature(req: http.IncomingMessage, url: URL, payloadHash: string) {
    const q = url.searchParams;
    const presigned = q.has('X-Amz-Signature');
    let credential: string, signedHeaders: string, signature: string, amzDate: string;
    if (presigned) {
      if (q.get('X-Amz-Algorithm') !== 'AWS4-HMAC-SHA256') throw new S3Error(400, 'AuthorizationQueryParametersError', '署名の方式が違います');
      credential = q.get('X-Amz-Credential') ?? '';
      signedHeaders = q.get('X-Amz-SignedHeaders') ?? '';
      signature = q.get('X-Amz-Signature') ?? '';
      amzDate = q.get('X-Amz-Date') ?? '';
      const expires = Number(q.get('X-Amz-Expires'));
      if (!Number.isInteger(expires) || expires < 1 || expires > 604800) {
        throw new S3Error(400, 'AuthorizationQueryParametersError', 'X-Amz-Expires は 1〜604800 秒です');
      }
      if (now().getTime() > parseAmzDate(amzDate) + expires * 1000) throw new S3Error(403, 'AccessDenied', 'Request has expired');
    } else {
      const auth = req.headers.authorization;
      if (auth === undefined) throw new S3Error(403, 'AccessDenied', '署名がありません');
      const m = /^AWS4-HMAC-SHA256 Credential=([^,]+), ?SignedHeaders=([^,]+), ?Signature=([0-9a-f]{64})$/.exec(auth);
      if (m === null) throw new S3Error(400, 'AuthorizationHeaderMalformed', 'Authorization ヘッダの形が違います');
      [, credential = '', signedHeaders = '', signature = ''] = m;
      amzDate = String(req.headers['x-amz-date'] ?? '');
      if (Math.abs(now().getTime() - parseAmzDate(amzDate)) > 15 * 60 * 1000) {
        throw new S3Error(403, 'RequestTimeTooSkewed', 'リクエストの時刻が 15 分以上ずれています');
      }
    }
    const [keyId, date, credRegion, service, terminator] = credential.split('/');
    if (keyId !== accessKeyId) throw new S3Error(403, 'InvalidAccessKeyId', 'アクセスキーが違います');
    if (credRegion !== region || service !== 's3' || terminator !== 'aws4_request' || date !== amzDate.slice(0, 8)) {
      throw new S3Error(403, 'SignatureDoesNotMatch', '署名の範囲（日付・リージョン・サービス）が違います');
    }
    // 1. 正規化したリクエスト
    const rawPath = (req.url ?? '/').split('?')[0] ?? '/';
    const query = [...q]
      .filter(([k]) => k !== 'X-Amz-Signature')
      .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
      .sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const names = signedHeaders.split(';');
    if (!names.includes('host')) throw new S3Error(403, 'SignatureDoesNotMatch', 'host ヘッダが署名に入っていません');
    const headerLines = names.map((n) => {
      const raw = req.headers[n];
      const value = Array.isArray(raw) ? raw.join(',') : (raw ?? '');
      return `${n}:${value.trim().replace(/\s+/g, ' ')}\n`;
    });
    const canonical = [req.method, rawPath, query, headerLines.join(''), signedHeaders, payloadHash].join('\n');
    // 2. 署名する文字列
    const scope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
    // 3. 鍵を作って HMAC
    const kDate = hmac(`AWS4${secretAccessKey}`, date);
    const kSigning = hmac(hmac(hmac(kDate, region), 's3'), 'aws4_request');
    const expected = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new S3Error(403, 'SignatureDoesNotMatch', '署名が合いません（キー・時刻・ヘッダ・パスのどれかが違います）');
    }
  }

  async function readBody(req: http.IncomingMessage): Promise<Buffer> {
    // S3 と同じく、長さの分からない送り方（Transfer-Encoding: chunked）は断る
    if (req.headers['content-length'] === undefined) {
      throw new S3Error(411, 'MissingContentLength', 'Content-Length ヘッダが要ります');
    }
    const declared = Number(req.headers['content-length']);
    if (declared > maxObjectBytes) throw new S3Error(400, 'EntityTooLarge', `大きすぎます（上限 ${maxObjectBytes} バイト）`);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      total += chunk.length;
      if (total > maxObjectBytes) throw new S3Error(400, 'EntityTooLarge', `大きすぎます（上限 ${maxObjectBytes} バイト）`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  function corsHeaders(req: http.IncomingMessage, res: http.ServerResponse) {
    const origin = req.headers.origin;
    if (origin !== undefined && corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Expose-Headers', 'ETag');
    }
  }

  async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    corsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin === undefined || !corsOrigins.includes(origin)) throw new S3Error(403, 'AccessForbidden', 'CORS で許していないオリジンです');
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, HEAD');
      res.setHeader('Access-Control-Allow-Headers', String(req.headers['access-control-request-headers'] ?? ''));
      res.setHeader('Access-Control-Max-Age', '600');
      res.writeHead(200).end();
      return;
    }
    const [, bucketRaw = '', ...keyParts] = url.pathname.split('/');
    const bucket = decodeURIComponent(bucketRaw);
    const key = decodeURIComponent(keyParts.join('/'));

    // 本文のハッシュ: x-amz-content-sha256 のとおりか（UNSIGNED-PAYLOAD は確かめない）
    const presigned = url.searchParams.has('X-Amz-Signature');
    if (!presigned && req.headers.authorization === undefined) throw new S3Error(403, 'AccessDenied', '署名がありません');
    const declaredHash = presigned ? 'UNSIGNED-PAYLOAD' : String(req.headers['x-amz-content-sha256'] ?? '');
    if (declaredHash.startsWith('STREAMING-')) {
      throw new S3Error(501, 'NotImplemented', "aws-chunked の送り方には対応していません。クライアントに requestChecksumCalculation: 'WHEN_REQUIRED' を付けてください");
    }
    if (!presigned && declaredHash === '') throw new S3Error(400, 'InvalidRequest', 'x-amz-content-sha256 がありません');
    const body = req.method === 'PUT' ? await readBody(req) : Buffer.alloc(0);
    verifySignature(req, url, declaredHash);
    if (declaredHash !== 'UNSIGNED-PAYLOAD' && declaredHash !== sha256(body)) {
      throw new S3Error(400, 'XAmzContentSHA256Mismatch', '本文のハッシュが合いません');
    }

    if (bucket === '') throw new S3Error(400, 'InvalidRequest', 'パス形式（/バケット/キー）で頼んでください（forcePathStyle: true）');
    if (key === '') return handleBucket(req, res, url, bucket);
    const objects = store.get(bucket);
    if (objects === undefined) throw new S3Error(404, 'NoSuchBucket', `バケットがありません: ${bucket}`);

    if (req.method === 'PUT') {
      if (req.headers['x-amz-copy-source'] !== undefined) throw new S3Error(501, 'NotImplemented', 'コピーには対応していません');
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string' && (KEPT_HEADERS.includes(name) || name.startsWith('x-amz-meta-'))) headers[name] = value;
      }
      headers['content-type'] ??= 'application/octet-stream';
      const obj: StoredObject = { body, etag: `"${createHash('md5').update(body).digest('hex')}"`, lastModified: now(), headers };
      objects.set(key, obj);
      if (dir !== undefined) {
        await mkdir(path.join(dir, bucket), { recursive: true });
        await writeFile(`${fileBase(bucket, key)}.bin`, body);
        await writeFile(`${fileBase(bucket, key)}.json`, JSON.stringify({ key, etag: obj.etag, lastModified: obj.lastModified, headers }));
      }
      res.writeHead(200, { ETag: obj.etag }).end();
      return;
    }
    if (req.method === 'DELETE') {
      objects.delete(key);
      if (dir !== undefined) {
        await rm(`${fileBase(bucket, key)}.bin`, { force: true });
        await rm(`${fileBase(bucket, key)}.json`, { force: true });
      }
      res.writeHead(204).end();
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const obj = objects.get(key);
      if (obj === undefined) throw new S3Error(404, 'NoSuchKey', `キーがありません: ${key}`);
      const headers: Record<string, string> = {
        ...obj.headers,
        ETag: obj.etag,
        'Last-Modified': obj.lastModified.toUTCString(),
        'Accept-Ranges': 'bytes',
      };
      // 署名付きの GET だけは、response-… のクエリで、返すヘッダを上書きできる（ダウンロードの名前など）
      for (const [param, header] of [
        ['response-content-type', 'content-type'],
        ['response-content-disposition', 'content-disposition'],
        ['response-cache-control', 'cache-control'],
      ] as const) {
        const v = url.searchParams.get(param);
        if (v !== null) headers[header] = v;
      }
      if (req.headers['if-none-match'] === obj.etag) {
        res.writeHead(304, { ETag: obj.etag }).end();
        return;
      }
      const range = /^bytes=(\d+)-(\d*)$/.exec(String(req.headers.range ?? ''));
      if (range !== null) {
        const start = Number(range[1]);
        const end = Math.min(range[2] === '' ? obj.body.length - 1 : Number(range[2]), obj.body.length - 1);
        if (start > end) throw new S3Error(416, 'InvalidRange', '範囲が正しくありません');
        const part = obj.body.subarray(start, end + 1);
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${obj.body.length}`, 'Content-Length': part.length });
        res.end(req.method === 'HEAD' ? undefined : part);
        return;
      }
      res.writeHead(200, { ...headers, 'Content-Length': obj.body.length });
      res.end(req.method === 'HEAD' ? undefined : obj.body);
      return;
    }
    throw new S3Error(405, 'MethodNotAllowed', `${req.method} には対応していません`);
  }

  function handleBucket(req: http.IncomingMessage, res: http.ServerResponse, url: URL, bucket: string) {
    if (req.method === 'PUT') {
      if (store.has(bucket)) throw new S3Error(409, 'BucketAlreadyOwnedByYou', `既にあります: ${bucket}`);
      if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new S3Error(400, 'InvalidBucketName', '名前は小文字・数字・ハイフン・ドットの 3〜63 文字です');
      store.set(bucket, new Map());
      res.writeHead(200, { Location: `/${bucket}` }).end();
      return;
    }
    const objects = store.get(bucket);
    if (objects === undefined) throw new S3Error(404, 'NoSuchBucket', `バケットがありません: ${bucket}`);
    if (req.method === 'HEAD') {
      res.writeHead(200).end();
      return;
    }
    if (req.method === 'GET' && url.searchParams.get('list-type') === '2') {
      const prefix = url.searchParams.get('prefix') ?? '';
      const maxKeys = Math.min(Number(url.searchParams.get('max-keys') ?? 1000) || 1000, 1000);
      const token = url.searchParams.get('continuation-token');
      const after = token !== null ? Buffer.from(token, 'base64url').toString() : (url.searchParams.get('start-after') ?? '');
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix) && k > after).sort();
      const page = keys.slice(0, maxKeys);
      const truncated = keys.length > page.length;
      const contents = page
        .map((k) => {
          const o = objects.get(k);
          if (o === undefined) return '';
          return `<Contents><Key>${xml(k)}</Key><LastModified>${o.lastModified.toISOString()}</LastModified><ETag>${xml(o.etag)}</ETag><Size>${o.body.length}</Size><StorageClass>STANDARD</StorageClass></Contents>`;
        })
        .join('');
      const next = truncated ? `<NextContinuationToken>${Buffer.from(page.at(-1) ?? '').toString('base64url')}</NextContinuationToken>` : '';
      sendXml(
        res,
        200,
        `<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${xml(bucket)}</Name><Prefix>${xml(prefix)}</Prefix><KeyCount>${page.length}</KeyCount><MaxKeys>${maxKeys}</MaxKeys><IsTruncated>${truncated}</IsTruncated>${contents}${next}</ListBucketResult>`,
      );
      return;
    }
    throw new S3Error(501, 'NotImplemented', 'このバケットの操作には対応していません');
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      const e = err instanceof S3Error ? err : new S3Error(500, 'InternalError', String(err));
      if (res.headersSent) {
        res.destroy();
        return;
      }
      // 本文を読まずに返すと、客が送っている途中の本文で接続が乱れるので、閉じる
      res.setHeader('Connection', 'close');
      const resource = (req.url ?? '').split('?')[0] ?? '';
      if (req.method === 'HEAD') {
        res.writeHead(e.status).end();
        return;
      }
      sendXml(
        res,
        e.status,
        `<Error><Code>${e.code}</Code><Message>${xml(e.message)}</Message><Resource>${xml(resource)}</Resource><RequestId>${randomUUID()}</RequestId></Error>`,
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const { port: actual } = server.address() as AddressInfo;
  return {
    url: `http://${host}:${actual}`,
    server,
    /** テスト用: 置かれているキーの一覧 */
    keys: (bucket: string) => [...(store.get(bucket)?.keys() ?? [])].sort(),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function parseAmzDate(value: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (m === null) throw new S3Error(403, 'AccessDenied', 'X-Amz-Date の形が違います（YYYYMMDDTHHMMSSZ）');
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return Date.UTC(y ?? 0, (mo ?? 1) - 1, d, h, mi, s);
}

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function sendXml(res: http.ServerResponse, status: number, body: string) {
  res.writeHead(status, { 'Content-Type': 'application/xml' });
  res.end(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`);
}

if (import.meta.main) {
  const list = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  const s3 = await startMiniS3({
    port: Number(process.env.S3_PORT ?? 9800),
    ...(process.env.S3_BUCKETS !== undefined && { buckets: list(process.env.S3_BUCKETS) }),
    ...(process.env.S3_DIR !== undefined && { dir: path.resolve(process.env.S3_DIR) }),
    corsOrigins: list(process.env.S3_CORS_ORIGINS),
  });
  console.log(`練習用の S3: ${s3.url}（アクセスキー dev-only-access-key、バケット ${list(process.env.S3_BUCKETS).join(', ') || 'task-files, demo'}）`);
  if (process.env.S3_DIR !== undefined) console.log(`  保存するフォルダ: ${path.resolve(process.env.S3_DIR)}`);
  process.on('SIGINT', () => void s3.close().then(() => process.exit(0)));
  process.on('SIGTERM', () => void s3.close().then(() => process.exit(0)));
}
