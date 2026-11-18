// 動かす人のためのルート（第60章 5節・第62章 7節・第66章 3節）
//   /healthz  プロセスが生きているか（何にもつながずに答える）
//   /readyz   客を回してよいか（止める途中でなく、データベース・Redis につながる）
//   /version  動いている版（デプロイの後で、新しい版になったかを確かめる）
//   /metrics  数（Prometheus の形）。合言葉（METRICS_TOKEN）があれば、Bearer で送られたものだけ
import crypto from 'node:crypto';
import express from 'express';
import type { Logger } from 'pino';

export type Check = (signal: AbortSignal) => Promise<unknown>;

export type OpsDeps = {
  isReady: () => boolean;
  /** 名前 → 確かめる関数。どれかが失敗（か 2 秒で終わらない）なら 503 */
  checks: Record<string, Check>;
  version: string;
  renderMetrics: () => Promise<string>;
  metricsToken: string | undefined;
  logger: Logger;
};

/** 合言葉を、かかる時間で中身が分からないように比べる（第22章 7節） */
function sameToken(given: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createOpsRouter({
  isReady,
  checks,
  version,
  renderMetrics,
  metricsToken,
  logger,
}: OpsDeps): express.Router {
  const router = express.Router();
  const noStore = (res: express.Response) => res.set('Cache-Control', 'no-store');

  router.get('/healthz', (_req, res) => {
    noStore(res).json({ status: 'ok' });
  });

  router.get('/readyz', async (_req, res) => {
    noStore(res);
    if (!isReady()) {
      res.status(503).json({ status: 'shutting_down' });
      return;
    }
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await check(AbortSignal.timeout(2000));
          return [name, 'ok'] as const;
        } catch (err) {
          logger.warn({ err, check: name }, '/readyz の確かめが失敗しました');
          return [name, 'fail'] as const;
        }
      }),
    );
    const ok = results.every(([, r]) => r === 'ok');
    // どれが失敗したかの名前だけを返す（エラーの中身は、ログにだけ書く）
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not_ready', checks: Object.fromEntries(results) });
  });

  router.get('/version', (_req, res) => {
    noStore(res).json({ version });
  });

  router.get('/metrics', async (req, res) => {
    noStore(res);
    if (metricsToken !== undefined) {
      const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
      if (m?.[1] === undefined || !sameToken(m[1], metricsToken)) {
        res.status(401).set('WWW-Authenticate', 'Bearer').type('text/plain').send('合言葉が違います\n');
        return;
      }
    }
    res.type('text/plain; version=0.0.4').send(await renderMetrics());
  });

  return router;
}
