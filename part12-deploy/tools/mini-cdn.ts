// 第65章で使う、練習用の小さな CDN（共有キャッシュつきのリバースプロキシ）。中身は読まなくてよい
// 動かし方（~/dev/part12 で）: npm run cdn → http://127.0.0.1:9858/ （オリジンは http://127.0.0.1:9857）
//   ORIGIN=http://127.0.0.1:9000 PORT=9000 で変えられる。PURGE_TOKEN でキャッシュを消す合言葉（既定 dev-only-purge-token）
//
// できること（本物の CDN の動きを、小さくまねたもの）
// - GET の応答を、Cache-Control の s-maxage（無ければ max-age）の間、覚えて返す（X-Cache: HIT、Age）
// - no-store・private・Set-Cookie・Vary: * の応答と、Authorization 付きの頼み（public・s-maxage が無いとき）は覚えない
// - 古くなったら ETag・Last-Modified で確かめる（REVALIDATED）。stale-while-revalidate の間は古いものを返し、後ろで取り直す（STALE）
// - Vary に書かれたヘッダの値ごとに、別々に覚える
// - 同じ URL への同時の取りに行きを1つにまとめる（COLLAPSED）
// - Cache-Tag ヘッダ（カンマ区切り）で印を付け、POST /__purge で URL か印ごとに消す。GET /__cache で中身を見る
import http from 'node:http';

const ORIGIN = new URL(process.env.ORIGIN ?? 'http://127.0.0.1:9857');
const PORT = Number(process.env.PORT ?? 9858);
const PURGE_TOKEN = process.env.PURGE_TOKEN ?? 'dev-only-purge-token';
const MAX_BODY = 10 * 1024 * 1024;

type Stored = {
  status: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  storedAt: number; // ミリ秒
  initialAge: number; // オリジンが返した Age（秒）
  lifetime: number; // 新鮮な秒数
  swr: number; // stale-while-revalidate の秒数
  tags: string[];
};
type Slot = { varyNames: string[]; variants: Map<string, Stored> };

const cache = new Map<string, Slot>(); // URL（パスとクエリ）ごと
const inflight = new Map<string, Promise<Fetched>>(); // 取りに行っている最中のもの
const revalidating = new Set<string>();

const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'host']);

export function parseCacheControl(value: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (value ?? '').split(',')) {
    const [rawName, ...rest] = part.split('=');
    const name = rawName?.trim().toLowerCase();
    if (!name) continue;
    out.set(name, rest.join('=').trim().replace(/^"(.*)"$/, '$1'));
  }
  return out;
}

function header(h: http.IncomingHttpHeaders | Record<string, string | string[]>, name: string): string | undefined {
  const v = h[name];
  return Array.isArray(v) ? v.join(', ') : v;
}

function seconds(cc: Map<string, string>, name: string): number | undefined {
  const v = cc.get(name);
  return v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined;
}

function varyKey(names: string[], req: http.IncomingMessage): string {
  return names.map((n) => `${n}=${header(req.headers, n) ?? ''}`).join('&');
}

function ageOf(s: Stored, now: number): number {
  return s.initialAge + Math.floor((now - s.storedAt) / 1000);
}

/** 覚えてよい応答か。だめなら理由を返す */
function whyNotStore(req: http.IncomingMessage, status: number, headers: Record<string, string | string[]>): string | undefined {
  const cc = parseCacheControl(header(headers, 'cache-control'));
  if (![200, 203, 204, 300, 301, 308, 404, 410].includes(status)) return `status ${status}`;
  if (cc.has('no-store')) return 'no-store';
  if (cc.has('private')) return 'private';
  if (headers['set-cookie'] !== undefined) return 'Set-Cookie がある';
  if ((header(headers, 'vary') ?? '').trim() === '*') return 'Vary: *';
  if (req.headers.authorization && !cc.has('public') && !cc.has('s-maxage')) return 'Authorization 付きの頼み';
  if (seconds(cc, 's-maxage') === undefined && seconds(cc, 'max-age') === undefined && !cc.has('no-cache')) {
    return '新鮮な時間が書かれていない';
  }
  return undefined;
}

type Fetched = { status: number; headers: Record<string, string | string[]>; body: Buffer };

function fetchOrigin(req: http.IncomingMessage, body: Buffer, extra: Record<string, string> = {}): Promise<Fetched> {
  const headers: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined && !HOP.has(k)) headers[k] = v;
  headers['x-forwarded-for'] = req.socket.remoteAddress ?? '';
  headers['x-forwarded-proto'] = 'http';
  headers['x-forwarded-host'] = req.headers.host ?? '';
  Object.assign(headers, extra);
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: ORIGIN.hostname, port: ORIGIN.port, method: req.method, path: req.url, headers },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > MAX_BODY) res.destroy(new Error('応答が大きすぎます'));
          else chunks.push(c);
        });
        res.on('end', () => {
          const h: Record<string, string | string[]> = {};
          for (const [k, v] of Object.entries(res.headers)) if (v !== undefined && !HOP.has(k)) h[k] = v;
          resolve({ status: res.statusCode ?? 502, headers: h, body: Buffer.concat(chunks) });
        });
        res.on('error', reject);
      },
    );
    r.on('error', reject);
    r.end(body);
  });
}

function store(key: string, req: http.IncomingMessage, f: Fetched): Stored | undefined {
  const reason = whyNotStore(req, f.status, f.headers);
  if (reason) {
    console.log(`  覚えない: ${reason}`);
    return undefined;
  }
  const cc = parseCacheControl(header(f.headers, 'cache-control'));
  const lifetime = cc.has('no-cache') ? 0 : (seconds(cc, 's-maxage') ?? seconds(cc, 'max-age') ?? 0);
  const tags = (header(f.headers, 'cache-tag') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const varyNames = (header(f.headers, 'vary') ?? '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  const s: Stored = {
    status: f.status,
    headers: f.headers,
    body: f.body,
    storedAt: Date.now(),
    initialAge: Number(header(f.headers, 'age') ?? 0) || 0,
    lifetime,
    swr: seconds(cc, 'stale-while-revalidate') ?? 0,
    tags,
  };
  let slot = cache.get(key);
  if (!slot || slot.varyNames.join() !== varyNames.join()) {
    slot = { varyNames, variants: new Map() };
    cache.set(key, slot);
  }
  slot.variants.set(varyKey(varyNames, req), s);
  return s;
}

function send(req: http.IncomingMessage, res: http.ServerResponse, status: number, headers: Record<string, string | string[]>, body: Buffer, xcache: string, age?: number) {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(headers)) if (k !== 'cache-tag' && k !== 'content-length' && k !== 'age') out[k] = v;
  if (age !== undefined) out['age'] = String(age);
  out['x-cache'] = xcache;
  // 客が持っている版と同じなら 304（ボディなし）
  const etag = header(headers, 'etag');
  if (status === 200 && etag && header(req.headers, 'if-none-match') === etag) {
    res.writeHead(304, out).end();
    return;
  }
  out['content-length'] = String(body.length);
  res.writeHead(status, out);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** 同じキーで取りに行っている最中なら、それを待つ（まとめる） */
function fetchOnce(id: string, req: http.IncomingMessage, extra: Record<string, string> = {}): { p: Promise<Fetched>; collapsed: boolean } {
  const running = inflight.get(id);
  if (running) return { p: running, collapsed: true };
  const p = fetchOrigin(req, Buffer.alloc(0), extra).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return { p, collapsed: false };
}

function validators(s: Stored): Record<string, string> {
  const extra: Record<string, string> = {};
  const etag = header(s.headers, 'etag');
  const lm = header(s.headers, 'last-modified');
  if (etag) extra['if-none-match'] = etag;
  if (lm) extra['if-modified-since'] = lm;
  return extra;
}

async function revalidate(key: string, req: http.IncomingMessage, s: Stored): Promise<{ stored: Stored | undefined; fetched: Fetched; notModified: boolean }> {
  const f = await fetchOrigin(req, Buffer.alloc(0), validators(s));
  if (f.status === 304) {
    // 中身はそのまま。ヘッダと時刻だけ新しくする
    const merged: Fetched = { status: s.status, headers: { ...s.headers, ...f.headers }, body: s.body };
    return { stored: store(key, req, merged), fetched: merged, notModified: true };
  }
  return { stored: store(key, req, f), fetched: f, notModified: false };
}

async function handleGet(req: http.IncomingMessage, res: http.ServerResponse) {
  const key = req.url ?? '/';
  const now = Date.now();
  const slot = cache.get(key);
  const s = slot?.variants.get(varyKey(slot.varyNames, req));
  if (s) {
    const age = ageOf(s, now);
    if (age < s.lifetime) {
      console.log(`HIT   ${key} age=${age}`);
      return send(req, res, s.status, s.headers, s.body, 'HIT', age);
    }
    if (age < s.lifetime + s.swr) {
      console.log(`STALE ${key} age=${age}（後ろで取り直す）`);
      send(req, res, s.status, s.headers, s.body, 'STALE', age);
      if (!revalidating.has(key)) {
        revalidating.add(key);
        revalidate(key, req, s)
          .then((r) => console.log(`  取り直しました ${key}（${r.notModified ? '304' : r.fetched.status}）`))
          .catch((err: unknown) => console.log(`  取り直しに失敗 ${key}: ${String(err)}`))
          .finally(() => revalidating.delete(key));
      }
      return;
    }
    console.log(`確かめる ${key} age=${age}`);
    const r = await revalidate(key, req, s);
    return send(req, res, r.fetched.status, r.fetched.headers, r.fetched.body, r.notModified ? 'REVALIDATED' : 'MISS', r.stored ? 0 : undefined);
  }
  const { p, collapsed } = fetchOnce(`${key}#${slot ? varyKey(slot.varyNames, req) : ''}`, req);
  console.log(`${collapsed ? 'COLLAPSED' : 'MISS '} ${key}`);
  let f = await p;
  if (collapsed && whyNotStore(req, f.status, f.headers)) {
    // 覚えてはいけない応答（人ごとのものかもしれない）は、まとめずに、この頼みのために取り直す
    console.log(`  まとめられない応答なので、取り直します ${key}`);
    f = await fetchOrigin(req, Buffer.alloc(0));
    return send(req, res, f.status, f.headers, f.body, 'MISS');
  }
  const stored = collapsed ? undefined : store(key, req, f);
  return send(req, res, f.status, f.headers, f.body, collapsed ? 'COLLAPSED' : 'MISS', collapsed || stored ? 0 : undefined);
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

function purge(body: unknown): number {
  let removed = 0;
  if (typeof body !== 'object' || body === null) return 0;
  const urls = 'urls' in body && Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === 'string') : [];
  const tags = 'tags' in body && Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [];
  for (const u of urls) {
    const slot = cache.get(u);
    if (slot) {
      removed += slot.variants.size;
      cache.delete(u);
    }
  }
  for (const [u, slot] of cache) {
    for (const [vk, s] of slot.variants) {
      if (s.tags.some((t) => tags.includes(t))) {
        slot.variants.delete(vk);
        removed += 1;
      }
    }
    if (slot.variants.size === 0) cache.delete(u);
  }
  return removed;
}

const server = http.createServer((req, res) => {
  (async () => {
    if (req.url === '/__purge' && req.method === 'POST') {
      if (req.headers.authorization !== `Bearer ${PURGE_TOKEN}`) {
        res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"合言葉が違います"}\n');
        return;
      }
      const removed = purge(JSON.parse((await readBody(req)).toString('utf8') || '{}'));
      console.log(`PURGE ${removed} 個を消しました`);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ removed }) + '\n');
      return;
    }
    if (req.url === '/__cache' && req.method === 'GET') {
      const now = Date.now();
      const list = [...cache].flatMap(([url, slot]) =>
        [...slot.variants].map(([vary, s]) => ({ url, vary, age: ageOf(s, now), lifetime: s.lifetime, swr: s.swr, tags: s.tags })),
      );
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(list, null, 2) + '\n');
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (req.method === 'HEAD') {
        // HEAD は覚えず、そのまま渡す
        const f = await fetchOrigin(req, Buffer.alloc(0));
        send(req, res, f.status, f.headers, f.body, 'PASS');
        return;
      }
      await handleGet(req, res);
      return;
    }
    // GET・HEAD 以外は、覚えずにそのまま渡す
    console.log(`PASS  ${req.method} ${req.url}`);
    const f = await fetchOrigin(req, await readBody(req));
    send(req, res, f.status, f.headers, f.body, 'PASS');
  })().catch((err: unknown) => {
    console.log(`オリジンにつながりません: ${err instanceof Error ? err.message : String(err)}`);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('502 Bad Gateway（オリジンにつながりません）\n');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mini-cdn: http://127.0.0.1:${PORT}/ → オリジン ${ORIGIN.origin}`);
});
