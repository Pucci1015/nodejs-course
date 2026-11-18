// 動かす人のためのルート（/healthz・/readyz・/version・/metrics）を「外から」確かめるテスト（土台）
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import * as h from '../support/helpers.ts';

const TOKEN = 'dev-only-metrics-token-for-tests-00000';
let server: h.Server;
before(async () => {
  server = await h.startServer(await h.freePort(), { METRICS_TOKEN: TOKEN, APP_VERSION: 'test-1' });
});
after(async () => {
  await h.stopServer(server);
  await h.cleanup();
});

test('/healthz・/readyz・/version は答える。覚えさせない（no-store）', async () => {
  for (const [p, body] of [
    ['/healthz', { status: 'ok' }],
    ['/readyz', { status: 'ready', checks: { database: 'ok', redis: 'ok' } }],
    ['/version', { version: 'test-1' }],
  ] as const) {
    const r = await fetch(server.base + p);
    assert.equal(r.status, 200, p);
    assert.deepEqual(await r.json(), body);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
});

test('/metrics は合言葉（Bearer）が無ければ 401。あれば Prometheus の形', async () => {
  assert.equal((await fetch(`${server.base}/metrics`)).status, 401);
  const r = await fetch(`${server.base}/metrics`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /^# TYPE http_requests_total counter$/m);
});

test('止める合図（SIGTERM）を受けたら、終了コード 0 で止まる', async () => {
  const s = await h.startServer(await h.freePort());
  s.kill('SIGTERM');
  assert.equal(await s.exited, 0);
});
