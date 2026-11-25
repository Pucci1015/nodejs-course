# 第2章 サンプル

本文（[../README.md](../README.md)）で使うサンプルと、本文の「手を動かす」で書くプログラムの完成形です。
教材のフォルダでは動かさず、`~/dev/ch02` にコピーしてから使います（本文の「読み方」）。

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [check-arch.sh](check-arch.sh) | CPU の種類、Rosetta、Homebrew と node の場所を表示する | 2 |
| [Brewfile.sample](Brewfile.sample) | この教材で使う道具をまとめた Brewfile の例 | 4.5 |
| [mise.toml.sample](mise.toml.sample) | プロジェクトに置く `mise.toml` の例（環境変数の設定つき） | 6.3, 6.5 |
| [hello.mjs](hello.mjs) | 「手を動かす」の完成形: 環境変数と `process` を表示する | 7.2 |
| [node-info.mjs](node-info.mjs) | 実行中の Node.js のバージョン、LTS、CPU の種類などを表で表示する（中身は第3部で学ぶ書き方。読まなくてよい） | 7.2 |

## 動かし方

`~/dev/ch02` で動かします。

```sh
$ cd ~/dev/ch02
$ bash samples/check-arch.sh
$ node samples/hello.mjs
$ node samples/node-info.mjs
```

`mise.toml.sample` を試すには、フォルダを作ってコピーし、名前を変えます。

```sh
$ mkdir -p ~/dev/ch02/mise-test && cp samples/mise.toml.sample ~/dev/ch02/mise-test/mise.toml
$ cd ~/dev/ch02/mise-test
$ mise trust              # 初めてのフォルダの設定ファイルは、信頼してよいか確かめられる
$ mise install
$ node -v && echo $PORT   # 24 系と 3000 が表示される
$ cd .. && echo $PORT     # フォルダを出ると、環境変数も消える
```

## 読みどころ

- `check-arch.sh` の `sysctl -n sysctl.proc_translated 2> /dev/null || echo ...` は、「コマンドが失敗したら（Intel の Mac などで項目が無いとき）代わりの文字列を出す」という第1章7.2節の書き方です。`command -v brew` は、`which` と同じく、コマンドの場所を表示します（シェルの組み込みで、見つからなければ何も出さず失敗します）。
- `node-info.mjs` の `import os from 'node:os'` は、Node.js の組み込みの機能を読み込む書き方です。`node:` は「Node.js の組み込み」であることをはっきりさせる印です（第3部 第14章）。
