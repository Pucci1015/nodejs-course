# 第64章 サンプル

本文の「手を動かす」で書く・動かすプログラムです。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part12/ch64-background-jobs`）で `node samples/○○.ts` と打ちます。先に、第6部の compose の PostgreSQL（127.0.0.1:5433）と Redis（127.0.0.1:6380）を動かしておきます（`(cd ~/dev/part06 && docker compose up -d --wait)`）。どのサンプルもポートで待ちません。

| ファイル | 本文の節 | 使うもの | 中身 |
| --- | --- | --- | --- |
| [pg-queue.ts](pg-queue.ts) | 3.1 | PostgreSQL | 仕事の表（スキーマ `ch64`）と、`enqueue`・`claimNext`・`complete`。ほかのサンプルが import する |
| [pg-enqueue.ts](pg-enqueue.ts) | 3.2 | PostgreSQL | 仕事を N 個入れる。`--reset` で表を空にする |
| [pg-worker.ts](pg-worker.ts) | 3.2 | PostgreSQL | 取る → 0.3 秒かけて処理 → 終わったと書く、を繰り返す。3 秒仕事が無ければ終わる。`Ctrl+C` で今の仕事を終えてから止まる |
| [pg-race.ts](pg-race.ts) | 3.3 | PostgreSQL | 2つの接続から同時に取る。`LOCK=none`・`LOCK='FOR UPDATE'` で、ロックの違いを見る |
| [bull-connection.ts](bull-connection.ts) | 5.1 | Redis | node-redis の接続を作る（`REDIS_URL`）。ほかのサンプルが import する |
| [bull-add.ts](bull-add.ts) | 5.2 | Redis | 列「mail」に仕事を N 個入れる（`attempts: 4`、指数バックオフ 0.5 秒） |
| [bull-worker.ts](bull-worker.ts) | 5.3・7.1 | Redis | 列「mail」のワーカー（`concurrency: 2`）。`FAIL=2` で最初の2回をわざと失敗、`WORK_MS=3000` で1つに3秒。`SIGINT`・`SIGTERM` で `worker.close()` |
| [job-data.ts](job-data.ts) | 5.4 | | 取り出したデータを `z.discriminatedUnion` で確かめる |
| [bull-schedule.ts](bull-schedule.ts) | 6 | Redis | 2 秒ごとの `heartbeat` と、毎朝 8 時（`Asia/Tokyo`）の `daily-digest` を登録する。`--list` で一覧と次の時刻、`--remove` で消す |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

## 後片付け

- PostgreSQL の表は、データベース taskapi のスキーマ `ch64` にあります。要らなくなったら、`docker compose exec postgres psql -U app taskapi -c 'DROP SCHEMA ch64 CASCADE'`（`~/dev/part06` で）で消せます。成果物の表には触りません。
- BullMQ の列は、Redis の `bull:mail:…` のキーです。定期実行は `node samples/bull-schedule.ts --remove` で消してください。消し忘れると、ワーカーを動かすたびに `heartbeat` の仕事が来ます。第6部の compose の Redis はボリュームを持たないので、`docker compose down` すると、列も消えます。
