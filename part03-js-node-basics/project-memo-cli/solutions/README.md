# project-memo-cli 完成例

第3部の成果物 `memo` コマンドの完成例です。要件は [../README.md](../README.md) にあります。外部のパッケージは使っていないので、`npm install` は不要です。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json) | `bin` で `memo` コマンドを宣言。`files` で、パッケージに入れるのを `bin/` と `src/` に絞る |
| [mise.toml](mise.toml) | Node.js の版（24） |
| [bin/](bin/) | コマンドの入口 |
| [src/](src/) | 本体 |
| [test/](test/) | テスト（`node:test`） |

## 動かす

教材のフォルダの中で、そのまま動かせます。本物の `~/memos` を使わないよう、`MEMO_DIR` で別のフォルダを指定して試します。

```sh
$ export MEMO_DIR=/tmp/memo-test
$ node bin/memo.mjs new 牛乳を買う -t 買い物 -m 低脂肪のもの
作成しました: /tmp/memo-test/20261104-174043.md
20261104-174043
$ echo "parseArgs を使う" | node bin/memo.mjs new CLI の設計 -t 仕事
$ node bin/memo.mjs list
20261104-174052  2026-11-04 17:40  CLI の設計  #仕事
20261104-174043  2026-11-04 17:40  牛乳を買う  #買い物
$ node bin/memo.mjs search parseargs
20261104-174052  2026-11-04 17:40  CLI の設計  #仕事
    1: parseArgs を使う
$ node bin/memo.mjs show 20261104-17404     # 区別できれば、最初の何文字かでよい
$ node bin/memo.mjs rm 20261104-174043      # 端末なら [y/N] と聞かれる
$ node bin/memo.mjs config
$ unset MEMO_DIR; rm -r /tmp/memo-test
```

`memo` という名前で使うには、`~/dev` にコピーしてから `npm link` します（教材のフォルダ（OneDrive）の中から `npm link` すると、OneDrive の中のフォルダへのリンクになり、同期の具合で動かなくなることがあるためです）。

```sh
$ cp -R "（教材のフォルダ）/part03-js-node-basics/project-memo-cli/solutions" ~/dev/memo-cli-example
$ cd ~/dev/memo-cli-example
$ chmod +x bin/memo.mjs
$ npm link
$ memo --help
$ npm unlink -g memo-cli                    # 元に戻す
```

## テスト

```sh
$ npm test
ℹ tests 34
ℹ pass 34
ℹ fail 0
$ MEMO_BIN=~/dev/memo-cli/bin/memo.mjs node --test test/cli.test.mjs   # 自分で作った memo を確かめる
```

`npm test` は `node --test "test/*.test.mjs"` です。引数なしの `node --test` は、`test` フォルダの中の `.mjs` を**すべて**テストとして動かすので、テストではない `fake-editor.mjs` まで動かされます（`fake-editor.mjs` は、そのとき何もしないようにしてあります）。

## 設計で決めたこと

| 決めたこと | 理由 | 別の選び方 |
| --- | --- | --- |
| 1つのメモを1つの Markdown のファイルにする | エディタ、Finder、`grep`、Git、Obsidian でそのまま使える。壊れても1つのメモだけ | 1つの JSON ファイルにまとめる（速いが、1か所壊れると全部読めない）。SQLite（第6部） |
| front matter は、JSON の形で書いて、YAML の一部だけを読む | YAML のパーサを自分で書くのは大変（`yes` が true になる、など）。外部のパッケージを使わない | `yaml` パッケージを使う |
| id は作った時刻。最初の何文字かで指定できる | 並べると作った順になり、名前がぶつかりにくい。打つのは数文字でよい | 連番（消したときに番号が変わる、同時に作ると重なる）。タイトルから作る（日本語だと難しい） |
| 利用者の id をパスに使わず、一覧と照らし合わせる | フォルダの外を読まれない | パスを組み立ててから、フォルダの中かを確かめる（第4部 第19章） |
| `rm` はゴミ箱（`.trash`）に移す | 間違えても戻せる。`rm` の確認と合わせて二重の安全 | 本当に消す（`--force` のときだけ、など） |
| 新しいメモは `link` で作る | 同時に作っても上書きしない。書きかけのファイルが見えない | `wx`（書きかけが残ることがある） |
| エディタはシェルを通さずに起動する | コマンドインジェクションを防ぐ | シェルを通す（空白を含むパスが使えるが、危険） |
| 書き直しの競合は防がない（後から書いた方が勝つ） | 1人で使う CLI では、まず起きない | ロックファイル、`updated` を比べてから書く（楽観的ロック。第6部） |
