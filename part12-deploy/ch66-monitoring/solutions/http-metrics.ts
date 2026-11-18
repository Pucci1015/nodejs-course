// 第66章 練習問題6: Express のミドルウェアで、リクエストを、ルートの形ごとに数える（本文 3.3節）
import type express from 'express';

export type HttpMetrics = {
  /** いちばん最初に app.use する */
  middleware: express.RequestHandler;
  /** Prometheus の文字の形 */
  render(): string;
};

const BUCKETS = [0.01, 0.05, 0.1, 0.5, 1];

export function createHttpMetrics(options: { now?: () => number } = {}): HttpMetrics {
  const now = options.now ?? (() => performance.now());
  const counts = new Map<string, number>(); // ラベルの文字 → 数
  const durations = new Map<string, { buckets: number[]; sum: number; count: number }>(); // route → ヒストグラム

  function routeOf(req: express.Request): string {
    // req.route はルートが決まったときだけある。ルーター（app.use('/api/tasks', router)）の下なら baseUrl を前に足す
    const r: unknown = req.route; // Express の型では any なので、unknown で受けて確かめる
    return typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string' ? `${req.baseUrl}${r.path}` : 'unmatched';
  }

  const middleware: express.RequestHandler = (req, res, next) => {
    const start = now();
    res.once('finish', () => {
      const seconds = (now() - start) / 1000;
      const route = routeOf(req);
      const key = `method="${req.method}",route="${route}",status="${res.statusCode}"`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const h = durations.get(route) ?? { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
      BUCKETS.forEach((le, i) => {
        if (seconds <= le) h.buckets[i] = (h.buckets[i] ?? 0) + 1;
      });
      h.sum += seconds;
      h.count += 1;
      durations.set(route, h);
    });
    next();
  };

  function render(): string {
    const lines = ['# HELP http_requests_total リクエストの数', '# TYPE http_requests_total counter'];
    for (const [key, v] of counts) lines.push(`http_requests_total{${key}} ${v}`);
    lines.push('# HELP http_request_duration_seconds かかった秒数', '# TYPE http_request_duration_seconds histogram');
    for (const [route, h] of durations) {
      BUCKETS.forEach((le, i) => lines.push(`http_request_duration_seconds_bucket{route="${route}",le="${le}"} ${h.buckets[i] ?? 0}`));
      lines.push(`http_request_duration_seconds_bucket{route="${route}",le="+Inf"} ${h.count}`);
      lines.push(`http_request_duration_seconds_sum{route="${route}"} ${h.sum}`);
      lines.push(`http_request_duration_seconds_count{route="${route}"} ${h.count}`);
    }
    return lines.join('\n') + '\n';
  }

  return { middleware, render };
}
