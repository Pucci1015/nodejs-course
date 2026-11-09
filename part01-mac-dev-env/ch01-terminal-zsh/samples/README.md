# 第1章 サンプル

本文（[../README.md](../README.md)）で使うサンプルです。

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [make-playground.sh](make-playground.sh) | 練習用のフォルダとファイル一式を作る（既定は `~/dev/playground`） | 3, 4 |
| [streams-demo.sh](streams-demo.sh) | stdout と stderr に1行ずつ出力し、終了ステータス 3 で終わる | 5, 7 |
| [access.log](access.log) | Webサーバのアクセスログの例（80行） | 6 |
| [show-path.sh](show-path.sh) | PATH を検索順に1行ずつ表示し、存在しないフォルダに印を付ける | 10 |
| [env-demo.mjs](env-demo.mjs) | 環境変数が子プロセスへ引き継がれる様子を確かめる（Node.js が必要） | 10 |
| [zshrc.sample](zshrc.sample) | コメント付きの `.zshrc` の例 | 11 |

## 動かし方

このフォルダに移動してから実行します。

```sh
$ cd samples                        # この README があるフォルダ
$ bash make-playground.sh           # ~/dev/playground に練習用フォルダを作る
$ bash streams-demo.sh 2> /dev/null # stdout だけ表示
$ echo $?                           # 3
$ bash show-path.sh
$ awk '{print $9}' access.log | sort | uniq -c   # ステータスコードごとの件数（本文6.4節）
```

`make-playground.sh` は、作成先が既にあると何もせずに終了します（誤って上書きしないため）。作り直したいときは中身を確認してから削除してください。

## 読みどころ

- `make-playground.sh` では、`mkdir -p "$dest"/{docs,photos,...}` のブレース展開、`"My Documents"` のようなスペース入りの名前のクォート、関数 `repeat_line` によるファイルの生成を使っています。
- 生成に `yes ... | head -n 200` を使わないのは、`set -o pipefail` と組み合わせると、`head` が読み終えた後に `yes` が書き込めなくなって異常終了（SIGPIPE、終了ステータス 141）し、スクリプト全体が失敗扱いになるためです。`pipefail` は便利ですが、こうした落とし穴もあります。
- `show-path.sh` の `IFS=':' read -r -a dirs <<< "$PATH"` は、「区切り文字を `:` にして文字列を配列に分ける」定番の書き方です。本文では説明していない書き方なので、今は「PATH を `:` で分けて、1つずつ取り出している」と読めれば十分です。
- `zshrc.sample` の `hist_ignore_space` は、APIキーなどを一時的に打つときに履歴に残さないための設定です。第10部で秘密情報の扱いを学ぶときにも思い出してください。
