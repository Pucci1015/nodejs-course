# 第15章 サンプル

本文の「手を動かす」で書くプログラムの完成形と、動かして結果を見るだけのプログラム（「中身は読まなくてよい」）があります。どれも `~/dev/part03/ch15-node-api` で `node samples/ファイル名` のように実行します。

**本文で書くプログラムの完成形**

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [notes.mjs](notes.mjs) | 一時フォルダの中で、フォルダを作る・書く・追記する・読む・一覧・エラーの code・消す | 3.2, 3.3 |
| [emitter.mjs](emitter.mjs) | `on`・`once`・`emit`。`emit` は同期 | 5 |
| [count-lines.mjs](count-lines.mjs) | `readline` でファイルを1行ずつ読み、言葉を含む行を数える | 7.4 |
| [run-ls.mjs](run-ls.mjs) | `execFile` で `ls` を動かす。失敗したときの終了コードと stderr | 8.2 |

**動かして結果を見るだけのプログラム（中身は読まなくてよい）**

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [path-demo.mjs](path-demo.mjs) | `join`・`resolve`・`normalize`・`relative`・分解、`path.win32` | 2 | — |
| [fs-demo.mjs](fs-demo.mjs) | 読む・書く・追記、`flag: 'wx'`、エラーの code、`stat`、`readdir`、`rename`、`rm` | 3 | — |
| [atomic-write-demo.mjs](atomic-write-demo.mjs) | 書いている途中でプロセスを止めると、ファイルが壊れる様子。一時ファイル + `rename` との比較 | 3.4 | — |
| [events-demo.mjs](events-demo.mjs) | `on`・`once`・`emit`、`events.once`・`events.on`、`error` イベント、リスナーの付けすぎ | 5 | — |
| [buffer-demo.mjs](buffer-demo.mjs) | 文字列とバイト列、チャンクの境目で文字が切れる問題と直し方、Buffer の比較 | 6 | — |
| [stream-demo.mjs](stream-demo.mjs) | `pipeline`、Transform、背圧、`for await`、`Readable.from`、途中の失敗 | 7 | — |
| [readline-demo.mjs](readline-demo.mjs) | 100万行のファイルを `readFile` と `readline` で読んで、メモリを比べる | 7.1, 7.4 | — |
| [child-demo.mjs](child-demo.mjs) | `execFile`・`exec`・`spawn`、コマンドインジェクション、`timeout` | 8.2 | — |
| [util-demo.mjs](util-demo.mjs) | `util.inspect`・`styleText`、`os`、`crypto.randomUUID`・ハッシュ | 8.1 | — |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node samples/fs-demo.mjs
$ node samples/atomic-write-demo.mjs
$ node samples/readline-demo.mjs          # 一時フォルダに約 50MB のファイルを作り、最後に消す
$ node samples/readline-demo.mjs 200000   # 行数を減らす
```

- ファイルを作るサンプルは、OS の一時フォルダ（`os.tmpdir()`）の中に作業用のフォルダを作り、最後に消します。`~/dev/part03` の中にも何も書きません
- `atomic-write-demo.mjs` は、子プロセスを `SIGKILL` で止めます。一時ファイル + `rename` の方では、止めた子プロセスの一時ファイルが1つ残りますが、作業用のフォルダごと消すので問題ありません（残った一時ファイルの片付けは練習問題5で考えます）
- `child-demo.mjs` の3は、**わざと**コマンドインジェクションを起こします。実行されるのは `echo` だけで、一時フォルダの中のファイル名を使います
