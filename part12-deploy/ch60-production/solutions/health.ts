// 第60章 練習問題5の模範解答: /healthz と /readyz のルーター（本文8節）
import { Router } from 'express';

export type HealthOptions = {
  /** 頼みを受ける前に確かめるもの。名前 → 確かめる関数（失敗なら reject） */
  checks: Record<string, () => Promise<unknown>>;
  /** 1つの確かめを待つ時間（ミリ秒） */
  timeoutMs: number;
  /** 止めている途中なら true */
  isStopping: () => boolean;
};

/** promise が ms ミリ秒で終わらなければ、失敗にする（本文8.1節） */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`${ms} ms で終わりませんでした`)), ms).unref()),
  ]);
}

export function createHealthRouter(options: HealthOptions): Router {
  const { checks, timeoutMs, isStopping } = options;
  const router = Router();
  // 結果を覚えさせない（ロードバランサやプロキシが、古い答えを返さないように）
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  router.get('/readyz', async (_req, res) => {
    if (isStopping()) {
      res.status(503).json({ status: 'stopping' });
      return;
    }
    const names = Object.keys(checks);
    // 同時に動かし、1つの失敗で全体を止めない（allSettled。第3部 第12章）
    const results = await Promise.allSettled(names.map((name) => withTimeout(Promise.resolve().then(() => checks[name]?.()), timeoutMs)));
    const summary: Record<string, 'ok' | 'error'> = {};
    let allOk = true;
    for (const [i, r] of results.entries()) {
      const name = names[i] ?? '';
      summary[name] = r.status === 'fulfilled' ? 'ok' : 'error';
      if (r.status === 'rejected') {
        allOk = false;
        // 理由はログに（応答には書かない）
        console.error(`readyz: ${name}:`, r.reason instanceof Error ? r.reason.message : r.reason);
      }
    }
    res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'error', checks: summary });
  });
  return router;
}
