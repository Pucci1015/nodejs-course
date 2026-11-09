# 第26章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [fat-route.mjs](fat-route.mjs) | 1つのハンドラに、確かめ・決まり・データ・ログを全部書いた例（練習問題1で使う） | 2 | 9330 |
| [layered/](layered/) | 同じものを、ルート・サービス・データの3つの層に分け、使うものを外から渡す形にしたもの | 3, 4 | 9331 |
| [config-demo.mjs](config-demo.mjs)、[.env.example](.env.example) | 設定を環境変数から読み、zod で1回だけ確かめる。`node --env-file` | 5 | — |
| [logging-demo.mjs](logging-demo.mjs) | pino で1行1つの JSON のログ。リクエストの id、子のロガー、秘密の値を隠す | 6 | 9332 |
| [shutdown-demo.mjs](shutdown-demo.mjs) | `/healthz`・`/readyz` と、SIGTERM できれいに止める | 7, 8 | 9333 |

## 動かし方

`~/dev/part05`（第5部の README の「準備」で作ったもの）の中で動かします。

```sh
$ cd ~/dev/part05/ch26-app-structure/samples
$ node config-demo.mjs
$ node --env-file=.env.example config-demo.mjs
$ node logging-demo.mjs               # 別のターミナルで curl -s http://127.0.0.1:9332/api/tasks
$ cd layered && node --test task-service.test.mjs
```

- `.env.example` は、`ls` では見えません（`.` で始まる名前のため）。`ls -a` で見えます
- `--env-file` は Node.js 20.6 から使えます。ファイルが無いとエラーで止まります（Node.js 22.9 からは、無くてもよい `--env-file-if-exists` もあります）
- `logging-demo.mjs` のログは、1行が長い JSON です。読みやすくしたいときは、`node logging-demo.mjs | npx pino-pretty` で整えて見られます（`pino-pretty` をその場で取ってくるので、ネットにつながっている必要があります）
- `shutdown-demo.mjs` は、起動したときに出る pid を使って `kill -TERM pid` で止めます。Ctrl+C（SIGINT）でも、同じように止まります
