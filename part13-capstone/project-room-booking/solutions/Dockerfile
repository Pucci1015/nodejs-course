# 第70章: 会議室の予約のイメージ（第12部の成果物の Dockerfile と同じ4つの段階）
# API と画面を1つのイメージにする。API が、ビルドした画面（/app/public）を STATIC_DIR として配る
#   docker build -t room-booking --build-arg APP_VERSION=$(git rev-parse --short HEAD) .
# 同じイメージで、ワーカー（node src/worker.ts）と、管理者を決めるスクリプト（node scripts/grant-admin.ts）も動かせる

# 段階1（web）: 画面をビルドする（型を確かめてから vite build）
FROM node:24-bookworm-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY web/ ./
RUN npm run build

# 段階2（deps）: 本番で要るパッケージだけを入れる
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# 段階3（check）: 全部のパッケージを入れて、型を確かめる。失敗したら build も失敗する
# tsconfig.json の include のうち、イメージに入れる src と scripts だけを確かめる（test・e2e は CI で）
FROM node:24-bookworm-slim AS check
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx tsc -p tsconfig.json --noEmit

# 段階4（本番）: deps の node_modules、check で確かめた src と scripts、マイグレーション、web でビルドした画面だけを持つ
FROM node:24-bookworm-slim
# 版。--build-arg で渡さなければ空（空なら、アプリは Render が渡す RENDER_GIT_COMMIT か 'dev' を使う）
ARG APP_VERSION=
ENV NODE_ENV=production HOST=0.0.0.0 PORT=9900 APP_VERSION=${APP_VERSION} STATIC_DIR=/app/public
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
COPY --from=check /app/src ./src
COPY --from=check /app/scripts ./scripts
COPY --from=web /web/dist ./public
USER node
EXPOSE 9900
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:9900/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server.ts"]
