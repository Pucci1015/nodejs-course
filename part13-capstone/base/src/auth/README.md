# src/auth — ログインの部品

第10部の章で作った部品のコピーです（第51〜54章）。

| ファイル・フォルダ                           | 中身                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| [password.ts](password.ts)                   | パスワードのハッシュ（Argon2id の PHC 文字列）と確かめ（第51章）                     |
| [policy.ts](policy.ts)                       | パスワードの決まり（12〜128 文字・NFKC・よく使われるもの・メールアドレスを含まない） |
| [common-passwords.txt](common-passwords.txt) | よく使われるパスワードの一覧（1行1つ）                                               |
| [tokens.ts](tokens.ts)                       | メールのリンクのトークン（32 バイト。表にはハッシュだけを置く。第53章 4節）          |
| [mailer.ts](mailer.ts)                       | メールを送る形 `Mailer` と、nodemailer で作った `createSmtpMailer`                   |
| [mails.ts](mails.ts)                         | 登録の確認・再設定などのメールの本文                                                 |
| [oidc.ts](oidc.ts)                           | 練習用の IdP でログインする部品（第54章）                                            |
| [pg-session-store.ts](pg-session-store.ts)   | express-session のセッションを PostgreSQL の表 `sessions` に置く `PgSessionStore`    |
