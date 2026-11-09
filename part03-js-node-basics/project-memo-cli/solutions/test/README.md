# test

`node:test` のテストです。`npm test`（`node --test "test/*.test.mjs"`）で、すべて動かします。

| ファイル | 確かめること | 方法 |
| --- | --- | --- |
| [front-matter.test.mjs](front-matter.test.mjs) | front matter の読み書き。手で書いた形、特別な意味のタイトル、知らない行を残す | 関数を `import` する |
| [store.test.mjs](store.test.mjs) | id、同時に作ってもぶつからない、一覧の順番、id の解決（前方一致、フォルダの外、NFD）、書き直し、ゴミ箱 | 一時フォルダで `MemoStore` を使う。時刻は `now` で差し替える |
| [cli.test.mjs](cli.test.mjs) | コマンドとしての動き: 標準出力・標準エラー出力・終了コード、設定の優先順位、エディタ | 子プロセスとして起動する。`MEMO_BIN` で、確かめる `memo.mjs` を変えられる |
| [fake-editor.mjs](fake-editor.mjs) | テストで使うエディタの代わり。ファイルの最後に1行足す（`FAKE_EDITOR_MODE=fail` なら終了コード 1） | — |

`cli.test.mjs` は、一時フォルダを `HOME` にし、環境変数を必要なものだけにして動かします。自分の Mac の `~/memos`、`~/.config/memo`、`EDITOR`、`NO_COLOR` には影響されません。
