# test — API のテスト（第11部で、層ごとのフォルダに分けた）

| フォルダ               | 層           | 中身                                                                                      | 要るもの   | 数  |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------------- | ---------- | --- |
| [unit/](unit/)         | 単体         | サービスとパスワードの決まりを、偽物のリポジトリと決まった時刻で確かめる                  | なし       | 25  |
| [contract/](contract/) | 契約（結合） | `TaskRepo` の約束を、メモリの偽物と PostgreSQL の両方に確かめる                           | PostgreSQL | 19  |
| [http/](http/)         | HTTP（結合） | サーバを子プロセスで起動し、HTTP だけで確かめる（第10部の 45 個）                         | PostgreSQL | 45  |
| [support/](support/)   |              | テストの道具（サーバの起動、偽の SMTP サーバ・IdP、偽物のリポジトリ、テスト用のスキーマ） |            |     |

```sh
$ npm test                    # 全部（node --test "test/**/*.test.ts"）
$ npm run test:unit           # 単体テストだけ（PostgreSQL が無くても動く）
$ node --test test/contract/task-repo.test.ts   # 1つのファイルだけ
$ API_SERVER=../../task-api/src/server.ts npm test   # 別の場所のサーバを確かめる（test/ から見たパス。第10部と同じ）
```

- `"test/**/*.test.ts"` の `**` は、どの深さのフォルダでも、の意味です。`support/` のファイルは `.test.ts` で終わらないので、テストとしては動きません
- PostgreSQL が要るテストは、`test_` で始まるスキーマを作って、終わったら消します。つなぎ先は、データベース `taskapi`（`TEST_DATABASE_URL` で変えられる）です
- 応答の JSON は `any` のまま読み、`assert` で確かめます。そのため `eslint.config.js` で、`test/` だけ `no-unsafe-…` のルールを止めています
