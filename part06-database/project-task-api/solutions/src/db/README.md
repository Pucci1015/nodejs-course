# src/db — データベースの部品（第6部）

| ファイル | 元 | 中身 |
| --- | --- | --- |
| [pool.mjs](pool.mjs) | 第32章 4・5節の `db.mjs` | `createPool({ url, schema, max })`（`date` を文字列で受け取る設定つき）と、ログ用にパスワードを隠す `redactUrl(url)` |
| [migrate.mjs](migrate.mjs) | 第32章 練習問題8 | `migrate(pool, dir)`。[../../migrations/](../../migrations/) の SQL を、名前の順に、まだのものだけ動かす。アドバイザリロックとチェックサムつき。`npm run migrate` で、単独でも動く |
