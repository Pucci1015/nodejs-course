# e2e — 画面から通すテスト（Playwright）

`npm run e2e` で、偽の SMTP サーバと、ビルドした画面を配る API を起動してから動かします（`playwright.config.ts`）。ポートは 9906〜9908。

| ファイル・フォルダ                     | 中身                                                  |
| -------------------------------------- | ----------------------------------------------------- |
| [auth-flow.spec.ts](auth-flow.spec.ts) | 登録 → メールのリンク → ログイン → ログアウト         |
| [helpers.ts](helpers.ts)               | 届いたメールを読む・API で登録を済ませる              |
| [prepare-db.ts](prepare-db.ts)         | 空のスキーマ `e2e` と Redis のキー `e2e:…` を作り直す |
