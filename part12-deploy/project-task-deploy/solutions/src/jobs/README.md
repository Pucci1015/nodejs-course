# src/jobs — 後ろで動かす仕事（第12部）

仕事は Redis の列（BullMQ、第64章 5節）に入り、ワーカーが取り出して処理します。ワーカーは、API のプロセスの中（`WORKER_MODE=inline`。開発・テスト）か、別のプロセス（`src/worker.ts`。本番）で動きます。

| ファイル               | 元                      | 中身                                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [jobs.ts](jobs.ts)     | 第64章 5.2節・練習問題2 | 列の名前 `jobs`、仕事の種類ごとのデータの形（`send-mail`・`daily-digest`・`sweep-blobs`。Zod の `strictObject`）、入れる側の `createJobQueue(connection, prefix)`（6 回まで、1 秒から倍々に待つ。終わったものは 1 日、失敗したものは 7 日残す）       |
| [worker.ts](worker.ts) | 第64章 5.3・6節         | `startJobWorker(deps)`。仕事の名前とデータを確かめてから、種類ごとの処理を呼ぶ（形が違えば `UnrecoverableError`）。ログに宛先や中身を書かない。決まった時刻の仕事（毎朝のお知らせ `DIGEST_CRON`・1 時間ごとの掃除）を `upsertJobScheduler` で登録する |
| [mail.ts](mail.ts)     | 第64章 練習問題6        | `sendMailJob`。送ったことを Redis に覚え（7 日）、同じ仕事の ID なら 2 回送らない。SMTP の 5xx は `UnrecoverableError`（再試行しない）、ほかは投げ直して BullMQ に再試行させる                                                                        |
| [digest.ts](digest.ts) | 第64章 練習問題8        | `sendDailyDigests(db, mailer, day, appUrl)`。その日が期限で、終わっていないタスクを持つ、確認済みの人に 1 通。`digest_log` に先に行を入れられたワーカーだけが送る（送れなければ行を消す）。`dayIn(timeZone, date)` は、そのタイムゾーンでの日付       |
| [sweep.ts](sweep.ts)   | 第63章 練習問題8        | `sweepOrphans({ blobs, prefix, isReferenced, graceMs, now })`。どの行からも使われていない、置いてから `graceMs` たったファイルを消す（タスクを消すと、添付の行は CASCADE で消えるが、中身は残るため）                                                 |
