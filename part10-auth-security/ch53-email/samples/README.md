# 第53章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part10/ch53-email`）で `node samples/○○.ts` と打ちます。メールを送るものは、先に別のターミナルで、メールの受け取り口（`~/dev/part10` で `npm run mail`、または `docker compose up -d mailpit`）を動かしておきます。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [send-mail.ts](send-mail.ts) | 3.1 | （1025 に送る） | nodemailer で1通送る |
| [mailer.ts](mailer.ts) | 3.2 | | アプリから使う `Mailer` の形、SMTP の実装と、メモリの偽物 |
| [mail-errors.ts](mail-errors.ts) | 3.3 | （1025 に送る） | 451・550・つながらないときのエラー（`npm run mail` で試す） |
| [token.ts](token.ts) | 4.1 | | メールのリンクのトークン（ハッシュ・期限・1回だけ・使い道） |
| [try-token.ts](try-token.ts) | 4.1 | | `token.ts` を試す |
| [mails.ts](mails.ts) | 5.1 | | 確認のメールと「登録済みです」のメールを作る関数 |
| [email-app.ts](email-app.ts) | 5.2・5.3・7 | 9637 | 登録 → 確認のメール → 確認 → ログイン |
| [password.ts](password.ts) | 5.2 | | 第51章 3節の `hashPassword`・`verifyPassword` のコピー |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part10/ch53-email
$ node samples/send-mail.ts
$ node samples/email-app.ts       # Ctrl+C で止める
```
