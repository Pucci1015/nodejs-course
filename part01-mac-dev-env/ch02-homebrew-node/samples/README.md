# 第2章 サンプル

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [Brewfile.sample](Brewfile.sample) | この教材で使うツールをまとめた Brewfile の例 | 4.4 |
| [check-arch.sh](check-arch.sh) | CPU アーキテクチャ、Rosetta、Homebrew と node の場所を表示する | 2, 7 |
| [node-info.mjs](node-info.mjs) | 実行中の Node.js のバージョン、LTS、アーキテクチャなどを表で表示する | 7 |
| [mise.toml.sample](mise.toml.sample) | プロジェクトに置く `mise.toml` の例（環境変数の設定つき） | 6.3 |

## 動かし方

```sh
$ bash check-arch.sh
$ node node-info.mjs
```

`mise.toml.sample` を試すには、適当なフォルダにコピーして名前を変えます。

```sh
$ mkdir -p ~/dev/mise-test && cp mise.toml.sample ~/dev/mise-test/mise.toml
$ cd ~/dev/mise-test
$ mise trust              # 初めてのフォルダの設定ファイルは、信頼してよいか確認される
$ mise install
$ node -v && echo $PORT   # 24 系と 3000 が表示される
$ cd ~ && echo $PORT      # フォルダを出ると環境変数も消える
```

`mise trust` を求められるのは、`mise.toml` に環境変数などを書けるためです。他人のリポジトリを clone しただけで、意図しない設定が有効にならないようにする安全装置です。

## 読みどころ

- `check-arch.sh` の `sysctl -n sysctl.proc_translated 2> /dev/null || echo ...` は、「コマンドが失敗したら（Intel Mac などで項目が無いとき）代わりの文字列を出す」という第1章7節の書き方です。
- `node-info.mjs` は拡張子が `.mjs` なので、ES Modules として扱われ `import` 文が使えます（第3部で `.js` / `.mjs` / `.cjs` の違いを学びます）。`node:os` の `node:` は「Node.js の組み込みモジュール」であることを明示する書き方です。
