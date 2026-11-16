// アプリを組み立てる（第26章 4節）。使うものを受け取って、Express のアプリを返す。listen はしない
// 変更（第7部）: TypeScript にした。受け取るものの型は AppDeps
import cors from 'cors';
import express from 'express';
import type { Logger } from 'pino';
import type { Config } from './config.ts';
import type { SseHandler } from './lib/event-hub.ts';
import { notFound, problemHandler } from './middleware/problem.ts';
import { rateLimit } from './middleware/rate-limit.ts';
import { requestLogger } from './middleware/request-logger.ts';
import { createTasksRouter, mapDomainErrors } from './routes/tasks.ts';
import type { TaskService } from './services/tasks.ts';
import type { IdempotencyStore } from './types.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type AppDeps = {
  /** サービスの層（services/tasks.ts） */
  service: TaskService;
  /** SSE のハンドラ（lib/event-hub.ts の sseRoute） */
  sse: SseHandler;
  logger: Logger;
  config: Config;
  /** 止める途中なら false（/readyz が 503 になる） */
  isReady?: () => boolean;
  /** 追加（第6部）: 冪等キーを覚える場所（repositories/pg-idempotency.ts） */
  idempotencyStore: IdempotencyStore;
};

export function createApp({ service, sse, logger, config, isReady = () => true, idempotencyStore }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false); // 自動の弱い ETag は止めて、version から強い ETag を自分で付ける（第25章 7.3節）

  // 1. 最初にログ（後ろで何が起きても、1行書かれるように）
  app.use(requestLogger({ logger }));

  // 2. どの応答にも付けるヘッダ
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff'); // JSON を、ブラウザに HTML や JS だと思わせない
    next();
  });

  // 3. CORS（第2部 第9章、第24章）。第8部の画面（Vite の http://localhost:5173）から呼べるように。第9部の Next.js は、サーバから呼ぶので CORS を使わない
  app.use(
    cors({
      origin: [...config.corsOrigins], // 決めたオリジンだけ。空なら、どこにも許さない
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'If-Match', 'If-None-Match', 'Idempotency-Key', 'Last-Event-ID'],
      // 画面の JavaScript から読めるようにするヘッダ（これに無いものは、ブラウザが見せない）
      exposedHeaders: ['ETag', 'Location', 'Idempotent-Replayed', 'Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'X-Request-Id'],
      maxAge: 600, // プリフライトの答えを 10 分覚えてもらう
    }),
  );

  // 4. ヘルスチェック（第26章 7節）
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/readyz', (_req, res) => {
    if (isReady()) res.json({ status: 'ready' });
    else res.status(503).json({ status: 'shutting_down' });
  });

  // 5. 書き換えだけを数える（第24章 練習問題5）。読むだけのもの（一覧・SSE）は数えない
  if (config.rateLimitPerMinute > 0) {
    const limiter = rateLimit({ windowMs: 60_000, limit: config.rateLimitPerMinute });
    app.use('/api', (req, res, next) => {
      if (SAFE_METHODS.has(req.method)) next();
      else void limiter(req, res, next);
    });
  }

  // 6. ボディは 16KB まで（超えると 413）
  app.use(express.json({ limit: '16kb' }));

  // 7. ルート
  app.get('/api/events', sse);
  app.use('/api/tasks', createTasksRouter({ service, cursorSecret: config.cursorSecret, idempotencyStore })); // 変更（第6部）

  // 8. どれにもあてはまらない → 404。エラーは、仕事の言葉を HTTP に読み替えてから、problem+json にする
  app.use(notFound());
  app.use(mapDomainErrors());
  app.use(problemHandler());
  return app;
}
