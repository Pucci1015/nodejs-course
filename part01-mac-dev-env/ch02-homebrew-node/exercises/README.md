# 第2章 練習問題

本文（[../README.md](../README.md)）を読み、Homebrew と mise が使える状態になってから取り組んでください。
模範解答は [../solutions/README.md](../solutions/README.md) にあります。

問題は **基本 → 応用 → 発展** の順に並んでいます。基本は本文のコマンドをそのまま使えば解けます。発展は少し考える問題なので、できなくても次の章に進んでかまいません。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | 自分の Mac を調べる | 2, 3.4 |
| 2 | 基本 | Homebrew の中身を調べる | 4.2 |
| 3 | 基本 | シンボリックリンクを確かめる | 4.3 |
| 4 | 基本 | バージョン番号と LTS を読む | 5.2, 5.3 |
| 5 | 応用 | mise でフォルダごとに Node.js を切り替える | 6.2, 6.3, 6.5 |
| 6 | 応用 | どの node が動くかを PATH から予想する | 4.4, 6.4, 6.7 |
| 7 | 応用 | 自分用の Brewfile を作る | 4.5 |
| 8 | 応用 | プロジェクトの Node.js の版を他の人と共有する | 6.3, 6.5 |
| 9 | 発展 | フックが働かない場面を確かめる | 6.4 |
| 10 | 発展 | 開発環境の診断スクリプトを作る | 2, 3, 6, 7.1 と第1章9節 |

---

## 問題1 自分の Mac を調べる（基本）

次のコマンドを実行し、結果と、その結果が何を意味するかを1行ずつ書いてください。

1. `uname -m`
2. `sysctl -n sysctl.proc_translated`
3. `which brew`
4. `xcode-select -p`
5. 1〜3 の結果から、自分の Mac は「Apple Silicon で、ネイティブで動いていて、Apple Silicon 用の Homebrew が入っている」と言えるか。言えないときは、本文のどの節の対処をすればよいか。

## 問題2 Homebrew の中身を調べる（基本）

1. `brew info mise` を実行し、次の2つを読み取ってください: 最新の版の番号、自分の Mac に入っている版の番号（`Installed` の下）。
2. `brew list | wc -l` と `brew leaves | wc -l` の数を比べてください。差は何の数ですか。
3. `brew deps --tree git` で、git が使っているパッケージを調べてください。その中の1つについて `brew uses --installed パッケージ名` を実行し、git のほかに使っているものがあるかを調べてください。
4. `brew outdated` を実行し、新しい版が出ているものがあるかを確かめてください（ここでは `brew upgrade` はしなくてかまいません）。

## 問題3 シンボリックリンクを確かめる（基本）

1. `ls -l /opt/homebrew/bin/mise` を実行してください。行の最初の文字は何ですか。それは何を表していますか。
2. `readlink /opt/homebrew/bin/mise` で、リンクが指している先を表示してください。その先は、本文4.1節の表のどの場所の中にありますか。
3. Homebrew が、実体をバージョンごとのフォルダに置き、`/opt/homebrew/bin` にはリンクだけを置いているのはなぜですか。本文4.3節から2つ挙げてください。

## 問題4 バージョン番号と LTS を読む（基本）

1. 次のように版が上がったとき、それぞれ「メジャー・マイナー・パッチ」のどれが上がりましたか。また、今まで動いていたプログラムが動かなくなる心配があるのはどれですか。

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

3. 公式のリリース一覧（本文5.2節のリンク）を開き、今の Active LTS の版とコードネームを調べてください。`node -p "process.release.lts"` の結果と比べ、自分の Node.js が LTS かどうかを確かめてください。

## 問題5 mise でフォルダごとに Node.js を切り替える（応用）

1. 次の2つのフォルダを作り、それぞれで別の版の Node.js を使うように設定してください。

   | フォルダ | Node.js |
   | --- | --- |
   | `~/dev/mise-practice/old-app` | 22 |
   | `~/dev/mise-practice/new-app` | 今の LTS |

2. それぞれのフォルダで `node -v`、`which node`、`mise current node` を実行し、結果を表にまとめてください。
3. それぞれのフォルダに、どんなファイルができましたか。`ls` と `cat` で中身を確かめてください。
4. `~/dev/mise-practice/old-app/src/deep` というフォルダを作って移動したとき、どちらの版が使われるかを**予想してから**確かめてください。理由も書いてください（ヒント: 本文6.4節の「親のフォルダへ向かって探す」）。
5. `~/dev/mise-practice` に移動したときは、どの版が使われますか。予想してから確かめてください。

## 問題6 どの node が動くかを PATH から予想する（応用）

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

## 問題7 自分用の Brewfile を作る（応用）

1. `brew bundle dump --file=~/Brewfile --describe` で、今の Mac の Brewfile を作り、`cat ~/Brewfile` で中身を見てください。
2. 中身を VS Code などで開き、**新しい Mac に本当に要るものだけ**が残るように直してください。迷ったものは、残す理由か消す理由を、その行の後ろに `#` のコメントで書いておきます。
3. `brew bundle check --file=~/Brewfile` で、Brewfile のものがすべて入っていることを確かめてください。
4. Brewfile に `brew "node"` の行があったら、消すべきですか。理由も書いてください。

この Brewfile は、第1部の成果物（dotfiles）で使います。

## 問題8 プロジェクトの Node.js の版を他の人と共有する（応用）

問題5 の `old-app` を、Git（第3章）で他の人に渡すことにします。

1. 相手が同じ版の Node.js を使うために、必ず渡す必要があるファイルはどれですか。
2. 相手は、受け取ったフォルダに移動した後、どのコマンドを順に打てばよいですか。それぞれのコマンドの意味も書いてください。
3. 相手が初めてそのフォルダに入ったとき、mise が「信頼しますか」と確かめてくるのはなぜですか。

## 問題9 フックが働かない場面を確かめる（発展）

`~/dev/mise-practice/old-app` で、次の3つを実行し、結果を比べてください。それぞれの結果になる理由を、本文6.4節の言葉で説明してください。

```sh
$ node -v
$ zsh -c 'cd ../new-app && node -v'
$ zsh -ic 'cd ../new-app && node -v'
```

最後に、`old-app` の中から、`new-app` の設定の Node.js で `node -v` を確実に実行するにはどう書けばよいかを答えてください（ヒント: `cd` と `mise exec` を `&&` でつなぐ）。

## 問題10 開発環境の診断スクリプトを作る（発展）

新しい Mac を整えた後や、何かがおかしいときに動かす `env-check.sh` を bash で作ってください。次の項目を順に確かめ、1項目ずつ `[OK]` か `[NG]` を表示します。

| # | 確かめること | 調べ方 |
| --- | --- | --- |
| 1 | CPU が `arm64` | `uname -m` の結果が `arm64` |
| 2 | Rosetta で動いていない | `sysctl -n sysctl.proc_translated` の結果が `0` |
| 3 | `brew` が `/opt/homebrew/bin/brew` にある | `which brew` の結果 |
| 4 | `mise` がある | `which mise` の結果が空でない |
| 5 | `node` が mise で入れたもの | `which node` の結果に `/mise/` が含まれる |
| 6 | `node` が LTS | `node -p "process.release.lts"` の結果が `undefined` ではない |

実行の例:

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
- ある項目が NG でも、残りの項目は確かめ続ける。
- `node` や `mise` が入っていなくても、途中でエラーで止まらない（その項目が NG になる）。

使ってよい書き方（すべて第1章で学んだものです）:

- コマンド置換 `$( )` で、コマンドの結果を変数に入れる（第1章5.3節）
- `if [[ ... ]]; then ... else ... fi` と、`==`・`!=`・`-z`（第1章9.3節、9.4節）
- `| grep 文字` で絞り込む（第1章6.2節）。何も見つからなければ、結果は空になります
- `2> /dev/null` で、エラーのメッセージを捨てる（第1章5.2節）
- `exit 数`（第1章9.4節）

ヒント: 「NG が1つでもあったか」は、最初に `result=0` としておき、NG のときに `result=1` にすると覚えておけます。
