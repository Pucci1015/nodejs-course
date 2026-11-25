# 第1章 サンプル

本文（[../README.md](../README.md)）で使うサンプルと、本文の「手を動かす」で書くスクリプトの完成形です。
教材のフォルダでは動かさず、`~/dev/ch01` にコピーしてから使います（本文2.5節）。

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [make-playground.sh](make-playground.sh) | 練習用のフォルダとファイル一式を作る（既定は `~/dev/ch01/playground`） | 3, 4 |
| [streams-demo.sh](streams-demo.sh) | stdout と stderr に1行ずつ出力し、終了ステータス 3 で終わる | 5, 7 |
| [access.log](access.log) | Web サーバのアクセスログの例（80行） | 6 |
| [count.sh](count.sh) | 「手を動かす」の完成形: ファイルの行を数える（引数の確かめ、終了ステータス） | 9.3, 11.4 |
| [list.sh](list.sh) | 「手を動かす」の完成形: フォルダの中のファイルを行数つきで並べる（`for`） | 9.4 |
| [greet.sh](greet.sh) | 「手を動かす」の完成形: 環境変数 `GREETING` を表示する | 10.1 |
| [show-path.sh](show-path.sh) | PATH を探される順に1行ずつ表示し、無いフォルダに印を付ける | 10.2 |
| [env-demo.mjs](env-demo.mjs) | 環境変数が Node.js に渡る様子を確かめる（Node.js が必要。第2章の後で） | 10.1 |
| [zshrc.sample](zshrc.sample) | コメント付きの `.zshrc` の例 | 11 |

## 動かし方

`~/dev/ch01` で動かします。

```sh
$ cd ~/dev/ch01
$ bash samples/make-playground.sh            # ~/dev/ch01/playground を作る
$ bash samples/streams-demo.sh 2> /dev/null  # stdout だけ表示
$ echo $?                                    # 3
$ bash samples/count.sh samples/access.log   # samples/access.log は 80 行です
$ bash samples/list.sh samples
$ GREETING=hello bash samples/greet.sh       # GREETING は「hello」です
$ bash samples/show-path.sh
$ node samples/env-demo.mjs                  # 第2章で Node.js を入れた後
```

`make-playground.sh` は、作成先が既にあると何もせずに終了します（誤って上書きしないため）。作り直したいときは、中身を確かめてから消します。

## 読みどころ（9節まで読んだ後で）

- `make-playground.sh` では、`mkdir -p "$dest"/{docs,photos,...}` のブレース展開（4.1節）、`"My Documents"` のような空白入りの名前のクォート（4.3節）、関数 `repeat_line` によるファイルの生成を使っています。
- 生成に `yes ... | head -n 200` を使わないのは、`set -o pipefail` と組み合わせると、`head` が読み終えた後に `yes` が書き込めなくなって異常終了（終了ステータス 141）し、スクリプト全体が失敗扱いになるためです。`pipefail` は便利ですが、こうした落とし穴もあります。
- `show-path.sh` の `IFS=':' read -r -a dirs <<< "$PATH"` は、「区切り文字を `:` にして文字列を配列に分ける」定番の書き方です。本文では説明していないので、今は「PATH を `:` で分けて、1つずつ取り出している」と読めれば十分です。
- `zshrc.sample` の `hist_ignore_space` は、秘密の値を一時的に打つときに履歴に残さないための設定です。第10部で秘密情報の扱いを学ぶときにも思い出してください。
