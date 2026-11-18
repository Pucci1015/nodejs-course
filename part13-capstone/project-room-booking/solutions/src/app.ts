// アプリを組み立てる（第26章 4節）。使うものを受け取って、Express のアプリを返す。listen はしない
// 土台のログイン（第10部）と本番の設定（第12部）に、会議室と予約のルート（第68章）と SSE（第69章）を足した
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { OidcClient } from './auth/oidc.ts';
import type { PgSessionStore } from './auth/pg-session-store.ts';
import type { Config } from './config.ts';
import type { SseHandler } from './lib/event-hub.ts';
import type { Metrics } from './lib/metrics.ts';
import { mapDomainErrors } from './middleware/domain-errors.ts';
import { notFound, problemHandler } from './middleware/problem.ts';
import { rateLimit } from './middleware/rate-limit.ts';
import { requestLogger } from './middleware/request-logger.ts';
import { requireUser } from './middleware/require-user.ts';
import { requireSameOrigin } from './middleware/same-origin.ts';
import type { UserRepo } from './repositories/pg-users.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createBookingsRouter } from './routes/bookings.ts';
import { type Check, createOpsRouter } from './routes/ops.ts';
import { createRoomsRouter } from './routes/rooms.ts';
import { createStaticSite } from './routes/static-site.ts';
import type { AuthService } from './services/auth.ts';
import type { BookingService } from './services/bookings.ts';
import type { RoomService } from './services/rooms.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type AppDeps = {
  logger: Logger;
  config: Config;
  /** 止める途中なら false（/readyz が 503 になる） */
  isReady?: () => boolean;
  auth: AuthService;
  users: UserRepo;
  sessionStore: PgSessionStore;
  /** 練習用の IdP（設定が無ければ undefined） */
  oidc?: OidcClient | undefined;
  metrics: Metrics;
  /** /readyz で確かめるもの（名前 → 関数） */
  checks?: Record<string, Check>;
  rooms: RoomService;
  bookings: BookingService;
  /** SSE のハンドラ（lib/event-hub.ts の sseRoute。第69章） */
  sse: SseHandler;
};

/** セッションの Cookie の名前。本番（HTTPS）では __Host- を付ける（第22章 2.2節・第52章 3節） */
export const sessionCookieName = (config: Config) => (config.env === 'production' ? '__Host-sid' : 'sid');

export function createApp({
  logger,
  config,
  isReady = () => true,
  auth,
  users,
  sessionStore,
  oidc,
  metrics,
  checks = {},
  rooms,
  bookings,
  sse,
}: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  // 前に立つプロキシの数だけ、X-Forwarded-For・X-Forwarded-Proto を信じる（第60章 7節）
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  // 0. 数を数える。ログより前に置き、どの応答も数える（第66章 3節）
  app.use(metrics.middleware);

  // 1. 最初にログ（後ろで何が起きても、1行書かれるように）
  app.use(requestLogger({ logger }));

  // 2. どの応答にも付けるヘッダ。helmet の既定（nosniff・CSP・frame-ancestors など。第55章 3節）
  //   http の開発では upgrade-insecure-requests を付けない
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'upgrade-insecure-requests': config.env === 'production' ? [] : null },
      },
    }),
  );

  // 3. ヘルスチェック（第60章 8節）。/readyz はつなぐ先も確かめる。/version と /metrics
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

  // 4. 書き換えだけを数える（第24章 練習問題5）。/api/auth は、7節の別の上限で数える
  if (config.rateLimitPerMinute > 0) {
    const limiter = rateLimit({ windowMs: 60_000, limit: config.rateLimitPerMinute });
    app.use('/api', (req, res, next) => {
      if (SAFE_METHODS.has(req.method) || req.path.startsWith('/auth/')) next();
      else void limiter(req, res, next);
    });
  }

  // 5. 書き換えは、画面のオリジンからのものだけ（CSRF への備え。SameSite=Lax の Cookie に重ねる）
  //   画面は、開発では Vite の中継、本番では同じサーバ（STATIC_DIR）から呼ぶので、CORS は使わない
  app.use('/api', requireSameOrigin([config.appUrl]));

  // 6. ボディは 16KB まで（超えると 413）
  app.use(express.json({ limit: '16kb' }));

  // 7. セッション（第52章 2節）。中身は PostgreSQL の表 sessions に、ブラウザには ID だけを Cookie で渡す
  const secure = config.env === 'production';
  const cookieName = sessionCookieName(config);
  app.use(
    '/api',
    session({
      name: cookieName,
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false, // ログインするまで、セッションを作らない
      rolling: true, // 使うたびに期限を延ばす
      cookie: { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: config.sessionMaxAgeMs },
    }),
  );

  // 8. ログイン・登録など。回数の上限は、IP ごとに別に数える（第51章 6節）
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

  // 9. ここから下は、ログインしている人だけ（req.user が入る）
  const loggedIn = requireUser(users);
  app.use('/api/rooms', loggedIn, createRoomsRouter({ rooms }));
  app.use('/api/bookings', loggedIn, createBookingsRouter({ bookings }));
  app.get('/api/events', loggedIn, sse);

  // ビルドした画面を配る（STATIC_DIR があるとき）。/api で始まるものは、下の 404 へ
  if (config.staticDir !== undefined) app.use(createStaticSite(config.staticDir));

  // 10. どれにもあてはまらない → 404。エラーは、仕事の言葉を HTTP に読み替えてから、problem+json にする
  app.use(notFound());
  app.use(mapDomainErrors());
  app.use(problemHandler());
  return app;
}
