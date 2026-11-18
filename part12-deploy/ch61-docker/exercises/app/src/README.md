# src/

コンテナにする小さな API のコードです（1つ上のフォルダの `README.md` を参照）。

| ファイル | 中身 |
| --- | --- |
| [server.ts](server.ts) | `/`・`/healthz`・`/readyz` を返す API。環境変数 `HOST`（既定 `127.0.0.1`。コンテナの中では `0.0.0.0`）・`PORT`（既定 9817）・`APP_VERSION` などを読み、`SIGTERM`・`SIGINT` で止まる |
