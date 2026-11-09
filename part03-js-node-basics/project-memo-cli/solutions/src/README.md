# src

`memo` コマンドの本体です。

| ファイル | 役目 | 外のもの（process、端末）を触るか |
| --- | --- | --- |
| [cli.mjs](cli.mjs) | 引数の解析（`parseCli`）、コマンドの実行、出力、エラーと終了コード、`--help` | 触る |
| [store.mjs](store.mjs) | `MemoStore`: 一覧、id の解決、作る・書き直す・ゴミ箱に移す。`MemoError` | ファイルだけ |
| [front-matter.mjs](front-matter.mjs) | `parseMemo`・`serializeMemo`: ファイルの文字列 ⇔ `{ meta, body, extra }` | 触らない |
| [atomic.mjs](atomic.mjs) | `writeFileAtomic`（一時ファイル + `rename`）、`createFileExclusive`（一時ファイル + `link`） | ファイルだけ |
| [config.mjs](config.mjs) | `loadConfig`: 設定を重ねて読む（第16章 練習問題6の解答） | 引数で受け取る |
| [confirm.mjs](confirm.mjs) | `confirm`: `[y/N]` と聞く（第16章 練習問題4の解答） | 引数で受け取る |
| [editor.mjs](editor.mjs) | `openEditor`: エディタを起動して、閉じるまで待つ | 触る |

エラーには `exitCode` を持たせ（`UsageError` は 2、`MemoError` は 1、`ConfigError` は 2、`CancelledError` は 130）、`cli.mjs` の `main` が1か所でまとめて、メッセージと終了コードにします。`exitCode` を持たないエラーは「予期しないエラー」として扱います。
