# 第2章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。バージョン番号やパッケージの数は、各自の Mac とその時点の最新版によって変わります。結果に出てくる `alice` は例のユーザー名です。

| ファイル | 内容 |
| --- | --- |
| [env-check.sh](env-check.sh) | 問題10 |

---

## 問題1 自分の Mac を調べる

| コマンド | 結果の例 | 意味 |
| --- | --- | --- |
| `uname -m` | `arm64` | Apple Silicon の CPU で、ターミナルがネイティブで動いている（`x86_64` なら Intel の Mac か、Rosetta で動いている） |
| `sysctl -n sysctl.proc_translated` | `0` | Rosetta で変換されずに動いている（`1` なら Rosetta） |
| `which brew` | `/opt/homebrew/bin/brew` | Apple Silicon 用の Homebrew が使われている（`/usr/local/bin/brew` なら Intel 用） |
| `xcode-select -p` | `/Library/Developer/CommandLineTools` | Xcode Command Line Tools が入っている |

5. 上の表の結果になっていれば「言える」です。
   - `sysctl` が `1` のときは、本文2.2節のとおり「Rosetta を使用して開く」のチェックを外して、ターミナルを開き直します。
   - `which brew` が `/usr/local/bin/brew` のときは、Intel 用の Homebrew が入っています（本文2.3節）。Apple Silicon 用の Homebrew を入れ直し（本文3節）、PATH の順番を確かめます。

## 問題2 Homebrew の中身を調べる

1. `brew info mise` の1行目の `stable 2026.x.x` が最新の版です。`Installed` の下の行のパス（`/opt/homebrew/Cellar/mise/2026.x.x`）の最後の部分が、入っている版です。2つが違えば、新しい版が出ています。
2. `brew list` は依存で入ったものも含むすべて、`brew leaves` は自分で入れたもの（ほかのパッケージから使われていないもの）です。差は「何かの依存として、自動で入ったパッケージの数」です。
3. 例:

   ```sh
   $ brew deps --tree git
   git
   ├── gettext
   │   └── libunistring
   └── pcre2
   $ brew uses --installed gettext
   git
   ```

   `git` しか表示されなければ、`gettext` を使っているのは git だけです。ほかの名前も表示されれば、複数のパッケージで共有されています。共有されているものは、git を取り除いても残ります（`brew autoremove` は「もう誰にも使われていないもの」だけを取り除きます）。
4. 何も表示されなければ、すべて最新です。表示されたら、`brew upgrade` で更新できます。

## 問題3 シンボリックリンクを確かめる

```sh
$ ls -l /opt/homebrew/bin/mise
lrwxr-xr-x  1 alice  admin  32 11  4 10:00 /opt/homebrew/bin/mise -> ../Cellar/mise/2026.x.x/bin/mise
$ readlink /opt/homebrew/bin/mise
../Cellar/mise/2026.x.x/bin/mise
```

1. 最初の文字は `l` で、シンボリックリンクであることを表しています（ファイルなら `-`、フォルダなら `d`）。
2. `/opt/homebrew/bin` から1つ上（`..`）の `Cellar` の中なので、`/opt/homebrew/Cellar/mise/版/bin/mise` です。本文4.1節の表の **Cellar** の中にあります。
3. 理由:
   - 新しい版を入れたとき、リンクの指す先を変えるだけで済む（古い版に戻すのも簡単）
   - PATH に足すフォルダが `/opt/homebrew/bin` の1つで済む

## 問題4 バージョン番号と LTS を読む

1. 上がったもの:

   | 前 → 後 | 上がったもの | 動かなくなる心配 |
   | --- | --- | --- |
   | `v24.10.0` → `v24.11.0` | マイナー（機能の追加） | 基本的に無い |
   | `v24.11.0` → `v24.11.1` | パッチ（バグの修正） | 基本的に無い |
   | `v24.11.1` → `v26.0.0` | メジャー | **ある**。メジャーが上がるのは、今までのプログラムが動かなくなるかもしれない変更があるとき |

2. 本番で使ってよいのは **Node.js 24（Active LTS）** です。Node.js 22（Maintenance LTS）も、セキュリティの修正が出ているので使えますが、サポートが終わる日が近いので、新しく作るものには使いません。
   - Node.js 20 は End-of-Life で、セキュリティの修正も出ないので使ってはいけません。
   - Node.js 25 は Current（奇数の版）で、短い期間でサポートが終わるので、本番には向きません。
3. 公式の一覧で「Active LTS」と書かれた版のコードネームと、`node -p "process.release.lts"` の結果が同じなら、LTS を使っています。`undefined` と表示されたら LTS ではないので、`mise use --global node@lts` で LTS にします。

## 問題5 mise でフォルダごとに Node.js を切り替える

```sh
$ mkdir -p ~/dev/mise-practice/old-app ~/dev/mise-practice/new-app   # mkdir には、作るフォルダを2つ並べて書ける
$ cd ~/dev/mise-practice/old-app
$ mise use node@22
$ cd ~/dev/mise-practice/new-app
$ mise use node@lts
```

2. 結果の例:

   | フォルダ | `node -v` | `which node` | `mise current node` |
   | --- | --- | --- | --- |
   | old-app | v22.x.x | `/Users/alice/.local/share/mise/installs/node/22.x.x/bin/node` | 22.x.x |
   | new-app | v24.x.x | `/Users/alice/.local/share/mise/installs/node/24.x.x/bin/node` | 24.x.x |

3. どちらのフォルダにも `mise.toml` ができています。

   ```sh
   $ cd ~/dev/mise-practice/old-app
   $ ls
   mise.toml
   $ cat mise.toml
   [tools]
   node = "22"
   ```

   `new-app` の `mise.toml` は `node = "lts"` です。

4. `old-app/src/deep` では **22** が使われます。mise は、今いるフォルダから**親のフォルダへ向かって** `mise.toml` を探し、最初に見つかった（いちばん近い）ものを使うからです。`src/deep` と `src` には `mise.toml` が無いので、さかのぼって `old-app/mise.toml` が見つかります。

   ```sh
   $ mkdir -p ~/dev/mise-practice/old-app/src/deep && cd ~/dev/mise-practice/old-app/src/deep
   $ node -v
   v22.x.x
   ```

5. `~/dev/mise-practice` には `mise.toml` が無く、さらに親の `~/dev` や `~` にもありません。そのため、全体の設定（`~/.config/mise/config.toml`。本文6.2節の `--global`）の版が使われます。

## 問題6 どの node が動くかを PATH から予想する

1. `/opt/homebrew/bin/node` が動きます。シェルは PATH の**前から順に**探し、最初に見つかったものを使います（第1章10.2節）。`which -a node` の1つ目と同じです。
2. 本文6.7節の表から:
   - `/opt/homebrew/bin/node`: Homebrew（`brew install node`）
   - `~/.local/share/mise/installs/...`: mise
   - `/usr/local/bin/node`: 公式サイトのインストーラ、または Intel 用の Homebrew
3. `brew uninstall node` で Homebrew の node を取り除きます。`/usr/local/bin/node` も使わないなら取り除きます（残っていても、PATH で mise のフォルダの方が前にあるので、mise の node が使われます）。最後に `which -a node` で、mise のものが1つ目になっていることを確かめます。

   この PATH では、mise のフォルダが `/opt/homebrew/bin` より後ろにあるのが原因です。ふつう、mise は PATH の先頭に自分のフォルダを入れます（本文6.4節）。この並びになっているときは、`.zshrc` の `mise activate` の後で、別の設定が PATH の前に `/opt/homebrew/bin` を足していないかも確かめます。

## 問題7 自分用の Brewfile を作る

1〜3 は、各自の環境によって結果が違います。直した例は [../samples/Brewfile.sample](../samples/Brewfile.sample) を見てください。残すかどうかの目安:

| 残す | 消す |
| --- | --- |
| 毎日使うもの、この教材で使うもの（git、mise、VS Code など） | 一度試しただけのもの |
| 入れ忘れると困る理由を説明できるもの | 今は使っていない言語の道具一式 |

4. **消します**。Node.js は mise で、プロジェクトごとに版を決めて入れるからです（本文5.1節）。Homebrew の node があると、`brew upgrade` で版が勝手に上がり、PATH の順番によっては mise の node の代わりに使われてしまいます（問題6）。

## 問題8 プロジェクトの Node.js の版を他の人と共有する

1. `mise.toml` です。Git でコミットして渡します。
2. 相手が打つコマンド:

   ```sh
   $ cd old-app
   $ mise trust      # このフォルダの mise.toml を信頼する
   $ mise install    # mise.toml に書かれた版の Node.js を入れる
   $ node -v         # 22 系になっていることを確かめる
   ```

3. `mise.toml` には、使う道具の版だけでなく、環境変数なども書けるからです（[../samples/mise.toml.sample](../samples/mise.toml.sample) の `[env]`）。他人が作ったファイルの設定が、確かめないうちに自分のシェルで有効にならないように、最初に一度だけ確かめます。

## 問題9 フックが働かない場面を確かめる

| コマンド | 結果 | 理由 |
| --- | --- | --- |
| `node -v` | v22 | 今の対話シェルでは mise のフックが働き、`old-app/mise.toml` に従って PATH の先頭が 22 になっている |
| `zsh -c 'cd ../new-app && node -v'` | **v22** | 新しい zsh は `.zshrc` を読まないので、mise のフックが登録されない。`cd` しても PATH は変わらず、親から受け継いだ PATH（22）のまま |
| `zsh -ic 'cd ../new-app && node -v'` | v24（今の LTS） | 対話シェルとして起動するので `.zshrc` を読み、`mise activate` でフックが登録される。`cd` でフックが働き、`new-app/mise.toml` に従って切り替わる |

ポイントは2つ目です。「PATH に何が入っているか」は親から受け継がれますが、「フォルダごとに切り替える仕組み（フック）」は受け継がれません。

フックに頼らずに、そのフォルダの設定の Node.js を確実に使うには `mise exec` を使います。

```sh
$ cd ../new-app && mise exec -- node -v
v24.x.x
```

スクリプトの中で、プロジェクトの Node.js を使いたいときにも、この書き方をします。

## 問題10 開発環境の診断スクリプトを作る

解答: [env-check.sh](env-check.sh)

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

ポイント:

- **`set -e` を使っていません。** このスクリプトは、調べるためにコマンドを実行し、失敗したら NG として扱います。失敗するたびに止まっては困るからです。
- **見つからないときは結果が空になる**ことを使っています。`which mise` は、mise が無ければ何も出力しません（エラーのメッセージは `2> /dev/null` で捨てています）。結果を入れた変数が空かどうかを `-z` で調べれば、「無い」と判定できます。
- 5 は、`which node` の結果を `grep /mise/` に通しています。`/mise/` を含んでいれば、その行がそのまま出力され、含んでいなければ何も出力されません。こちらも、空かどうかで判定できます。
- 6 で、`node` が無いときは `node -p` が失敗して結果が空になります。空のときは `undefined` と同じ扱いにして、NG にしています。
- 最後に `exit "$result"` で、終了ステータスを決めています。`bash env-check.sh && echo 準備完了` のように、ほかのコマンドと `&&` でつなげて使えます（第1章7.2節）。

このスクリプトは、第1部の成果物（dotfiles）で、新しい Mac を整えた後の確かめに使えます。
