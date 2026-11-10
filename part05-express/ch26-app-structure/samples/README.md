# 第26章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [service-split.mjs](service-split.mjs) | データの層とサービスの層を分け、使うもの（`repo`・`now`）を外から渡す | 3, 4 | — |
| [config-check.mjs](config-check.mjs) | 起動するときに、環境変数を zod で1回だけ確かめる | 5 | — |
| [pino-log.mjs](pino-log.mjs) | pino で1行1つの JSON のログ。リクエストごとの id と子のロガー | 6 | 9337 |
| [graceful.mjs](graceful.mjs) | SIGINT・SIGTERM で、処理中のリクエストを返し終えてから止まる | 8 | 9337 |

## 確かめるためのプログラム（中身は読まなくてよい。ただし `fat-route.mjs` は練習問題4で読みます）

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [fat-route.mjs](fat-route.mjs) | 1つのハンドラに、確かめ・決まり・データ・ログを全部書いた例（練習問題4で使う） | 2 | 9330 |
| [layered/](layered/) | 同じものを、ルート・サービス・データの3つの層に分け、使うものを外から渡す形にしたもの | 3, 4 | 9331 |
| [config-demo.mjs](config-demo.mjs)、[.env.example](.env.example) | 設定を環境変数から読み、zod で1回だけ確かめる。`node --env-file` | 5 | — |
| [logging-demo.mjs](logging-demo.mjs) | pino で1行1つの JSON のログ。リクエストの id、子のロガー、秘密の値を隠す | 6 | 9332 |
| [shutdown-demo.mjs](shutdown-demo.mjs) | `/healthz`・`/readyz` と、SIGTERM できれいに止める | 7, 8 | 9333 |

## 動かし方

`~/dev/part05/ch26-app-structure` で動かします。

```sh
$ cd ~/dev/part05/ch26-app-structure
$ node samples/service-split.mjs
$ node samples/config-demo.mjs
$ node --env-file=samples/.env.example samples/config-demo.mjs
$ node samples/logging-demo.mjs        # 別のターミナルで curl -s http://127.0.0.1:9332/api/tasks
$ node --test samples/layered/task-service.test.mjs
```

- `.env.example` は、`ls` では見えません（`.` で始まる名前のため）。`ls -a samples` で見えます。`-a` は「隠れたものも全部」のオプションです
- `--env-file=ファイル` は、ファイルに書いた `名前=値` を環境変数として読みます（Node.js 20.6 から）。ファイルが無いとエラーで止まります
- `logging-demo.mjs` のログは、1行が長い JSON です。読みやすくしたいときは、`node samples/logging-demo.mjs | npx pino-pretty` で整えて見られます。`|` は、左のコマンドの出力を右のコマンドに渡す記号です。`npx` は、パッケージをその場で取ってきて動かすコマンドなので、ネットにつながっている必要があります
- `shutdown-demo.mjs` は、起動したときに出る pid（プロセスの番号）を使って、別のターミナルで `kill -TERM pid` と打って止めます。`kill -TERM` は、そのプロセスに SIGTERM を送るコマンドです。Ctrl+C（SIGINT）でも、同じように止まります
