# 第61章 練習問題2の模範解答
# 修正: 版を決める（node だけだと latest。いつ build したかで中身が変わる）。slim は小さい
FROM node:24-bookworm-slim
# 修正: 本番の動きにする（第60章 1節）。コンテナの中では、外から届くように 0.0.0.0 で待つ
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
# 修正: 変わりにくいものを先にコピーする（ソースを変えても、npm ci の層を使い回せる）
COPY package.json package-lock.json ./
# 修正: ロックファイルのとおりに入れる npm ci。本番で要らないものは入れない
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 9817
# 修正: root で動かさない（node イメージに用意されているユーザー）
USER node
# 修正: exec の形で、node を PID 1 にする（SIGTERM が届く）
CMD ["node", "src/server.ts"]
