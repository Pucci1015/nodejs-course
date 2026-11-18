# 第55章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part10/ch55-web-security`）で `node samples/○○.ts` と打ちます。サーバのサンプルは、どれもポート 9657 を使うので、1つずつ動かします（`Ctrl+C` で止める）。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [plain.ts](plain.ts) | 2.1 | 9657 | helmet を付ける前のアプリ（比べるため） |
| [headers.ts](headers.ts) | 2.1 | 9657 | helmet でセキュリティのヘッダを付ける |
| [csp-nonce.ts](csp-nonce.ts) | 3.1 | 9657 | CSP の nonce。`CSP_REPORT_ONLY=1` で Report-Only |
| [fetch-metadata.ts](fetch-metadata.ts) | 5.1 | 9657 | `Sec-Fetch-Site` で、別のサイトからのリクエストを断る |
| [sql.ts](sql.ts) | 6.1 | | SQL を文字列でつなげると壊れる・プレースホルダ（`node:sqlite`） |
| [run-command.ts](run-command.ts) | 6.2 | | `exec` と `execFile` |
| [owner-check.ts](owner-check.ts) | 7.1 | 9657 | 持ち主を条件に入れて探す |
| [outbound-url.ts](outbound-url.ts) | 8.1 | | 利用者が書いた URL を、取りに行く前に確かめる（`BlockList`） |
| [errors.ts](errors.ts) | 10.1 | 9657 | エラーの中身を見せず、隠してログに書く |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part10/ch55-web-security
$ node samples/headers.ts          # 別のターミナルで curl -sI http://127.0.0.1:9657/
$ node samples/run-command.ts
$ node samples/outbound-url.ts
```
