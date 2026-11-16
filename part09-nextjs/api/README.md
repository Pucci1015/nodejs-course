# api — 第9部の練習用の API

第9部の章で、Next.js のサーバからつなぐ API です。第8部の `api/` と同じもので、**第7部の成果物（タスク管理 API）と同じ API** を、PostgreSQL を使わずに、メモリにデータを置いて動かします。

```sh
$ cd ~/dev/part09
$ npm run api                      # http://127.0.0.1:9500/api/tasks（止めるのは Ctrl+C）
$ API_DELAY_MS=1500 npm run api    # 応答を 1.5 秒遅らせる（「読み込み中」の画面を確かめる）
$ SEED=0 npm run api               # 例のタスクを入れずに始める
```

- データはメモリに置くので、止めると消えます。起動するたびに、例のタスクを5つ入れます。
- 第9部では、ブラウザではなく **Next.js のサーバ**がこの API を呼びます。だから CORS は使いません（第48章）。
- 作業中（`doing`）は3個まで、締め切りは過ぎた日付にできない、などの決まりも、第7部と同じです。
- 練習問題のテストは、このサーバを別のポート（`PORT=9516` など）で自分で起動します。`npm run api` を動かしていなくても、テストは動きます。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [server.ts](server.ts) | 第8部で書いた起動のファイル。メモリのデータの層を作ってつなぎ、`127.0.0.1:9500`（`PORT` で変えられる）で `listen` する |
| [repositories/](repositories/) | 第8部で書いた、メモリのデータの層（`TaskRepo` の形に合わせた） |
| [app.ts](app.ts)・[config.ts](config.ts)・[types.ts](types.ts)・[express.d.ts](express.d.ts)・[errors.ts](errors.ts) | 第7部のまま |
| [routes/](routes/)・[services/](services/)・[middleware/](middleware/)・[lib/](lib/) | 第7部のまま |

`server.ts` と `repositories/` のほかは、第7部の成果物の `src/` のコピーです。中身を読む必要はありません。
