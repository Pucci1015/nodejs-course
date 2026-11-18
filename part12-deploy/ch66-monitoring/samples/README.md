# 第66章 サンプル

本文の「手を動かす」で書く・動かすプログラムです。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part12/ch66-monitoring`）で `node samples/○○.ts` と打ちます。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [app.ts](app.ts) | 2〜7 | 9867（`PORT` で変える） | 見張れるようにしたアプリ。1 行 1 つの JSON のログ、500 の `errorId`、`/metrics`、イベントループの遅れ。`/fast`・`/io`・`/cpu`・`/boom`・`/visits`・`/healthz`。`NAME=b` で台の名前、`PRIMES=sieve` で `/cpu` を速い数え方に |
| [metrics.ts](metrics.ts) | 3 | | `Counter`・`Histogram`・`Gauge` と、Prometheus の文字の形。`app.ts` が import する |
| [my-counter.ts](my-counter.ts) | 3.2 | | ラベルの組ごとに数えるカウンタを、自分で書いたもの |
| [log-query.ts](log-query.ts) | 2.3 | | 標準入力のログから、`--slow ミリ秒` か `--id errorId・reqId` に合う行だけを出す |
| [load.ts](load.ts) | 4 | | 小さな負荷の道具。`node samples/load.ts URL 同時の本数 秒` で、毎秒の回数と p50・p95・p99・最大を出す |
| [cpu-top.ts](cpu-top.ts) | 5.1 | | `node --cpu-prof` が書いた `.cpuprofile` から、時間を使った関数の上位を出す（中身は読まなくてよい） |
| [balancer.ts](balancer.ts) | 7 | 9860 | 小さなロードバランサ。9867 と 9868 に順番に配り、1 秒ごとに `/healthz` を聞いて、答えない台には配らない |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

- `--cpu-prof-dir=prof` で作った `prof/` フォルダは、見終わったら消してかまいません（`rm -r prof`。`-r` はフォルダの中ごと消す。消すものを確かめてから打ちます）。
- `/visits?shared=1` は、第6部の compose の Redis（127.0.0.1:6380）のキー `ch66:visits` を使います。
