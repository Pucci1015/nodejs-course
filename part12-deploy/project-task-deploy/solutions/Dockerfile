# 追加（第12部）: タスク管理アプリのイメージ（第61章 練習問題8の3つの段階に、画面のビルドを足した）
# API と画面を1つのイメージにする。API が、ビルドした画面（/app/public）を STATIC_DIR として配る
#   docker build -t task-app --build-arg APP_VERSION=$(git rev-parse --short HEAD) .
# 同じイメージで、ワーカーも動かせる（docker run … task-app node src/worker.ts）

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
FROM node:24-bookworm-slim AS check
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json --noEmit

# 段階4（本番）: deps の node_modules、check で確かめた src、マイグレーション、web でビルドした画面だけを持つ
FROM node:24-bookworm-slim
# 版。--build-arg で渡さなければ空（空なら、アプリは Render が渡す RENDER_GIT_COMMIT か 'dev' を使う）
ARG APP_VERSION=
ENV NODE_ENV=production HOST=0.0.0.0 PORT=9490 APP_VERSION=${APP_VERSION} STATIC_DIR=/app/public
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
COPY --from=check /app/src ./src
COPY --from=web /web/dist ./public
USER node
EXPOSE 9490
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:9490/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server.ts"]
