# test/support — テストの道具

名前が `.test.ts` で終わらないので、これ自体はテストとして動きません。

| ファイル・フォルダ           | 中身                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [helpers.ts](helpers.ts)     | サーバを起動する `startServer`・`api`・`problem`・偽の SMTP のメールを読む `takeMail`・登録してログインする `signUp`・`freePort` |
| [test-db.ts](test-db.ts)     | テストごとのスキーマを作ってマイグレーションを動かす `createTestDb`                                                              |
| [fake-smtp.ts](fake-smtp.ts) | 偽の SMTP サーバ（第53章）。`npm run mail` でも動かせる                                                                          |
| [mini-idp.ts](mini-idp.ts)   | 練習用の IdP（第54章）                                                                                                           |
