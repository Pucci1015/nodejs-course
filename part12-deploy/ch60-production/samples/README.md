# 第60章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part12/ch60-production`）で `node samples/○○.ts` と打ちます。サーバのサンプルは、どれもポート 9807 を使うので、1つずつ動かします（`Ctrl+C` で止める）。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [env-demo.ts](env-demo.ts) | 1.2 | 9807 | `NODE_ENV` で、Express がエラーの中身を見せるかが変わる |
| [config.ts](config.ts) | 2.2 | | 設定を環境変数から読む。本番で `SESSION_SECRET` が無ければ終了コード 1 |
| [crash.ts](crash.ts) | 4.1 | 9807 | `/crash` で落ちるサーバ |
| [supervise.ts](supervise.ts) | 4.2 | | 落ちたら、待つ時間を延ばしながら起動し直す見張り役 |
| [rotate.ts](rotate.ts) | 6.2 | | 鍵を配列で持ち、取り替える |
| [whoami.ts](whoami.ts) | 7.1 | 9807 | アプリから見た客（`req.ip` など）。`TRUST_PROXY` で `trust proxy` を変える |
| [proxy.ts](proxy.ts) | 7.1 | 9808 | `X-Forwarded-…` を付けて 9807 へ渡す、いちばん小さなリバースプロキシ |
| [health.ts](health.ts) | 8.1 | 9807 | `/healthz` と `/readyz`（PostgreSQL に `SELECT 1`） |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part12/ch60-production
$ NODE_ENV=production node samples/env-demo.ts   # 別のターミナルで curl -i http://127.0.0.1:9807/boom
$ node samples/supervise.ts samples/crash.ts      # 別のターミナルで curl http://127.0.0.1:9807/crash
$ node samples/rotate.ts
```
