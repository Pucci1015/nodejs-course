# 第61章 練習問題1・8の模範解答（Dockerfile と .dockerignore を足したアプリ）

[../../exercises/app/](../../exercises/app/) に、練習問題1の `.dockerignore` と練習問題8の `Dockerfile` を足したものです。練習問題7の [../compose.yaml](../compose.yaml) は、このフォルダを `build: ./app` で使います。

| ファイル | 中身 |
| --- | --- |
| [src/server.ts](src/server.ts) | `/`・`/healthz`・`/readyz`。環境変数 `HOST`・`PORT`・`DATABASE_URL`・`REDIS_URL`・`APP_VERSION` を読む。`SIGTERM`・`SIGINT` で止まる |
| [Dockerfile](Dockerfile) | 練習問題8の模範解答（3つの段階） |
| [.dockerignore](.dockerignore) | 練習問題1の模範解答 |
| [package.json](package.json)・[package-lock.json](package-lock.json) | express・pg・redis と、型の確かめの道具（`npm run typecheck`） |
| [tsconfig.json](tsconfig.json) | 部の `tsconfig.base.json` と同じ中身（コピーして別の場所で動かしても困らないように、`extends` を使わない） |

Mac でそのまま動かすときは、`npm ci` してから `node src/server.ts` です（`http://127.0.0.1:9817/`）。
