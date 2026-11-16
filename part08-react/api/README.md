# api — 第8部の練習用の API

第8部の章で画面からつなぐ API です。**第7部の成果物（タスク管理 API）と同じ API** を、PostgreSQL を使わずに、メモリにデータを置いて動かします。データベースを動かさなくても、第39〜46章の画面を試せるようにするためです。

```sh
$ cd ~/dev/part08
$ npm run api                      # http://127.0.0.1:9500/api/tasks（止めるのは Ctrl+C）
$ API_DELAY_MS=1500 npm run api    # 応答を 1.5 秒遅らせる（「読み込み中」の画面を確かめる）
$ SEED=0 npm run api               # 例のタスクを入れずに始める
```

- データはメモリに置くので、止めると消えます。起動するたびに、例のタスクを5つ入れます。
- `http://localhost:5173` と `http://127.0.0.1:5173` からの呼び出しを、CORS で許しています（第39章）。
- 作業中（`doing`）は3個まで、締め切りは過ぎた日付にできない、などの決まりも、第7部と同じです。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [server.ts](server.ts) | 第8部で書いた起動のファイル。メモリのデータの層を作ってつなぎ、`127.0.0.1:9500` で `listen` する |
| [repositories/](repositories/) | 第8部で書いた、メモリのデータの層（`TaskRepo` の形に合わせた） |
| [app.ts](app.ts) | 第7部のまま。ミドルウェアの順番を決める |
| [config.ts](config.ts) | 第7部のまま。環境変数を Zod で確かめる |
| [types.ts](types.ts) | 第7部のまま。`Task`・`Status`・`Sort`・`interface TaskRepo` など。画面の `schemas.ts` は、この `Task` と同じ形にする |
| [express.d.ts](express.d.ts)・[errors.ts](errors.ts) | 第7部のまま |
| [routes/](routes/)・[services/](services/)・[middleware/](middleware/)・[lib/](lib/) | 第7部のまま |

`server.ts` と `repositories/` のほかは、第7部の成果物の `src/` のコピーです。中身を読む必要はありません。画面から見えるのは、HTTP の応答（形・ステータス・ヘッダ）だけで、それは第7部の API と同じです。
