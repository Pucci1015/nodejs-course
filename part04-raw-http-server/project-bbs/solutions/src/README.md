# src

| ファイル | 中身 |
| --- | --- |
| [server.mjs](server.mjs) | 起動とシャットダウン。環境変数 `PORT`・`DATA_DIR`・`SESSION_TTL_MS` を読む |
| [app.mjs](app.mjs) | `createBbsApp`。URL ごとの処理、CSRF、ログインの確かめ、エラーの画面、セキュリティのヘッダ |
| [store.mjs](store.mjs) | `Store`。JSON のファイルにデータを保存する。書き込みは1つずつ順に |
| [views.mjs](views.mjs) | 画面。第21章の `html` タグで書いた関数 |
| [auth.mjs](auth.mjs) | パスワードのハッシュ（salt 付きの scrypt）と、確かめ |
| [validate.mjs](validate.mjs) | 入力の確かめ（422 のための、項目ごとの説明） |
| [lib/](lib/) | 第17〜22章の部品のコピー |
