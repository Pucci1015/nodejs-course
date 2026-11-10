# 第13章 サンプル

本文の「手を動かす」で書くプログラムの完成形と、動かして結果を見るだけのプログラム（「中身は読まなくてよい」）があります。どれも `~/dev/part03/ch13-event-loop` で `node samples/ファイル名` のように実行します。

**本文で書くプログラムの完成形**

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [blocking-loop.mjs](blocking-loop.mjs) | 500ms の計算が、10ms のタイマーを遅らせる | 1.1 | — |
| [order-basic.mjs](order-basic.mjs) | 同期のコード・マイクロタスク・タスクの順番 | 2.1 | — |
| [block-server.mjs](block-server.mjs) | 計算する `/slow` と待つだけの `/wait`。curl で `/fast` が待たされるかを比べる | 5.1 | 9133 |
| [yield-loop.mjs](yield-loop.mjs) | 計算を小分けにして、合間に `setImmediate` で順番を譲る | 6.2 | — |
| [unref-demo.mjs](unref-demo.mjs) | `unref` したタイマーは、プロセスを引き止めない | 8 | — |

**動かして結果を見るだけのプログラム（中身は読まなくてよい）**

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [stack-demo.mjs](stack-demo.mjs) | 重い同期の処理がタイマーを遅らせる様子、コールスタックの深さ | 1 | — |
| [queues-demo.mjs](queues-demo.mjs) | 同期のコード・マイクロタスク・`nextTick`・タイマー・`setImmediate` の順番 | 2, 3 | — |
| [queues-demo.cjs](queues-demo.cjs) | 上と同じ内容の CommonJS 版（`nextTick` の順番だけが変わる） | 3.3 | — |
| [phases-demo.mjs](phases-demo.mjs) | `setTimeout(0)` と `setImmediate` の順番が、呼んだ場所で変わる様子 | 3.2 | — |
| [threadpool-demo.mjs](threadpool-demo.mjs) | `crypto.pbkdf2` がスレッドプールで動く様子。`UV_THREADPOOL_SIZE` を変えて比べる | 4 | — |
| [blocking-demo.mjs](blocking-demo.mjs) | 重い計算をするリクエストが、別のリクエストを待たせる様子（サーバを子プロセスで起動する） | 5 | 9130 |
| [worker-demo.mjs](worker-demo.mjs)、[primes-worker.mjs](primes-worker.mjs)、[primes.mjs](primes.mjs) | 重い計算を `worker_threads` に移す。複数の Worker で分けて計算する | 6.1 | — |
| [loop-delay-demo.mjs](loop-delay-demo.mjs) | `monitorEventLoopDelay` でイベントループの遅れを測る。平均と最大の違い | 7 | — |
| [exit-demo.mjs](exit-demo.mjs) | プロセスが終わる条件。`unref`、解決されない Promise、`server.close()` | 8 | 9132 |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node samples/queues-demo.mjs
$ node samples/threadpool-demo.mjs
$ UV_THREADPOOL_SIZE=2 node samples/threadpool-demo.mjs
$ node samples/blocking-demo.mjs
$ node samples/exit-demo.mjs 2
```

- 時間を表示するサンプルは、Mac の速さや、そのとき他に動いているアプリによって、数字が変わります。本文に載せた結果と比べるときは、数字そのものではなく「どれが先に終わるか」「どれが待たされるか」を見てください
- `threadpool-demo.mjs` と `worker-demo.mjs` は、数秒の間 CPU をたくさん使います。ファンが回ることがありますが、問題ありません
- `phases-demo.mjs` は、何度か実行してください。`(1)` の2行の順番が、実行するたびに変わることがあります
- `node samples/blocking-demo.mjs server` と引数を付けると、サーバだけが起動します。ブラウザで `http://127.0.0.1:9130/slow` を開き、すぐに別のタブで `/fast` を開いて、待たされることを確かめられます（Ctrl+C で止めます）
