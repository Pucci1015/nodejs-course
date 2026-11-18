# 第61章 練習問題8の模範解答: 3つの段階に分ける

# 段階1（deps）: 本番で要るパッケージだけを入れる
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 段階2（check）: 全部のパッケージを入れて、型を確かめる。失敗したら build も失敗する
FROM node:24-bookworm-slim AS check
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run typecheck

# 段階3（本番）: deps の node_modules と、check で確かめた src だけを持つ
FROM node:24-bookworm-slim
ARG APP_VERSION=dev
ENV NODE_ENV=production HOST=0.0.0.0 PORT=9817 APP_VERSION=${APP_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
# check の段階から src をコピーする。こうしないと、BuildKit は「使われない段階」として check を build しない
COPY --from=check /app/src ./src
USER node
EXPOSE 9817
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:9817/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server.ts"]
