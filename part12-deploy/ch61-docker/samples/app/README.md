# 第61章でコンテナにする小さな API

本文の2〜9節で、イメージにして動かすアプリです。中身は第60章の `health.ts` を少し広げたものです。

| ファイル | 中身 |
| --- | --- |
| [src/server.ts](src/server.ts) | `/`・`/healthz`・`/readyz`。環境変数 `HOST`・`PORT`・`DATABASE_URL`・`REDIS_URL`・`APP_VERSION` を読む。`SIGTERM`・`SIGINT` で止まる |
| [Dockerfile](Dockerfile) | 本文 4〜6節の完成形（マルチステージ・`USER node`・`HEALTHCHECK`） |
| [.dockerignore](.dockerignore) | 本文 3.2節 |
| [package.json](package.json)・[package-lock.json](package-lock.json) | express・pg・redis と、型の確かめの道具（`npm run typecheck`） |
| [tsconfig.json](tsconfig.json) | 部の `tsconfig.base.json` と同じ中身（コピーして別の場所で動かしても困らないように、`extends` を使わない） |

Mac でそのまま動かすときは、`npm ci` してから `node src/server.ts` です（`http://127.0.0.1:9817/`）。
