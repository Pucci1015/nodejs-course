# test — 外から HTTP で確かめるテスト

| ファイル | 中身 |
| --- | --- |
| [api.test.ts](api.test.ts) | 第7部の 30 個のテスト（1〜25 は第5部、26〜30 は第6部で足したもの）。第10部で、最初にユーザーを登録してログインし、その Cookie を付けて送るように変えた（確かめることは同じ）。サーバは `127.0.0.1:9491`、別のサーバが要るテストは `9492` |
| [auth.test.ts](auth.test.ts) | 第10部で足した 15 個のテスト（31〜45）。登録・メールの確認・ログイン・人ごとの分離・SSE・セッション ID の作り直し・ログアウト・CSRF・再設定・ヘッダ・回数の上限・設定・練習用の IdP。サーバは `9493`、別のサーバが要るテストは `9494` |
| [helpers.ts](helpers.ts) | テストの道具。サーバの起動と停止、`api()`（`jar` に覚えた、その base の Cookie を付ける）、`problem()`、SSE を読む `openEvents()`、届いたメールを待つ `takeMail()`、登録 → 確認 → ログインをする `signUp()` |
| [fake-smtp.ts](fake-smtp.ts)・[mini-idp.ts](mini-idp.ts) | 第10部の `tools/` のコピー。テストの中で、空いているポートに起動する（`npm run mail` などを動かしておかなくてよい） |

```sh
$ npm test                                          # 完成例を確かめる（2つのファイルが同時に動く）
$ API_SERVER=../../task-api/src/server.ts npm test   # 別の場所のサーバを確かめる（test/ から見たパス）
```

- `npm test` は `node --test "test/*.test.ts"` です。`helpers.ts` などは `.test.ts` で終わらないので、テストとしては動きません
- 応答の JSON は `any` のまま読み、`assert` で確かめます（`helpers.ts` の `TestResponse` 型）。そのため `eslint.config.js` で、`test/` だけ `no-unsafe-…` のルールを止めています
- PostgreSQL が要ります。先に `~/dev/part06` で `docker compose up -d --wait` を動かしておきます。つなぎ先は、データベース `taskapi`（`TEST_DATABASE_URL` で変えられる）です
- テストは、起動するサーバごとに、`taskapi` の中に新しいスキーマ（`test_` で始まる名前）を作り、`DATABASE_SCHEMA` で渡します。サーバは、そのスキーマにマイグレーションを動かしてから始まるので、最初は空です。テストが終わると、スキーマごと消します（`npm start` で使う `public` のテーブルには触りません）
- サーバには、メールの送り先（テストの中の偽の SMTP サーバ）と、決まった `SESSION_SECRET` を渡します。決まった鍵なので、同じスキーマで起動し直したサーバ（テスト 28）や2台目のサーバ（テスト 29）でも、同じ Cookie でログインが続きます
- テストは、中の作り（どのファイルに何を書いたか）を見ません。成果物の README の2節の要件だけを確かめるので、自分の API にもそのまま使えます（第28章 6節の契約のテスト）
