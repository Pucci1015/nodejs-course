// 練習問題8 のテスト
// 使い方: node --test switch-proxy.test.ts
//   模範解答を試す: MODULE=../solutions/switch-proxy.ts node --test switch-proxy.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './switch-proxy.ts');
const { createSwitchProxy }: typeof import('./switch-proxy.ts') = await import(pathToFileURL(file).href);

const TOKEN = 'dev-only-deploy-token';
const servers: http.Server[] = [];
let healthOk = { blue: true, green: true, sick: false };

// 版の名前を返す偽のアプリ。/slow は 300ms 後に返す。/healthz は healthOk で変わる
async function fakeApp(name: 'blue' | 'green' | 'sick'): Promise<number> {
  const s = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(healthOk[name] ? 200 : 503).end();
      return;
    }
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => {
      const send = () =>
        res
          .writeHead(201, { 'content-type': 'application/json', 'x-app': name })
          .end(JSON.stringify({ name, method: req.method, url: req.url, body }));
      if (req.url === '/slow') setTimeout(send, 300);
      else send();
    });
  });
  servers.push(s);
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  return (s.address() as AddressInfo).port;
}

let base = '';
let ports: Record<string, number> = {};
before(async () => {
  ports = { blue: await fakeApp('blue'), green: await fakeApp('green'), sick: await fakeApp('sick'), gone: 1 };
  const proxy = createSwitchProxy({ upstreams: ports, active: 'blue', token: TOKEN, healthTimeoutMs: 500 });
  servers.push(proxy);
  await new Promise<void>((r) => proxy.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
});
after(() => {
  for (const s of servers) s.close();
});

function get(p: string, init: RequestInit = {}) {
  return fetch(`${base}${p}`, { ...init, signal: AbortSignal.timeout(3000) });
}
function switchTo(to: unknown, token = TOKEN) {
  return get('/__deploy/switch', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to }),
  });
}

test('今の行き先へ渡す（メソッド・パス・ボディ・状態・ヘッダもそのまま）', async () => {
  const res = await get('/tasks?x=1', { method: 'POST', body: 'hello' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('x-app'), 'blue');
  assert.deepEqual(await res.json(), { name: 'blue', method: 'POST', url: '/tasks?x=1', body: 'hello' });
});

test('status: 合言葉があれば、今の行き先と名前の一覧', async () => {
  const res = await get('/__deploy/status', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { active: 'blue', upstreams: ['blue', 'green', 'sick', 'gone'] });
});

test('合言葉が無い・違うと 401（行き先は変わらない）', async () => {
  assert.equal((await get('/__deploy/status')).status, 401);
  assert.equal((await switchTo('green', 'wrong')).status, 401);
  assert.equal((await switchTo('green', `${TOKEN}x`)).status, 401);
  assert.equal((await get('/')).headers.get('x-app'), 'blue');
});

test('知らない名前・形の違うボディは 400', async () => {
  assert.equal((await switchTo('purple')).status, 400);
  assert.equal((await switchTo(42)).status, 400);
  const res = await get('/__deploy/switch', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: '{' });
  assert.equal(res.status, 400);
});

test('ヘルスチェックが 200 でない・つながらない行き先へは、切り替えずに 409', async () => {
  for (const to of ['sick', 'gone']) {
    const res = await switchTo(to);
    assert.equal(res.status, 409, to);
    const body = (await res.json()) as { error?: unknown };
    assert.equal(typeof body.error, 'string', to);
  }
  assert.equal((await get('/')).headers.get('x-app'), 'blue');
});

test('切り替える: 200 で前と今の名前を返し、その後は新しい行き先へ', async () => {
  const res = await switchTo('green');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { active: 'green', previous: 'blue' });
  assert.equal((await get('/')).headers.get('x-app'), 'green');
});

test('切り替えの途中に処理中だった頼みは、もとの行き先で最後まで終わる', async () => {
  const slow = get('/slow'); // 今は green
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await switchTo('blue')).status, 200);
  const res = await slow;
  assert.equal(res.headers.get('x-app'), 'green');
  assert.equal((await get('/')).headers.get('x-app'), 'blue');
});

test('行き先が落ちていたら 502', async () => {
  healthOk = { ...healthOk, green: true };
  const proxy = createSwitchProxy({ upstreams: { gone: 1 }, active: 'gone', token: TOKEN });
  servers.push(proxy);
  await new Promise<void>((r) => proxy.listen(0, '127.0.0.1', r));
  const res = await fetch(`http://127.0.0.1:${(proxy.address() as AddressInfo).port}/`, { signal: AbortSignal.timeout(3000) });
  assert.equal(res.status, 502);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
