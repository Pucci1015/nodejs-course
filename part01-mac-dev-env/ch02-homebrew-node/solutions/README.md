# 第2章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。バージョン番号やパッケージの数は、自分の Mac とその時点の最新版によって変わります。結果に出てくる `alice` は例のユーザー名です。ことわりが無ければ、コマンドは `~/dev/ch02` で打っています。

| ファイル | 内容 |
| --- | --- |
| [my-mac.sh](my-mac.sh) | 問題1 |
| [me.mjs](me.mjs) | 問題5 |
| [share-app-mise.toml](share-app-mise.toml) | 問題9 の `mise.toml` |
| [env-check.sh](env-check.sh) | 問題10 |

解答のファイルを動かすときは、`~/dev/ch02` にコピーしてから動かします。

---

## 基本

### 問題1 自分の Mac を調べるスクリプト

解答: [my-mac.sh](my-mac.sh)

```bash
#!/usr/bin/env bash
echo "CPU: $(uname -m)"
echo "Rosetta: $(sysctl -n sysctl.proc_translated 2> /dev/null)"
echo "brew: $(which brew 2> /dev/null)"
echo "CLT: $(xcode-select -p 2> /dev/null)"
echo "node: $(node -v 2> /dev/null)"
```

| 行 | 期待する値 | 意味 |
| --- | --- | --- |
| `CPU` | `arm64` | Apple Silicon の CPU で、ターミナルがネイティブで動いている（`x86_64` なら Intel の Mac か、Rosetta で動いている） |
| `Rosetta` | `0` | Rosetta で変換されずに動いている（`1` なら Rosetta） |
| `brew` | `/opt/homebrew/bin/brew` | Apple Silicon 用の Homebrew が使われている（`/usr/local/bin/brew` なら Intel 用） |
| `CLT` | `/Library/Developer/CommandLineTools` | Xcode Command Line Tools が入っている |
| `node` | `v24.x.x` など | Node.js が動く |

- `2> /dev/null` を付けたのは、項目が無い・コマンドが無いときのエラーのメッセージを捨て、その行を空にするためです。`set -e` を付けると、1つ失敗したところで止まってしまうので付けていません。
- `Rosetta` が `1` のときは、本文2.2節のとおり「Rosetta を使用して開く」のチェックを外して開き直します。`brew` が `/usr/local/bin/brew` のときは、Intel 用の Homebrew が入っています（本文2.3節）。Apple Silicon 用を入れ直し（本文3節）、PATH の順番を確かめます。

### 問題2 Homebrew の中身を数える

1.

```sh
$ echo "入っているもの: $(brew list | wc -l | tr -d ' ') / 自分で入れたもの: $(brew leaves | wc -l | tr -d ' ')"
入っているもの: 45 / 自分で入れたもの: 8
```

`tr -d ' '` が無いと、Mac の `wc` が数の前に付ける空白がそのまま入り、`入っているもの:       45` のようになります。差は「何かの依存として、自動で入ったパッケージの数」です。

2. 例:

```sh
$ brew deps --tree git
git
├── gettext
│   └── libunistring
└── pcre2
$ brew uses --installed gettext
git
```

`git` しか表示されなければ、`gettext` を使っているのは git だけです。ほかの名前も出れば、複数のパッケージで共有されています。共有されているものは、git を取り除いても残ります（`brew autoremove` は「もう誰にも使われていないもの」だけを取り除きます）。

### 問題3 シンボリックリンクで版を切り替える

```sh
$ mkdir -p ~/dev/ch02/versions
$ echo "版1" > ~/dev/ch02/versions/v1.txt                    # 1.
$ echo "版2" > ~/dev/ch02/versions/v2.txt
$ cd ~/dev/ch02
$ ln -s ~/dev/ch02/versions/v1.txt current.txt               # 2. 実体、リンクの順
$ cat current.txt
版1
$ readlink current.txt
/Users/alice/dev/ch02/versions/v1.txt
$ rm current.txt                                             # 3. リンクだけを消す（実体は残る）
$ ln -s ~/dev/ch02/versions/v2.txt current.txt
$ cat current.txt
版2
$ ls versions
v1.txt	v2.txt
```

- 2 で実体を `versions/v1.txt` と相対パスで書くと、リンクは「リンクのある場所から見た `versions/v1.txt`」を指します。この問題では同じフォルダに置いたので動きますが、別の場所にリンクを置くと読めなくなります。迷ったら、本文4.3節のように `~` から始まるパスで書きます。
- 3 で `rm current.txt` が消すのはリンクだけです。Homebrew が新しい版を入れたときも、`Cellar` の古い版を残したまま、リンクだけを付け替えています。

4.

```sh
$ ls -l /opt/homebrew/bin/mise
lrwxr-xr-x  1 alice  admin  32 11  4 10:00 /opt/homebrew/bin/mise -> ../Cellar/mise/2026.x.x/bin/mise
$ readlink /opt/homebrew/bin/mise
../Cellar/mise/2026.x.x/bin/mise
```

実体は `/opt/homebrew/Cellar/mise/版/bin/mise`（本文4.1節の **Cellar** の中）です。理由は「新しい版を入れたとき、リンクの指す先を変えるだけで済む（古い版に戻すのも簡単）」と「PATH に足すフォルダが `/opt/homebrew/bin` の1つで済む」の2つです。

### 問題4 バージョン番号と LTS を読む

1.

| 前 → 後 | 上がったもの | 動かなくなる心配 |
| --- | --- | --- |
| `v24.10.0` → `v24.11.0` | マイナー（機能の追加） | 基本的に無い |
| `v24.11.0` → `v24.11.1` | パッチ（バグの修正） | 基本的に無い |
| `v24.11.1` → `v26.0.0` | メジャー | **ある**。メジャーが上がるのは、今までのプログラムが動かなくなるかもしれない変更があるとき |

2. 本番で使ってよいのは **Node.js 24（Active LTS）** です。Node.js 22（Maintenance LTS）もセキュリティの修正が出ているので使えますが、サポートが終わる日が近いので、新しく作るものには使いません。Node.js 20 は End-of-Life でセキュリティの修正も出ないので使ってはいけません。Node.js 25 は Current（奇数の版）で、短い期間でサポートが終わるので本番には向きません。
3. 公式の一覧で「Active LTS」の版のコードネームと、`node -p "process.release.lts"` の結果が同じなら、Active LTS を使っています。`undefined` と表示されたら LTS ではないので、`mise use --global node@lts` で LTS にします。

### 問題5 Node.js で自分の環境を表示する

解答: [me.mjs](me.mjs)

```js
console.log(`OS: ${process.platform} / CPU: ${process.arch}`);
console.log(`Node.js: ${process.version}`);

// LTS でなければ process.release.lts は undefined になる（本文7.1節）
if (process.release.lts === undefined) {
  console.log('LTS ではありません');
} else {
  console.log(`LTS: ${process.release.lts}`);
}

// 環境変数は、無ければ undefined（本文7.1節の process.env）
if (process.env.SHOW_PATH !== undefined) {
  console.log(`場所: ${process.execPath}`);
}
```

```sh
$ SHOW_PATH=1 node me.mjs
OS: darwin / CPU: arm64
Node.js: v24.11.0
LTS: Krypton
場所: /Users/alice/.local/share/mise/installs/node/24.11.0/bin/node
```

- `my-app` で動かすと版と LTS のコードネーム（22 は `Jod`）が変わり、`SHOW_PATH=1` を付けると、場所も mise の 22 のフォルダになります。ファイルは同じでも、**どの node で動かしたか**で結果が変わります。
- 環境変数の値は、いつも文字列です。`SHOW_PATH=0` でも `undefined` ではないので表示されます。「`'1'` のときだけ」にしたいなら、`process.env.SHOW_PATH === '1'` と比べます（第5部 第26章で、環境変数を読むときの決まりを学びます）。

---

## 応用

### 問題6 mise でフォルダごとに Node.js を切り替える

```sh
$ mkdir -p ~/dev/ch02/mise-practice/old-app ~/dev/ch02/mise-practice/new-app   # mkdir には2つ並べて書ける
$ cd ~/dev/ch02/mise-practice/old-app && mise use node@22
$ cd ~/dev/ch02/mise-practice/new-app && mise use node@lts
```

2. 結果の例:

| フォルダ | `node -v` | `which node` | `mise current node` | `mise.toml` |
| --- | --- | --- | --- | --- |
| old-app | v22.x.x | `/Users/alice/.local/share/mise/installs/node/22.x.x/bin/node` | 22.x.x | `node = "22"` |
| new-app | v24.x.x | `/Users/alice/.local/share/mise/installs/node/24.x.x/bin/node` | 24.x.x | `node = "lts"` |

3. `old-app/src/deep` では **22** が使われます。mise は、今いるフォルダから**親のフォルダへ向かって** `mise.toml` を探し、最初に見つかった（いちばん近い）ものを使うからです。

```sh
$ mkdir -p ~/dev/ch02/mise-practice/old-app/src/deep && cd ~/dev/ch02/mise-practice/old-app/src/deep
$ node -v
v22.x.x
```

4. `~/dev/ch02/mise-practice` には `mise.toml` が無く、親の `~/dev/ch02`・`~/dev`・`~` にもありません。そのため、全体の設定（`~/.config/mise/config.toml`。本文6.2節の `--global`）の版が使われます。

### 問題7 どの node が動くかを PATH から予想する

1. `/opt/homebrew/bin/node` が動きます。シェルは PATH の**前から順に**探し、最初に見つかったものを使います（第1章10.2節）。`which -a node` の1つ目と同じです。
2. 本文6.7節の表から: `/opt/homebrew/bin/node` は Homebrew（`brew install node`）、`~/.local/share/mise/installs/...` は mise、`/usr/local/bin/node` は公式サイトのインストーラか Intel 用の Homebrew。
3. `brew uninstall node` で Homebrew の node を取り除きます。`/usr/local/bin/node` も使わないなら取り除きます。最後に `which -a node` で、mise のものが1つ目になっていることを確かめます。

この PATH では、mise のフォルダが `/opt/homebrew/bin` より後ろにあるのも原因です。ふつう、mise は PATH の先頭に自分のフォルダを入れます（本文6.4節）。この並びになっているときは、`.zshrc` の `mise activate` の後で、別の設定が PATH の前に `/opt/homebrew/bin` を足していないかも確かめます（`brew shellenv` は `.zprofile` に書く。本文3.3節）。

### 問題8 自分用の Brewfile を作る

結果は自分の環境によって違います。直した例は [../samples/Brewfile.sample](../samples/Brewfile.sample) です。残すかどうかの目安:

| 残す | 消す |
| --- | --- |
| 毎日使うもの、この教材で使うもの（git、gh、mise、VS Code、Chrome など） | 一度試しただけのもの |
| 入れ忘れると困る理由を説明できるもの | 今は使っていない言語の道具一式 |

```sh
$ brew bundle check --file=Brewfile
The Brewfile's dependencies are satisfied.
```

4. **消します**。Node.js は mise で、プロジェクトごとに版を決めて入れるからです（本文5.1節）。Homebrew の node があると、`brew upgrade` で版が勝手に上がり、PATH の順番によっては mise の node の代わりに使われてしまいます（問題7）。

### 問題9 `mise.toml` を手で書いて共有する

1.

```sh
$ mkdir -p ~/dev/ch02/share-app
$ cat > ~/dev/ch02/share-app/mise.toml <<'EOF'
[tools]
node = "22"

[env]
PORT = "4000"
EOF
```

2. 初めて入ると、mise が「信頼されていない」と言い、設定を使いません。

```sh
$ cd ~/dev/ch02/share-app
mise ERROR Config files in ~/dev/ch02/share-app/mise.toml are not trusted.
$ mise trust                   # 中身を確かめてから、信頼する
$ mise install                 # 22 系がまだ無ければ入れる（問題6で入れていれば何もしない）
$ node -v
v22.x.x
$ echo $PORT
4000
```

メッセージの文は、mise の版によって少し違います。

3.

```sh
$ node ../hello.mjs
こんにちは、alice さん
Node.js v22.x.x（arm64）で動いています
$ cd .. && echo "PORT=[$PORT]"
PORT=[]
```

4. 受け取った人は、`cd share-app` → `mise trust` → `mise install` → `node -v` で確かめる、の順に打ちます。`mise.toml` には `[env]` のように環境変数も書けるので、他人が作ったファイルの設定が、確かめないうちに自分のシェルで有効にならないように、最初に一度だけ確かめます。秘密の値（パスワードなど）は `mise.toml` に書きません（第5部 第26章・第10部）。

---

## 発展

### 問題10 開発環境の診断スクリプトを作る

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
$ PATH=/usr/bin:/bin bash env-check.sh; echo $?
[OK] CPU が arm64
[NG] Rosetta で動いているか、調べられません（結果: ）
[NG] brew が /opt/homebrew/bin/brew にありません（見つかった場所: ）
[NG] mise がありません（brew install mise）
[NG] node が mise で入れたものではありません（見つかった場所: ）
[NG] node が LTS ではないか、node がありません
NG があります
1
```

ポイント:

- **`set -e` を使っていません。** 調べるためのコマンドが失敗するのは「NG」という結果で、そこで止まってほしいわけではないからです。
- **見つからないときは結果が空になる**ことを使っています。`which mise` は、mise が無ければ何も出力しません（エラーのメッセージは `2> /dev/null` で捨てています）。変数が空かどうかを `-z` で調べれば、「無い」と判定できます。
- 5 は、`which node` の結果を `grep /mise/` に通しています。含んでいればその行が出力され、含んでいなければ何も出ないので、こちらも空かどうかで判定できます。
- 6 で `node` が無いときは、`node -p` が失敗して結果が空になります。空のときは `undefined` と同じ扱いにして NG にしています。
- 最後の `exit "$result"` で終了ステータスを決めています。`bash env-check.sh && echo 準備完了` のように、`&&` でつなげて使えます（第1章7.2節）。第1部の成果物（dotfiles）で、新しい Mac を整えた後の確かめに使えます。

### 問題11 フックが働かない場面を確かめる

| コマンド | 結果 | 理由 |
| --- | --- | --- |
| `node -v` | v22 | 今の対話シェルでは mise のフックが働き、`old-app/mise.toml` に従って PATH の先頭が 22 になっている |
| `zsh -c 'cd ../new-app && node -v'` | **v22** | 新しい zsh は `.zshrc` を読まないので、mise のフックが登録されない。`cd` しても PATH は変わらず、親から受け継いだ PATH（22）のまま |
| `zsh -ic 'cd ../new-app && node -v'` | v24（今の LTS） | 対話シェルとして起動するので `.zshrc` を読み、フックが登録される。`cd` でフックが働き、`new-app/mise.toml` に従って切り替わる |

ポイントは2つ目です。「PATH に何が入っているか」は親から受け継がれますが、「フォルダごとに切り替える仕組み（フック）」は受け継がれません。

```sh
$ (cd ../new-app && mise exec -- node -v)
v24.x.x
$ pwd                                # ( ) の中で cd したので、元のフォルダのまま
/Users/alice/dev/ch02/mise-practice/old-app
```

スクリプトの中で、プロジェクトの Node.js を確実に使いたいときにも、`mise exec` を使います。
