# 第61章 4節: マルチステージのビルド

# 1つ目の段階（build）: 全部のパッケージを入れて、型を確かめ、本番で要らないものを消す
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run typecheck
RUN npm prune --omit=dev

# 2つ目の段階（本番）: 動かすのに要るものだけを、build からコピーする
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
USER node
ENV HOST=0.0.0.0 PORT=9817
EXPOSE 9817
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:9817/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server.ts"]
