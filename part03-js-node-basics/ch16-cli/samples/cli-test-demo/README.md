# cli-test-demo

CLI を子プロセスとして起動し、標準出力・標準エラー出力・終了コードを確かめるテストの例です（本文10節）。

| ファイル | 内容 |
| --- | --- |
| [count.mjs](count.mjs) | 行数（`--chars` で文字数も）を数える小さな CLI。テストの対象 |
| [count.test.mjs](count.test.mjs) | `spawn` で `count.mjs` を起動するテスト。標準入力を渡す、作業フォルダを分ける、環境変数を絞る |

```sh
$ node --test count.test.mjs
$ printf 'あ\nい\n' | node count.mjs --chars
2	4
```
