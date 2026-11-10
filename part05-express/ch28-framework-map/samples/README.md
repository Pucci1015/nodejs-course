# 第28章 サンプル

同じ小さなタスク API（`GET /tasks`・`GET /tasks/:id`・`POST /tasks`、エラーは problem+json）を、4つの書き方で作りました。決まりとデータは [tasks-core.mjs](tasks-core.mjs) に1つだけあり、4つとも同じものを使います（第26章の「サービスの層」）。

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [fastify-try.mjs](fastify-try.mjs) | Fastify の JSON Schema で入力と出力を決め、`app.inject` で試す（ポートは開かない） | 3 | — |
| [hono-try.mjs](hono-try.mjs) | Hono のアプリを `app.request` で試してから、`@hono/node-server` で動かす | 4 | 9357 |
| [web-serve.mjs](web-serve.mjs) | フレームワークなしの `handle(request) => Response` を、`@hono/node-server` で動かす | 5 | 9357 |

## 4つの書き方のタスク API（本文に出てくる部分だけ読めば十分）

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [tasks-core.mjs](tasks-core.mjs) | タスクの決まりとデータ（HTTP を知らない） | 2 | — |
| [express-tasks.mjs](express-tasks.mjs) | Express（比べるための元） | 2 | 9350 |
| [fastify-tasks.mjs](fastify-tasks.mjs) | Fastify。JSON Schema で入力と出力を決める | 3 | 9351 |
| [hono-tasks.mjs](hono-tasks.mjs) | Hono。Web 標準の Request・Response | 4 | 9352 |
| [web-handler-tasks.mjs](web-handler-tasks.mjs) | フレームワークなしの `handle(request) => Response`（Next.js の Route Handlers と同じ形） | 5 | 9353 |
| [contract.mjs](contract.mjs)、[contract.test.mjs](contract.test.mjs) | 4つが同じ約束を守っているかを、同じテストで確かめる | 6 | 空いている番号 |

## 動かし方

`~/dev/part05/ch28-framework-map` で動かします。

```sh
$ cd ~/dev/part05/ch28-framework-map
$ node --test samples/contract.test.mjs    # 4つ × 7 個のテスト
$ node samples/fastify-tasks.mjs           # 別のターミナルで curl -s http://127.0.0.1:9351/tasks
```

- どのファイルも `listen(port)` を export していて、テストからは空いている番号で起動します。`node samples/ファイル名` で動かしたときだけ、決まった番号で待ちます（`import.meta.main` で見分けています。Node.js 24.2 から使えます）
- 4つの違いは、ファイルを並べて見比べるのがいちばん分かりやすいです。VS Code なら、エクスプローラーで2つ選んで「選択項目の比較」を使えます
- Koa と NestJS は、この章では動かさずに、本文でコードの形だけを見ます（入れるパッケージを増やさないため）
