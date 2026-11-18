// アプリを組み立てる（第26章 4節）。使うものを受け取って、Express のアプリを返す。listen はしない
// 変更（第7部）: TypeScript にした。受け取るものの型は AppDeps
// 変更（第10部）: セキュリティのヘッダ（helmet）、セッション（PostgreSQL に置く）、CSRF への備え、/api/auth のルートを足し、
//   /api/tasks と /api/events は、ログインしている人だけが使えるようにした
// 変更（第12部）: 本番で動かすための設定（プロキシ・CSP・HSTS）、数を数える /metrics、添付ファイル、ビルドした画面の配信を足した
import crypto from 'node:crypto';
import cors from 'cors';
import express, { type Request } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { OidcClient } from './auth/oidc.ts';
import type { PgSessionStore } from './auth/pg-session-store.ts';
import type { Config } from './config.ts';
import type { SseHandler } from './lib/event-hub.ts';
import { notFound, problemHandler } from './middleware/problem.ts';
import { rateLimit } from './middleware/rate-limit.ts';
import { requestLogger } from './middleware/request-logger.ts';
import { requireUser } from './middleware/require-user.ts';
import { requireSameOrigin } from './middleware/same-origin.ts';
import type { UserRepo } from './repositories/pg-users.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createTasksRouter, mapDomainErrors } from './routes/tasks.ts';
import type { Metrics } from './lib/metrics.ts';
import type { AttachmentRepo } from './repositories/pg-attachments.ts';
import { createAttachmentsRouter } from './routes/attachments.ts';
import { type Check, createOpsRouter } from './routes/ops.ts';
import { createStaticSite } from './routes/static-site.ts';
import type { BlobStore } from './storage/blob-store.ts';
import type { AuthService } from './services/auth.ts';
import type { TaskService } from './services/tasks.ts';
import type { IdempotencyStore } from './types.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type AppDeps = {
  /** 変更（第10部）: リクエストから、その人のタスクだけを扱うサービスを作る関数 */
  serviceFor: (req: Request) => TaskService;
  /** SSE のハンドラ（lib/event-hub.ts の sseRoute） */
  sse: SseHandler;
  logger: Logger;
  config: Config;
  /** 止める途中なら false（/readyz が 503 になる） */
  isReady?: () => boolean;
  /** 追加（第6部）: 冪等キーを覚える場所（repositories/pg-idempotency.ts） */
  idempotencyStore: IdempotencyStore;
  // 追加（第10部）: ここから下
  auth: AuthService;
  users: UserRepo;
  sessionStore: PgSessionStore;
  /** 練習用の IdP（設定が無ければ undefined） */
  oidc?: OidcClient | undefined;
  // 追加（第12部）: ここから下
  metrics: Metrics;
  /** /readyz で確かめるもの（名前 → 関数） */
  checks?: Record<string, Check>;
  /** リクエストから、その人の添付ファイルのリポジトリを作る関数 */
  attachmentsFor: (req: Request) => AttachmentRepo;
  blobs: BlobStore;
};

/** 追加（第10部）: セッションの Cookie の名前。本番（HTTPS）では __Host- を付ける（第22章 2.2節・第52章 3節） */
export const sessionCookieName = (config: Config) => (config.env === 'production' ? '__Host-sid' : 'sid');

export function createApp({
  serviceFor,
  sse,
  logger,
  config,
  isReady = () => true,
  idempotencyStore,
  auth,
  users,
  sessionStore,
  oidc,
  metrics,
  checks = {},
  attachmentsFor,
  blobs,
}: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false); // 自動の弱い ETag は止めて、version から強い ETag を自分で付ける（第25章 7.3節）
  // 追加（第12部）: 前に立つプロキシの数だけ、X-Forwarded-For・X-Forwarded-Proto を信じる（第60章 7節）。
  // req.ip（回数の上限で使う）と req.secure（Secure の Cookie を送るか）が、客から見た値になる
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  // 0. 追加（第12部）: 数を数える。ログより前に置き、どの応答も数える（第66章 3節）
  app.use(metrics.middleware);

  // 1. 最初にログ（後ろで何が起きても、1行書かれるように）
  app.use(requestLogger({ logger }));

  // 2. どの応答にも付けるヘッダ。変更（第10部）: helmet の既定（nosniff・CSP・frame-ancestors など。第55章 3節）
  // 変更（第12部）: 画像は、ストレージ（署名付き URL）からも読む。http の開発では upgrade-insecure-requests を付けない
  //   HSTS は helmet の既定（1 年・includeSubDomains）。ブラウザは HTTPS の応答のときだけ覚える（第8章 7節）
  const imageOrigin = config.s3.publicEndpoint !== undefined ? new URL(config.s3.publicEndpoint).origin : undefined;
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', ...(imageOrigin !== undefined ? [imageOrigin] : ['https:'])],
          'upgrade-insecure-requests': config.env === 'production' ? [] : null,
        },
      },
    }),
  );

  // 3. CORS（第2部 第9章、第24章）。Cookie は送らせない（credentials は false のまま）。画面は Vite の中継で同じオリジンから呼ぶ
  app.use(
    cors({
      origin: [...config.corsOrigins], // 決めたオリジンだけ。空なら、どこにも許さない
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'If-Match', 'If-None-Match', 'Idempotency-Key', 'Last-Event-ID'],
      // 画面の JavaScript から読めるようにするヘッダ（これに無いものは、ブラウザが見せない）
      exposedHeaders: [
        'ETag',
        'Location',
        'Idempotent-Replayed',
        'Retry-After',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'X-Request-Id',
      ],
      maxAge: 600, // プリフライトの答えを 10 分覚えてもらう
    }),
  );

  // 4. ヘルスチェック（第26章 7節）。変更（第12部）: /readyz はつなぐ先も確かめる。/version と /metrics を足した
  app.use(
    createOpsRouter({
      isReady,
      checks,
      version: config.appVersion,
      renderMetrics: metrics.render,
      metricsToken: config.metricsToken,
      logger,
    }),
  );

  // 5. 書き換えだけを数える（第24章 練習問題5）。読むだけのもの（一覧・SSE）は数えない
  // 変更（第10部）: /api/auth は、9節の別の上限で数える
  if (config.rateLimitPerMinute > 0) {
    const limiter = rateLimit({ windowMs: 60_000, limit: config.rateLimitPerMinute });
    app.use('/api', (req, res, next) => {
      if (SAFE_METHODS.has(req.method) || req.path.startsWith('/auth/')) next();
      else void limiter(req, res, next);
    });
  }

  // 6. 追加（第10部）: 書き換えは、決めたオリジン（画面）からのものだけ（CSRF への備え。SameSite=Lax の Cookie に重ねる）
  app.use('/api', requireSameOrigin([config.appUrl, ...config.corsOrigins]));

  // 7. ボディは 16KB まで（超えると 413）
  app.use(express.json({ limit: '16kb' }));

  // 8. 追加（第10部）: セッション（第52章 2節）。中身は PostgreSQL の表 sessions に、ブラウザには ID だけを Cookie で渡す
  const secure = config.env === 'production';
  const cookieName = sessionCookieName(config);
  app.use(
    '/api',
    session({
      name: cookieName,
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false, // 変わっていなければ書き戻さない
      saveUninitialized: false, // ログインするまで、セッションを作らない（見るだけの客の行を作らない）
      rolling: true, // 使うたびに期限を延ばす
      cookie: {
        httpOnly: true, // ページの JavaScript から読めない
        sameSite: 'lax', // ほかのサイトからの POST には付かない
        secure, // 本番は HTTPS だけ。変更（第12部）: プロキシの後ろでは TRUST_PROXY も要る（req.secure が false だと、express-session は Cookie を送らない）
        path: '/',
        maxAge: config.sessionMaxAgeMs,
      },
    }),
  );

  // 9. ルート
  // 追加（第10部）: ログイン・登録など。回数の上限は、IP ごとに別に数える（パスワードの総当たりへの備え。第51章 6節）
  const authLimiter =
    config.loginRateLimitPerMinute > 0
      ? rateLimit({ windowMs: 60_000, limit: config.loginRateLimitPerMinute })
      : undefined;
  app.use(
    '/api/auth',
    createAuthRouter({
      auth,
      users,
      store: sessionStore,
      oidc,
      oidcIssuer: config.oidc?.issuer,
      limiter: authLimiter,
      sessionCookie: { name: cookieName, secure },
    }),
  );
  // 変更（第10部）: ここから下は、ログインしている人だけ（req.user が入る）
  const loggedIn = requireUser(users);
  app.get('/api/events', loggedIn, sse);
  // 追加（第12部）: 添付ファイル。タスクのルーターより前に置く
  app.use(
    '/api/tasks',
    loggedIn,
    createAttachmentsRouter({
      serviceFor,
      attachmentsFor,
      blobs,
      maxBytes: config.attachmentMaxBytes,
      perTask: config.attachmentsPerTask,
      newId: () => crypto.randomUUID(),
      now: () => new Date(),
      logger,
    }),
  );
  app.use(
    '/api/tasks',
    loggedIn,
    createTasksRouter({ serviceFor, cursorSecret: config.cursorSecret, idempotencyStore }),
  );

  // 追加（第12部）: ビルドした画面を配る（STATIC_DIR があるとき）。/api で始まるものは、下の 404 へ
  if (config.staticDir !== undefined) app.use(createStaticSite(config.staticDir));

  // 10. どれにもあてはまらない → 404。エラーは、仕事の言葉を HTTP に読み替えてから、problem+json にする
  app.use(notFound());
  app.use(mapDomainErrors());
  app.use(problemHandler());
  return app;
}
