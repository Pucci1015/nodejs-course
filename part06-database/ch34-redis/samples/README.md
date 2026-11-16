# 第34章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [redis.mjs](redis.mjs) | 部品: `createRedis()`・`REDIS_URL`。つなぎ直しは5回まで | 2.1 |
| [first-redis.mjs](first-redis.mjs) | `set`・`get`・`setEx`・`ttl`・`incr`・JSON・`hSet`・`hGetAll`・`del` | 2.2 |
| [cache-try.mjs](cache-try.mjs) | cache-aside。キャッシュを消さないと古いものが見えること | 3.1 |
| [counter-race.mjs](counter-race.mjs) | `GET` して `SET` すると数がずれ、`INCR` ならずれないこと | 4.1 |
| [rate-limit-try.mjs](rate-limit-try.mjs) | `multi()` で `INCR` と `EXPIRE … NX` をまとめた回数の制限 | 4.2 |
| [session-store.mjs](session-store.mjs) | 部品: `createSessionStore(redis, { ttlSec })`。セッションを Redis に置く | 5.1 |
| [server.mjs](server.mjs) | セッションと回数の制限を Redis に置く Express のサーバ（ポート 9457。`PORT=9458` で2台目） | 5.2 |
| [pubsub.mjs](pubsub.mjs) | Pub/Sub。`listen` で待ち、`send 題名` で配る | 6.1 |

## 動かし方

先に、Redis を動かしておきます（`~/dev/part06` か、その中のフォルダで）。

```sh
$ cd ~/dev/part06/ch34-redis
$ docker compose up -d --wait
$ node samples/first-redis.mjs
```

- つなぎ先は、環境変数 `REDIS_URL` で変えられます（決まりは `redis://127.0.0.1:6380`）。
- 本文で作ったキーを全部消して、最初からやり直すときは `docker compose exec redis redis-cli FLUSHDB` を動かします（今のデータベースのキーを全部消すコマンドです。元に戻せません）。
