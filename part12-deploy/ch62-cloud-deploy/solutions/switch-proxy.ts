// 第62章 練習問題8: 合言葉とヘルスチェックつきの、切り替えるプロキシ（本文6節）
import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

export type SwitchProxyOptions = {
  /** 名前 → ポート（例: { blue: 9821, green: 9822 }）。行き先はどれも 127.0.0.1 */
  upstreams: Record<string, number>;
  /** 最初の行き先の名前 */
  active: string;
  /** 切り替えの API の合言葉（Authorization: Bearer …） */
  token: string;
  /** 切り替える前に確かめるパス。既定は '/healthz' */
  healthPath?: string;
  /** ヘルスチェックを待つ時間。既定は 2000 */
  healthTimeoutMs?: number;
};

/** 長さが違っても例外にならないよう、ハッシュにしてから比べる（第10部 第52章） */
function sameToken(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c: Buffer) => {
      body += c.toString();
      if (body.length > 1024) req.destroy(new Error('大きすぎます'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/** まだ listen していない http.Server を返す */
export function createSwitchProxy(options: SwitchProxyOptions): http.Server {
  const healthPath = options.healthPath ?? '/healthz';
  const healthTimeoutMs = options.healthTimeoutMs ?? 2000;
  let active = options.active;

  async function healthy(port: number): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${healthPath}`, { signal: AbortSignal.timeout(healthTimeoutMs) });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async function admin(req: http.IncomingMessage, res: http.ServerResponse) {
    if (!sameToken(req.headers.authorization ?? '', `Bearer ${options.token}`)) {
      sendJson(res, 401, { error: '合言葉が違います' });
      return;
    }
    if (req.method === 'GET' && req.url === '/__deploy/status') {
      sendJson(res, 200, { active, upstreams: Object.keys(options.upstreams) });
      return;
    }
    if (req.method === 'POST' && req.url === '/__deploy/switch') {
      let to: unknown;
      try {
        const parsed: unknown = JSON.parse(await readBody(req));
        to = typeof parsed === 'object' && parsed !== null && 'to' in parsed ? parsed.to : undefined;
      } catch {
        to = undefined;
      }
      if (typeof to !== 'string' || !Object.hasOwn(options.upstreams, to)) {
        sendJson(res, 400, { error: '行き先の名前が違います' });
        return;
      }
      if (!(await healthy(options.upstreams[to]!))) {
        sendJson(res, 409, { error: `${to} の ${healthPath} が 200 になりません。切り替えません` });
        return;
      }
      const previous = active;
      active = to;
      sendJson(res, 200, { active, previous });
      return;
    }
    sendJson(res, 404, { error: '知らない操作です' });
  }

  function forward(req: http.IncomingMessage, res: http.ServerResponse) {
    // 頼みが来たときの行き先を、ここで決める。後で active が変わっても、この頼みはこのまま
    const port = options.upstreams[active]!;
    const upstream = http.request(
      { host: '127.0.0.1', port, method: req.method, path: req.url, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('アプリにつながりません\n');
    });
    req.pipe(upstream);
  }

  return http.createServer((req, res) => {
    if ((req.url ?? '').startsWith('/__deploy/')) {
      admin(req, res).catch(() => {
        if (!res.headersSent) sendJson(res, 500, { error: '失敗しました' });
      });
      return;
    }
    forward(req, res);
  });
}
