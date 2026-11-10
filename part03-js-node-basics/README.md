# 第3部 モダン JavaScript と Node.js の基礎

第2部では、Node.js を「通信を確かめる道具」として使いました。この部では、Node.js そのものと、その上で動く JavaScript を深く学びます。
「なんとなく書ける」JavaScript を「なぜそう動くか説明できる」ところまで学び直し、非同期処理とイベントループで Node.js の動き方の芯をつかみ、モジュール・npm・標準 API を使いこなして、最後に実際に毎日使える CLI ツールを作ります。第4部でフレームワークなしの Web サーバを作るときに必要な道具は、すべてこの部でそろいます。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第11章 JavaScript 再入門](ch11-js-refresher/README.md) | 値と型、スコープとクロージャ、`this`、プロトタイプとクラス、分割代入・`?.`・`??`、配列のメソッド、参照とコピー、エラー処理 | 4〜5時間 |
| [第12章 非同期処理](ch12-async/README.md) | コールバック → Promise → async/await、失敗を取りこぼさない、直列と並行、`Promise.all`・`allSettled`・`race`・`any`、ループと `await`、`AbortSignal` | 4〜5時間 |
| [第13章 イベントループ](ch13-event-loop/README.md) | タスクとマイクロタスク、イベントループのフェーズ、libuv のスレッドプール、イベントループを止める処理と止めない方法、Worker、遅れの測定、プロセスの終わり方 | 4〜5時間 |
| [第14章 モジュールとパッケージ管理](ch14-modules-npm/README.md) | ES Modules と CommonJS、モジュールの解決（`exports`・`imports`）、`package.json`、semver、ロックファイルと `npm ci`、npm scripts、依存パッケージの危険 | 4〜5時間 |
| [第15章 Node.js の標準 API](ch15-node-api/README.md) | `path`、`fs/promises`、壊れない書き込み、`process`、EventEmitter、Buffer と文字コード、Stream と背圧、`readline`、`child_process` | 4〜5時間 |
| [第16章 CLI ツールを作る](ch16-cli/README.md) | シバン・`bin`・`npm link`、`parseArgs`、標準入出力と isTTY、色と `NO_COLOR`、終了コードと `process.exit()`、EPIPE、シグナル、設定と XDG、CLI のテスト | 4〜5時間 |
| [成果物 メモの CLI](project-memo-cli/README.md) | メモを Markdown のファイルで管理する `memo` コマンド。front matter、壊れない書き込み、エディタの起動、子プロセスでのテスト | 8〜12時間 |

## 各章の使い方

第1部・第2部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている |
| `samples/` | 本文で使うサンプル（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- この部の練習問題の多くは、**テスト**（`node --test ○○.test.mjs`）か**確認スクリプト**（`bash check-○○.sh`）で確かめます。最初はほとんど失敗し、すべて成功すれば完成です。模範解答は `MODULE=../solutions/○○.mjs node --test ○○.test.mjs` や `bash check-○○.sh ../solutions/○○.mjs` で確かめられます。
- **実習は `~/dev/part03/` で行います**（教材のフォルダは見本として残しておくため）。第3部の章は、前の章の模範解答やデータを使うことがあるので、第11章の最初に、この部のフォルダを丸ごと `~/dev/part03` にコピーします（第11章の「読み方」）。
- 確認スクリプトは、`bash check-○○.sh` のように `bash` を付けて動かします（ファイルをコピーしたときなどに、実行の許可が外れることがあるためです）。
- ファイルを作るサンプルと練習問題は、OS の一時フォルダ（`os.tmpdir()`。Mac では `/var/folders/...` の下）に作って、最後に消します。
- `npm install` を使うのは第14章だけです。`~/dev/part03` の中のフォルダで行うので、教材のフォルダに `node_modules` はできません。
- サーバを起動するサンプルと練習問題は、`127.0.0.1` だけで待ち受けます。使うポートは第12章が 9120〜9121、第13章が 9130〜9133 です（各章の `samples/README.md` にも書いてあります）。
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしていて、執筆時点では 24 と 26 で動作を確かめています。

## 第3部を終えたときにできること

- JavaScript の型の変換、スコープ、`this`、プロトタイプ、参照とコピーを、動きの理由まで説明できる
- 非同期の処理を、失敗を取りこぼさず、直列・並行・上限付きの並行を使い分け、途中でやめられるように書ける
- イベントループとスレッドプールの仕組みから、「サーバが止まる」原因を見つけ、Worker や分割で直せる
- ES Modules と CommonJS、`package.json` の `exports`、semver とロックファイルを理解し、依存パッケージを安全に扱える
- ファイル・Stream・Buffer・子プロセスを、途中で落ちても壊れないように、大きなデータでもメモリを使いすぎないように扱える
- パイプ・リダイレクト・シグナルの中で正しく動く CLI を作り、子プロセスとしてテストできる

## 第3部で作るもの

- once・memoize・debounce、アクセスログの集計、LRU キャッシュ、深い比較とイミュータブルな更新（第11章）
- 再試行・上限付きの並行・まとめて取得する関数（第12章）
- 重い処理を分割・Worker に逃がすサーバ、イベントループの遅れの監視（第13章）
- semver の範囲の判定、Shift_JIS の変換、`exports` を書いたパッケージ（第14章）
- 壊れない書き込み、行の分割、大きなログの集計、仕事の列、フォルダの大きさ（第15章）
- 引数の解析、パイプで壊れない grep、確認の質問、シグナルで止まる処理、設定の読み込み（第16章）
- メモを Markdown のファイルで管理する CLI `memo`（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第2部 Web の基礎](../part02-web-basics/README.md) ／ 次: [第4部 フレームワークなしで Web サーバを作る](../part04-raw-http-server/README.md)
