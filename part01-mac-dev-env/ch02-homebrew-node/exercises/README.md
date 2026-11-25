# 第2章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終え、Homebrew と mise と Node.js が使える状態になってから取り組んでください。どの問題も、本文と第1章で打ったコマンドと書き方だけで解けます。

| 段階 | 問題 | ねらい |
| --- | --- | --- |
| 基本 | 1〜5 | 本文の「手を動かす」で打ったコマンドやファイルを、少し変えて自分で書く |
| 応用 | 6〜9 | 本文で学んだことを組み合わせて、フォルダごとの設定や、自分用のファイルを作る |
| 発展 | 10〜11 | 長めのスクリプトや、本文の説明を深く読まないと解けないもの。できなくても、次の章に進んでかまいません |

| 問題 | テーマ | 書くもの | 本文の節 |
| --- | --- | --- | --- |
| 1 | 自分の Mac を調べるスクリプト | `my-mac.sh` | 2, 3.4, 7.1 |
| 2 | Homebrew の中身を数える | 1行のコマンド | 4.2 |
| 3 | シンボリックリンクで版を切り替える | `ln -s` のコマンド | 4.3 |
| 4 | バージョン番号と LTS を読む | （答えを書く） | 5.2, 5.3 |
| 5 | Node.js で自分の環境を表示する | `me.mjs` | 7.1, 7.2 |
| 6 | mise でフォルダごとに Node.js を切り替える | `mise use` のコマンド | 6.2〜6.5 |
| 7 | どの node が動くかを PATH から予想する | （答えを書く） | 4.4, 6.4, 6.7 |
| 8 | 自分用の Brewfile を作る | `Brewfile` | 4.5 |
| 9 | `mise.toml` を手で書いて共有する | `mise.toml` | 6.3, 6.5 |
| 10 | （発展）開発環境の診断スクリプトを作る | `env-check.sh` | 2, 3, 6, 7 と第1章9節 |
| 11 | （発展）フックが働かない場面を確かめる | `mise exec` のコマンド | 6.4 |

模範解答は [../solutions/README.md](../solutions/README.md) にあります。バージョン番号やパッケージの数は、自分の Mac とその時点の最新版によって変わります。

この問題のコマンドは、ことわりが無ければ `~/dev/ch02` で打ちます。自分で書くファイルも `~/dev/ch02` に置きます。

---

## 基本

### 問題1 自分の Mac を調べるスクリプト

本文2〜3節と7.1節のコマンドの結果を、まとめて表示するスクリプト `my-mac.sh` を書いてください。

```sh
$ bash my-mac.sh
CPU: arm64
Rosetta: 0
brew: /opt/homebrew/bin/brew
CLT: /Library/Developer/CommandLineTools
node: v24.11.0
```

- それぞれの値は、コマンド置換 `$( )`（第1章5.3節）で作ります。`node` の行は `node -p` か `node -v` を使います。
- 書けたら結果を1行ずつ見て、自分の Mac が「Apple Silicon で、ネイティブで動いていて、Apple Silicon 用の Homebrew が入っている」と言えるかを答えてください。言えないときは、本文のどの節の対処をすればよいかも答えてください。

### 問題2 Homebrew の中身を数える

1. `brew list` と `brew leaves` の数を、1行のコマンドで次の形に表示してください（数は人によって違います）。

   ```
   入っているもの: 45 / 自分で入れたもの: 8
   ```

   ヒント: `echo "…$(コマンド)…"` の中に、`wc -l | tr -d ' '`（第1章6.2節）で数えた結果を2つ埋め込みます。

2. `brew deps --tree git` で git が使っているパッケージを表示し、その中の1つについて `brew uses --installed パッケージ名` を打って、git のほかに使っているものがあるかを調べてください。

### 問題3 シンボリックリンクで版を切り替える

Homebrew が「リンクの指す先を変えるだけで、版を切り替える」ことを、自分で再現します。

1. `~/dev/ch02/versions` というフォルダを作り、その中に `v1.txt`（中身は `版1`）と `v2.txt`（中身は `版2`）を作ってください。
2. `~/dev/ch02/current.txt` を、`v1.txt` を指すシンボリックリンクにしてください。`cat current.txt` で `版1`、`readlink current.txt` で指す先が表示されることを確かめます。
3. `current.txt` を、`v2.txt` を指すように変えてください（リンクを消してから作り直します）。`v1.txt` が残っていることも確かめます。
4. `ls -l /opt/homebrew/bin/mise` と `readlink /opt/homebrew/bin/mise` を打ち、mise の実体がどこにあるかを答えてください。Homebrew が実体を版ごとのフォルダに置き、`/opt/homebrew/bin` にはリンクだけを置く理由を、本文4.3節から2つ挙げてください。

### 問題4 バージョン番号と LTS を読む

1. 次のように版が上がったとき、それぞれ「メジャー・マイナー・パッチ」のどれが上がりましたか。今まで動いていたプログラムが動かなくなる心配があるのはどれですか。

   | 前 | 後 |
   | --- | --- |
   | `v24.10.0` | `v24.11.0` |
   | `v24.11.0` | `v24.11.1` |
   | `v24.11.1` | `v26.0.0` |

2. 次の版のうち、本番のサーバで使ってよいものはどれですか。理由も書いてください（状態は、ある時点の例です）。

   | 版 | 状態 |
   | --- | --- |
   | Node.js 20 | End-of-Life |
   | Node.js 22 | Maintenance LTS |
   | Node.js 24 | Active LTS |
   | Node.js 25 | Current |

3. 公式のリリース一覧（本文5.2節のリンク）で、今の Active LTS の版とコードネームを調べ、`node -p "process.release.lts"` の結果と比べてください。

### 問題5 Node.js で自分の環境を表示する

本文7.2節の `hello.mjs` を広げて、`me.mjs` を書いてください。

```sh
$ node me.mjs
OS: darwin / CPU: arm64
Node.js: v24.11.0
LTS: Krypton
$ cd my-app && node ../me.mjs        # 本文6.3節の、Node.js 22 のフォルダ
OS: darwin / CPU: arm64
Node.js: v22.x.x
LTS: Jod
```

要件:

- 1行目・2行目は、本文7.1節の表の `process` の値を、テンプレート文字列で埋め込む。
- 3行目は、LTS なら `LTS: コードネーム`、LTS でなければ `LTS ではありません` と表示する。`process.release.lts` は LTS でなければ `undefined` になるので、`if (process.release.lts === undefined) { … } else { … }` で分けます。
- 環境変数 `SHOW_PATH` があるとき（`SHOW_PATH=1 node me.mjs`）だけ、4行目に `場所: （process.execPath の値）` も表示する。

---

## 応用

### 問題6 mise でフォルダごとに Node.js を切り替える

1. 次の2つのフォルダを作り、それぞれで別の版の Node.js を使うように設定してください。

   | フォルダ | Node.js |
   | --- | --- |
   | `~/dev/ch02/mise-practice/old-app` | 22 |
   | `~/dev/ch02/mise-practice/new-app` | 今の LTS |

2. それぞれのフォルダで `node -v`、`which node`、`mise current node` を打ち、結果を表にまとめてください。それぞれのフォルダにできたファイルの中身も `cat` で確かめます。
3. `old-app/src/deep` というフォルダを作って移動したとき、どちらの版が使われるかを**予想してから**確かめてください。理由も書いてください（ヒント: 本文6.4節の「親のフォルダへ向かって探す」）。
4. `~/dev/ch02/mise-practice` に移動したときは、どの版が使われますか。予想してから確かめてください。

### 問題7 どの node が動くかを PATH から予想する

ある人の Mac で、次の結果になりました。

```sh
$ echo $PATH | tr ':' '\n'
/opt/homebrew/bin
/Users/alice/.local/share/mise/installs/node/24.11.0/bin
/usr/local/bin
/usr/bin
/bin
$ which -a node
/opt/homebrew/bin/node
/Users/alice/.local/share/mise/installs/node/24.11.0/bin/node
/usr/local/bin/node
```

1. この人が `node -v` と打つと、どの node が動きますか。理由も書いてください。
2. 3つの node は、それぞれ何で入れたものだと考えられますか（本文6.7節の表）。
3. この人が「mise の node だけを使う」ようにするには、どうすればよいですか。

### 問題8 自分用の Brewfile を作る

本文4.5節で `~/dev/ch02/Brewfile` を作りました（無ければ、同じコマンドで作ります）。

1. エディタで開き（`open -e Brewfile`、または VS Code が入っていれば `code Brewfile`）、**新しい Mac に本当に要るものだけ**が残るように直してください。迷ったものは、残す理由か消す理由を、その行の後ろに `#` のコメントで書きます。
2. この教材で使う `git`・`gh`・`mise`・`visual-studio-code`・`google-chrome` が入っていなければ、行を足してください（書き方は [samples/Brewfile.sample](../samples/Brewfile.sample)）。
3. `brew bundle check --file=Brewfile` で、Brewfile のものがすべて入っていることを確かめてください。足りないと言われたら `brew bundle --file=Brewfile` で入れます。
4. Brewfile に `brew "node"` の行があったら、消すべきですか。理由も書いてください。

この Brewfile は、第1部の成果物（dotfiles）で使います。

### 問題9 `mise.toml` を手で書いて共有する

ほかの人に渡すプロジェクト `~/dev/ch02/share-app` を作ります。今度は `mise use` を使わずに、`mise.toml` を自分で書きます。

1. `~/dev/ch02/share-app/mise.toml` を、ヒアドキュメント（第1章5.3節）で次の内容にしてください。Node.js は 22 系、このフォルダの中でだけ環境変数 `PORT` を `4000` にします（書き方は [samples/mise.toml.sample](../samples/mise.toml.sample)）。
2. `share-app` に移動したとき、mise が何と言うかを確かめてください。必要なコマンドを打って、`node -v` が 22 系、`echo $PORT` が `4000` になるようにします。
3. `share-app` の中で `node ../hello.mjs` を動かし、22 系で動いたことを確かめてください。`share-app` を出ると `PORT` が消えることも確かめます。
4. このフォルダを Git（第3章）でほかの人に渡すとき、受け取った人は、どのコマンドを順に打てばよいですか。最初に一度だけ確かめを求められるのはなぜですか。

---

## 発展

### 問題10 開発環境の診断スクリプトを作る

新しい Mac を整えた後や、何かがおかしいときに動かす `env-check.sh` を書いてください。次の項目を順に確かめ、1項目ずつ `[OK]` か `[NG]` を表示します。

| # | 確かめること | 調べ方 |
| --- | --- | --- |
| 1 | CPU が `arm64` | `uname -m` の結果が `arm64` |
| 2 | Rosetta で動いていない | `sysctl -n sysctl.proc_translated` の結果が `0` |
| 3 | `brew` が `/opt/homebrew/bin/brew` にある | `which brew` の結果 |
| 4 | `mise` がある | `which mise` の結果が空でない |
| 5 | `node` が mise で入れたもの | `which node` の結果に `/mise/` が含まれる |
| 6 | `node` が LTS | `node -p "process.release.lts"` の結果が `undefined` ではない |

```sh
$ bash env-check.sh
[OK] CPU が arm64
[OK] Rosetta で動いていない
[OK] brew が /opt/homebrew/bin/brew にある
[OK] mise がある
[OK] node が mise で入れたもの
[OK] node が LTS（Krypton）
すべて OK です
$ echo $?
0
```

要件:

- 1つでも NG があれば、最後に「NG があります」と表示し、終了ステータスを `1` にする。すべて OK なら「すべて OK です」と表示し、`0` にする。
- ある項目が NG でも、残りの項目は確かめ続ける（だから `set -e` は使いません）。
- `node` や `mise` が入っていなくても、途中でエラーで止まらない（その項目が NG になる）。

使ってよい書き方（すべて第1章で学んだものです）: コマンド置換 `$( )`（5.3節）、`if [[ ... ]]; then ... else ... fi` と `==`・`!=`・`-z`（9.3節）、`| grep 文字`（6.2節。何も見つからなければ結果は空）、`2> /dev/null`（5.2節）、`exit 数`（9.3節）。

ヒント: 「NG が1つでもあったか」は、最初に `result=0` としておき、NG のときに `result=1` にすると覚えておけます。確かめ方: `PATH=/usr/bin:/bin bash env-check.sh; echo $?` と、PATH を狭くして動かすと、brew・mise・node が見つからない場面を作れます（2〜6 が NG で、終了ステータスは 1。`sysctl` は `/usr/sbin` にあるので、2 も NG になります）。

### 問題11 フックが働かない場面を確かめる

`~/dev/ch02/mise-practice/old-app` で、次の3つを実行し、結果を比べてください。それぞれの結果になる理由を、本文6.4節の言葉で説明してください。

```sh
$ node -v
$ zsh -c 'cd ../new-app && node -v'
$ zsh -ic 'cd ../new-app && node -v'
```

最後に、`old-app` の中から、`new-app` の設定の Node.js で `node -v` を確実に実行するコマンドを1行で書いてください（ヒント: `cd` と `mise exec` を `&&` でつなぐ。第1章7.2節の `( )` を使うと、元のフォルダから動きません）。
