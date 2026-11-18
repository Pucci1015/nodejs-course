// 追加（第12部）: 数を数えて /metrics で Prometheus の文字の形で出す（第66章 3節、練習問題6の http-metrics.ts から）
// ルートは、パスの形（/api/tasks/:id）で数える。本物の id で数えると、ラベルの組が増え続ける
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type express from 'express';

const BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

/** 今の値を、聞かれたときに読む数 */
export type Gauge = { name: string; help: string; read: () => number | Promise<number> };

export function createMetrics(options: { now?: () => number } = {}) {
  const now = options.now ?? (() => performance.now());
  const counts = new Map<string, number>(); // ラベルの文字 → 数
  const durations = new Map<string, { buckets: number[]; sum: number; count: number }>(); // route → ヒストグラム
  const gauges: Gauge[] = [];

  // イベントループの遅れ（第13章 7節・第66章 4節）。聞かれるたびに、前に聞かれてからの最大を出して、数え直す
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();
  gauges.push({
    name: 'nodejs_eventloop_lag_max_seconds',
    help: 'この前に読まれてからの、イベントループの遅れの最大（秒）',
    read: () => {
      const v = lag.max / 1e9;
      lag.reset();
      return Number.isFinite(v) ? v : 0;
    },
  });
  gauges.push({
    name: 'process_resident_memory_bytes',
    help: 'プロセスが使っているメモリ（バイト）',
    read: () => process.memoryUsage.rss(),
  });

  function routeOf(req: express.Request): string {
    const r: unknown = req.route; // Express の型では any なので、unknown で受けて確かめる
    return typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string'
      ? `${req.baseUrl}${r.path}`
      : 'unmatched';
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

  async function render(): Promise<string> {
    const lines = ['# HELP http_requests_total リクエストの数', '# TYPE http_requests_total counter'];
    for (const [key, v] of counts) lines.push(`http_requests_total{${key}} ${v}`);
    lines.push('# HELP http_request_duration_seconds かかった秒数', '# TYPE http_request_duration_seconds histogram');
    for (const [route, h] of durations) {
      BUCKETS.forEach((le, i) =>
        lines.push(`http_request_duration_seconds_bucket{route="${route}",le="${le}"} ${h.buckets[i] ?? 0}`),
      );
      lines.push(`http_request_duration_seconds_bucket{route="${route}",le="+Inf"} ${h.count}`);
      lines.push(`http_request_duration_seconds_sum{route="${route}"} ${h.sum}`);
      lines.push(`http_request_duration_seconds_count{route="${route}"} ${h.count}`);
    }
    for (const g of gauges) {
      let v: number;
      try {
        v = await g.read();
      } catch {
        continue; // 読めない数（Redis が止まっている、など）は出さない
      }
      lines.push(`# HELP ${g.name} ${g.help}`, `# TYPE ${g.name} gauge`, `${g.name} ${v}`);
    }
    return lines.join('\n') + '\n';
  }

  return {
    middleware,
    render,
    /** 数を足す（SSE の接続の数、待っている仕事の数など） */
    addGauge: (g: Gauge) => {
      gauges.push(g);
    },
    stop: () => lag.disable(),
  };
}

export type Metrics = ReturnType<typeof createMetrics>;
