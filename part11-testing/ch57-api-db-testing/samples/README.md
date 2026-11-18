# 第57章 サンプル

練習用の小さなタスクの API と、本文の「手を動かす」で書くテストの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part11/ch57-api-db-testing`）で打ちます。`repo.test.ts` は PostgreSQL（第6部の compose、5433）を使います。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [types.ts](types.ts) | 1 | | `Task`・`interface TaskRepo`・`ConflictError`・`ValidationError` |
| [app.ts](app.ts) | 1 | | Express のルート。Zod で確かめ、エラーを problem+json に |
| [service.ts](service.ts) | 1 | | サービス（題名・期限・`doing` は3つまで） |
| [memory-repo.ts](memory-repo.ts) | 4・6 | | メモリの偽物のリポジトリ（seed を渡せる） |
| [pg-repo.ts](pg-repo.ts) | 5 | | PostgreSQL のリポジトリと、テーブルを作る `SCHEMA_SQL` |
| [server.ts](server.ts) | 2.1 | 9717 | API を起動する（`REPO=pg` でスキーマ `ch57_demo` の PostgreSQL） |
| [start-app.ts](start-app.ts) | 2.2 | 0（空いている番号） | テストの中でアプリを起動する `startApp` |
| [http.test.ts](http.test.ts) | 2.3・3 | 0 | HTTP のテスト |
| [service.test.ts](service.test.ts) | 4 | | サービスの単体テスト |
| [test-db.ts](test-db.ts) | 5.1 | | テストごとのスキーマを作って消す `createTestDb` |
| [repo-contract.ts](repo-contract.ts) | 5.2・6 | | `TaskRepo` の約束のテスト |
| [repo.test.ts](repo.test.ts) | 5.2・6 | | 約束のテストを、メモリと PostgreSQL の両方に動かす |
| [holidays.ts](holidays.ts)・[holidays.test.ts](holidays.test.ts) | 8 | 0 | 外の API を呼ぶ部品と、偽物のサーバでのテスト |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part11/ch57-api-db-testing
$ node samples/server.ts                 # Ctrl+C で止める
$ node --test samples/*.test.ts          # 22 個
```

`REPO=pg node samples/server.ts` で作ったスキーマ `ch57_demo` は、残ります。要らなくなったら、`psql` で `DROP SCHEMA ch57_demo CASCADE;` と打って消してください。
