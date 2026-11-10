# 第5部の成果物 完成例（`task-api` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | `npm start`・`npm run dev`・`npm test`。使うパッケージは express・zod・pino・cors だけ |
| [mise.toml](mise.toml) | Node.js のバージョン（`mise use node@24` で作られるもの） |
| [.env.example](.env.example) | 設定の例。`.env` にコピーして使う |
| [.gitignore](.gitignore) | `node_modules/` と `.env` をコミットしない |
| [src/](src/) | API のコード |
| [test/](test/) | 外から HTTP で確かめるテスト |

## 動かし方

教材のフォルダは見本として残しておくため、`~/dev/part05` の中の完成例を、さらに `~/dev/task-api-example` にコピーしてから動かします。`cp -R` は、フォルダを中身ごとコピーするコマンドです。

```sh
$ cp -R ~/dev/part05/project-task-api/solutions ~/dev/task-api-example
$ cd ~/dev/task-api-example
$ npm ci             # package-lock.json のとおりに入れる
$ cp .env.example .env
$ npm start          # http://127.0.0.1:9360/api/tasks
$ npm test           # 25 個のテスト（127.0.0.1:9361 と 9362 を使う）
```

ログは1行1つの JSON です。読みにくければ、`npm start | npx pino-pretty` で見やすくできます（pino-pretty は、そのときだけ取ってきて動かします）。

## 作りの要点

- **組み立ては server.mjs だけ**: `loadConfig` → pino → `createMemoryTaskRepo` → `createEventHub` → `createTaskService` → `sseRoute` → `createApp` → `listen`。どの実物を使うかを知っているのは、ここだけです（第26章 4節）
- **コピーした部品と、足したもの**: 前の章の解答をコピーしたファイルは、先頭のコメントに元の場所を書きました。足した所は `// 追加（成果物）:`、変えた所は `// 変更（成果物）:` です
- **版の確かめ**: ルートが `If-Match` から「客が見ていた版」を決め、サービスとデータの層が「今の版が同じときだけ変える」をします（要件の 3.3節）
- **知らせる**: サービスは `publish(type, task)` を呼ぶだけで、SSE を知りません（3.4節）
- **止め方**: `sse.closeAll()` で SSE に `shutdown` を送って閉じてから、`server.close()` します。テスト 24 は、これをしないと 3 秒以内に止まらずに失敗します

## テストが確かめないこと

- ログの中身（秘密の値が書かれていないか）。`LOG_LEVEL=info npm start` で動かして、目で確かめてください
- 2つの PATCH がほとんど同時に来たとき。メモリのデータの層では、`await` の間にほかのリクエストが割り込むことはほとんどないので、テストで起こすのが難しいためです（第6部で、データベースを使って確かめます）
- `SHUTDOWN_TIMEOUT_MS` の時間切れ（終わらないリクエストを作るルートが無いため。第26章 練習問題9で確かめました）
