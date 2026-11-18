// 練習問題8 のテスト（時計は偽物。load は、呼ばれた回数を数える偽物）
// 使い方: node --test tag-cache.test.ts
//   模範解答を試す: MODULE=../solutions/tag-cache.ts node --test tag-cache.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './tag-cache.ts');
const { createTagCache }: typeof import('./tag-cache.ts') = await import(pathToFileURL(file).href);

/** 偽の時計 */
function clock() {
  let t = 1_000_000;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

/** 呼ばれるたびに 'v1'・'v2'… を返す load。delayMs だけ待つ */
function loader(opts: { ttlMs: number; swrMs?: number; tags?: string[]; delayMs?: number; fail?: boolean }) {
  let calls = 0;
  return {
    calls: () => calls,
    load: async () => {
      calls += 1;
      const n = calls;
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      if (opts.fail) throw new Error('読めません');
      return { value: `v${n}`, ttlMs: opts.ttlMs, swrMs: opts.swrMs, tags: opts.tags };
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

test('新鮮な間は load を呼ばない', async () => {
  const c = clock();
  const cache = createTagCache<string>({ now: c.now });
  const l = loader({ ttlMs: 1000 });
  assert.equal(await cache.get('a', l.load), 'v1');
  c.advance(999);
  assert.equal(await cache.get('a', l.load), 'v1');
  assert.equal(l.calls(), 1);
  assert.deepEqual(cache.stats(), { hit: 1, stale: 0, miss: 1 });
});

test('ttl を過ぎて swr も無ければ、load を待って新しいものを返す', async () => {
  const c = clock();
  const cache = createTagCache<string>({ now: c.now });
  const l = loader({ ttlMs: 1000 });
  await cache.get('a', l.load);
  c.advance(1000);
  assert.equal(await cache.get('a', l.load), 'v2');
  assert.deepEqual(cache.stats(), { hit: 0, stale: 0, miss: 2 });
});

test('swr の間は古いものをすぐ返し、後ろで取り直す（次は新しいもの）', async () => {
  const c = clock();
  const cache = createTagCache<string>({ now: c.now });
  const l = loader({ ttlMs: 1000, swrMs: 5000 });
  await cache.get('a', l.load);
  c.advance(3000);
  assert.equal(await cache.get('a', l.load), 'v1');
  await tick();
  assert.equal(l.calls(), 2);
  assert.equal(await cache.get('a', l.load), 'v2');
  assert.deepEqual(cache.stats(), { hit: 1, stale: 1, miss: 1 });
});

test('swr の取り直しは、同時に何回来ても 1 回。失敗しても古いものを持ち続ける', async () => {
  const c = clock();
  const cache = createTagCache<string>({ now: c.now });
  await cache.get('a', loader({ ttlMs: 1000, swrMs: 5000 }).load);
  c.advance(2000);
  const failing = loader({ ttlMs: 1000, swrMs: 5000, fail: true, delayMs: 20 });
  const got = await Promise.all([cache.get('a', failing.load), cache.get('a', failing.load), cache.get('a', failing.load)]);
  assert.deepEqual(got, ['v1', 'v1', 'v1']);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(failing.calls(), 1);
  assert.equal(await cache.get('a', failing.load), 'v1', '失敗の後も古いもの');
});

test('同時の miss は、1 回の load にまとめる。失敗したら全員が失敗し、覚えない', async () => {
  const cache = createTagCache<string>();
  const l = loader({ ttlMs: 1000, delayMs: 30 });
  const got = await Promise.all([cache.get('a', l.load), cache.get('a', l.load), cache.get('a', l.load)]);
  assert.deepEqual(got, ['v1', 'v1', 'v1']);
  assert.equal(l.calls(), 1);

  const bad = loader({ ttlMs: 1000, delayMs: 20, fail: true });
  const results = await Promise.allSettled([cache.get('b', bad.load), cache.get('b', bad.load)]);
  assert.deepEqual(results.map((r) => r.status), ['rejected', 'rejected']);
  assert.equal(bad.calls(), 1);
  const good = loader({ ttlMs: 1000 });
  assert.equal(await cache.get('b', good.load), 'v1', '失敗したものは覚えていない');
});

test('purgeKey・purgeTag で消す。印の無いもの・ほかの印のものは残る', async () => {
  const cache = createTagCache<string>();
  const t1 = loader({ ttlMs: 60_000, tags: ['task-1', 'tasks'] });
  const t2 = loader({ ttlMs: 60_000, tags: ['task-2', 'tasks'] });
  const st = loader({ ttlMs: 60_000 });
  await cache.get('task:1', t1.load);
  await cache.get('task:2', t2.load);
  await cache.get('stats', st.load);
  cache.purgeTag('task-1');
  assert.equal(await cache.get('task:1', t1.load), 'v2');
  assert.equal(await cache.get('task:2', t2.load), 'v1');
  cache.purgeTag('tasks');
  assert.equal(await cache.get('task:1', t1.load), 'v3');
  assert.equal(await cache.get('task:2', t2.load), 'v2');
  cache.purgeKey('stats');
  assert.equal(await cache.get('stats', st.load), 'v2');
});

test('読み込み中に消されたら、その結果は覚えない（古いデータが戻ってこない）', async () => {
  const cache = createTagCache<string>();
  const slow = loader({ ttlMs: 60_000, tags: ['t'], delayMs: 30 });
  const p = cache.get('a', slow.load);
  await tick();
  cache.purgeKey('a');
  assert.equal(await p, 'v1', '待っていた人には返す');
  const next = loader({ ttlMs: 60_000 });
  assert.equal(await cache.get('a', next.load), 'v1');
  assert.equal(next.calls(), 1, '消した後は、もう一度読む');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
