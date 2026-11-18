# 第51章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part10/ch51-auth-basics`）で `node samples/○○.ts` と打ちます。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [naive-hash.ts](naive-hash.ts) | 2.1 | | SHA-256 だけでは、同じパスワードが同じ値になり、1秒に何十万回も計算できる |
| [salted.ts](salted.ts) | 2.2 | | ソルトを混ぜると、同じパスワードでも違う値になる |
| [slow-hash.ts](slow-hash.ts) | 2.3 | | SHA-256・scrypt・Argon2id の時間を比べる |
| [password.ts](password.ts) | 3 | | `hashPassword`・`verifyPassword`（Argon2id と PHC 文字列） |
| [try-password.ts](try-password.ts) | 3.1 | | `password.ts` を試す |
| [policy.ts](policy.ts)・[common-passwords.txt](common-passwords.txt) | 4 | | パスワードの決まり（長さ・よく使われるもの・メールアドレスを含む） |
| [try-policy.ts](try-policy.ts) | 4.1 | | `policy.ts` を試す |
| [auth-api.ts](auth-api.ts) | 5・6 | 9617 | 登録とログインの API（メモリ） |
| [limiter.ts](limiter.ts) | 6 | | ログインの失敗を数える |
| [authorize.ts](authorize.ts) | 7 | | 認可の関数 `can` |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part10/ch51-auth-basics
$ node samples/try-password.ts
$ node samples/auth-api.ts          # Ctrl+C で止める
```
