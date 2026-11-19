# test — API のテスト

`npm test` で全部、`npm run test:unit` で単体だけを動かします。HTTP のテストは PostgreSQL と Redis が要ります（このリポジトリで `docker compose up -d --wait`）。

| ファイル・フォルダ   | 中身                                                      |
| -------------------- | --------------------------------------------------------- |
| [unit/](unit/)       | 単体テスト（PostgreSQL も Redis も要らない）              |
| [db/](db/)           | 第67章: データベースの制約のテスト（PostgreSQL だけ要る） |
| [http/](http/)       | サーバを子プロセスで起動し、HTTP だけで確かめるテスト     |
| [support/](support/) | テストの道具                                              |
