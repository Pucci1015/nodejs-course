// テストの部品: Express のアプリを空いているポートで起動し、Cookie を覚える小さなクライアントを作る。書き換えなくてよいファイル
// ブラウザの代わりに「Set-Cookie で来た値を覚えて、次のリクエストに Cookie で付ける」だけをする
import type { TestContext } from 'node:test';
import type { Express } from 'express';
import type { AddressInfo } from 'node:net';

export type Res = { status: number; json: unknown; setCookie: string[] };

export async function startApp(t: TestContext, app: Express) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;

  /** ブラウザ1つ分（Cookie の入れ物を1つ持つ） */
  function browser() {
    const jar = new Map<string, string>();
    async function send(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const res = await fetch(`http://127.0.0.1:${port}${url}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(cookie === '' ? {} : { cookie }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      const setCookie = res.headers.getSetCookie();
      for (const line of setCookie) {
        const [pair = ''] = line.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        // 値が空、または期限が過去の Cookie は「消して」の意味
        if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(line)) jar.delete(name);
        else jar.set(name, value);
      }
      const text = await res.text();
      return { status: res.status, json: text === '' ? null : (JSON.parse(text) as unknown), setCookie };
    }
    return {
      get: (url: string, headers?: Record<string, string>) => send('GET', url, undefined, headers),
      post: (url: string, body?: unknown, headers?: Record<string, string>) => send('POST', url, body ?? {}, headers),
      /** 今覚えている Cookie（テストで中身を見るため） */
      cookies: () => new Map(jar),
    };
  }
  return { browser, port };
}
