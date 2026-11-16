# docker

`compose.yaml`（第6部のフォルダの直下）から使うファイルです。第32章で説明します。

| ファイル | 内容 |
| --- | --- |
| [postgres-init/01-databases.sql](postgres-init/01-databases.sql) | PostgreSQL のコンテナを最初に作ったときに1回だけ動く SQL。第33章用の `ch33` と、成果物用の `taskapi` のデータベースを作る |

- このフォルダの SQL は、データ（ボリューム）が空のときにしか動きません。後から書き換えても、`docker compose down -v` でデータを消すまでは動きません。
