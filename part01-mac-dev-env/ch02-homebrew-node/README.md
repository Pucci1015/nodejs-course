# 第2章 Homebrew と Node.js のインストール

この章では、Mac に開発用のソフトウェアを入れる仕組み（Homebrew）と、Node.js をプロジェクトごとに使い分ける仕組み（mise）を、実際に入れながら整えます。
既にインストール済みの場合も、**「どこに」「どのように」入っているか**を、コマンドで確かめながら読んでください。新しい Mac を用意したときや、何かが壊れたときに、この章の手順をそのまま使えるように書いています。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 2〜3時間（ダウンロード時間を除く） |
| 前提 | 第1章（コマンドとオプションの形、パイプ、リダイレクト、PATH、`.zprofile` と `.zshrc` の違い、短いシェルスクリプト） |
| この章のゴール | Homebrew と mise の仕組みを説明できる / プロジェクトごとに Node.js のバージョンを固定できる / 「どの node が動いているか」を自分で確かめられる / Node.js で短いプログラムを動かせる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | Brewfile の例、環境を確認するスクリプト、mise の設定例、本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 「**手を動かす**」の所は、実際に打って動かしてください。練習問題は、そこで打ったコマンドや書いたファイルを広げていく問題です。
> - 実習は `~/dev/ch02/` で行います（第1章2.5節）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします。
>
>   ```sh
>   $ mkdir -p ~/dev/ch02 && cd ~/dev/ch02
>   $ cp -R （ここに Finder から samples と exercises のフォルダをドラッグ） .
>   $ ls
>   exercises	samples
>   ```
>
>   `cp -R ` まで打ってから、Finder で教材の `part01-mac-dev-env/ch02-homebrew-node` を開き、`samples` と `exercises` の2つのフォルダをターミナルにドラッグし、最後に ` .` を打って Return を押します。
> - インストールのコマンド（`brew install` など）は、どこで打っても同じです。ファイルを作るコマンドは `~/dev/ch02` で打ちます。
> - 既に Homebrew と Node.js が入っている人へ: 3節と6.1〜6.2節のインストールは、確かめのコマンド（`which brew`、`node -v` など）だけ打てばかまいません。2節、4.3節、6.3節以降、7節は、すべて打ちながら読んでください。
> - 結果に出てくる `alice` は例のユーザー名です。バージョンの数字（`24.x.x` など）は、時期によって変わります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場所 |
| --- | --- |
| `brew install`（3〜4節） | 道具が必要になるたびに使います。第2部 第8章では `brew install mkcert` で HTTPS の練習用の道具を入れます |
| シンボリックリンク（4.3節） | 第1部の成果物（dotfiles）で、`~/.zshrc` などを Git のリポジトリのファイルにつなぐのに使います |
| Brewfile（4.5節） | 第1部の成果物（dotfiles）で、「この Mac に入れるもの」の一覧として Git で管理します |
| LTS（5節） | 第3部以降のすべての部で「Node.js 24 以降の LTS」を前提にします。どの版を使えばよいかを自分で判断できるようにします |
| `mise use node@24` と `mise.toml`（6.3節） | 第3部以降の成果物を作り始めるとき、最初に打つコマンドです。プロジェクトの Node.js の版を固定します |
| 切り替えの正体は PATH（6.4節） | 「`node` のバージョンが思ったものと違う」ときの原因の調べ方です。第1章10.2節の PATH の知識をそのまま使います |
| `npm` と `npx`（6.6節） | 第3部 第14章からライブラリを入れるのに毎日使います |
| `node ファイル名`・`node -e`・`node -p`（7.2節） | 第2部から、すべての章でプログラムを動かすのに使います。`node --watch` は第4部で、保存のたびにサーバを動かし直すのに使います |

---

## 1. パッケージマネージャとは

### 1.1 なぜ必要か

アプリやコマンドを Web サイトから手作業で入れると、「どこに何を入れたか分からなくなる」「新しい版に気づかない」「そのツールが使う別のライブラリ（**依存関係**）も自分で探して入れる必要がある」といった問題が起きます。

**パッケージマネージャ**は、これらをまとめて引き受ける道具です。「〇〇を入れて」と1行で頼むと、ダウンロード、決まった場所への配置、依存関係のインストールまで済ませてくれます。ソフトウェアをまとめたものを**パッケージ**と呼びます。

Flask を使ったことがあれば、`pip install flask` を打ったはずです。pip は Python 用のパッケージマネージャで、Flask が使っている Werkzeug（リクエストを受け取る部分）や Jinja2（テンプレート）も一緒に入れてくれていました。同じ考え方です。

### 1.2 この教材で使う3つのパッケージマネージャ

| 道具 | 管理するもの | 例 | Python での対応 |
| --- | --- | --- | --- |
| Homebrew | Mac 全体で使うコマンドやアプリ | git、mise、VS Code | （OS 全体のパッケージ管理） |
| mise | 言語のランタイム（実行するためのプログラム）のバージョン | Node.js 22 と 24 の切り替え | pyenv |
| npm | プロジェクトが使うライブラリ | Express、React | pip と venv |

npm は第3部で扱います。この章では Homebrew と mise を扱います。

## 2. Apple Silicon と Intel の違い

### 2.1 手を動かす: CPU の種類を調べる

Mac の CPU（計算をする部品）には2つの種類があります。プログラムは CPU ごとに別々に作られる（CPU が理解する命令が違う）ので、この違いが、インストール先やうまく動かないときの原因に関係します。

| Mac | CPU の種類（アーキテクチャ） |
| --- | --- |
| Apple Silicon（M1 以降）の Mac | **arm64** |
| それ以前の Intel の Mac | **x86_64** |

```sh
$ uname -m              # uname は OS の情報を表示する。-m は CPU の種類（machine）
arm64                   # Apple Silicon で、ネイティブ（そのまま）で動いている
```

### 2.2 手を動かす: Rosetta で動いていないか調べる

Apple Silicon の Mac は、Intel 用のプログラムを **Rosetta 2** という変換の仕組みで動かせます。便利ですが、**ターミナル自体が Rosetta で動いている**と、そこから入れるものがすべて Intel 用になってしまうことがあります。

```sh
$ sysctl -n sysctl.proc_translated
0        # ネイティブで動いている（正常）
```

| 部分 | 意味 |
| --- | --- |
| `sysctl 項目` | OS の設定の値を読むコマンド |
| `sysctl.proc_translated` | 「このプログラムは Rosetta で変換されて動いているか」を表す項目 |
| `-n` | 値だけを表示する（付けないと `sysctl.proc_translated: 0` と、項目の名前も付く） |

結果が `1` なら Rosetta で動いています。Finder で「アプリケーション」→「ユーティリティ」→「ターミナル」を選んで `⌘ + I`（情報を見る）を開き、「Rosetta を使用して開く」のチェックを外して、ターミナルを開き直します。Intel の Mac では、この項目が無いので `unknown oid` というエラーになります。

### 2.3 Homebrew のインストール先

| Mac | Homebrew の場所 | コマンドの場所 |
| --- | --- | --- |
| Apple Silicon | `/opt/homebrew` | `/opt/homebrew/bin` |
| Intel（または Rosetta） | `/usr/local` | `/usr/local/bin` |

Apple Silicon の Mac に `/usr/local/bin/brew` があるときは、過去に Rosetta を通したり、Intel の Mac から引っ越したりして、Intel 用の Homebrew が入った可能性があります。2つが混ざると同じコマンドが2つ入り、PATH の順番（第1章10.2節）しだいでどちらが動くかが変わります。

[samples/check-arch.sh](samples/check-arch.sh) は、ここまでの項目と、Homebrew と node の場所をまとめて表示します。

```sh
$ cd ~/dev/ch02
$ bash samples/check-arch.sh
OS:            Darwin 25.1.0
macOS:         26.1
アーキテクチャ: arm64
Rosetta:       0  (0=ネイティブ, 1=Rosetta)
brew:          /opt/homebrew/bin/brew
brew --prefix: /opt/homebrew
node:          /Users/alice/.local/share/mise/installs/node/24.x.x/bin/node
```

## 3. Homebrew のインストール

公式サイト: https://brew.sh/ja/

### 3.1 Xcode Command Line Tools

Homebrew は **Xcode Command Line Tools**（以下 CLT）を必要とします。プログラムを組み立てる道具（コンパイラ）や git などをまとめたもので、Xcode 本体は要りません。

```sh
$ xcode-select -p                 # -p: CLT の場所を表示する（print path）。入っていれば表示される
/Library/Developer/CommandLineTools
$ xcode-select --install          # 入っていなければインストールする（ダイアログが出る）
```

Homebrew のインストーラは、CLT が無ければ自動で入れようとするので、この手順は省いてもかまいません。macOS の大きなアップデートの後に `xcrun: error: invalid active developer path` と出たときは、`xcode-select --install` で入れ直すと直ります。

### 3.2 手を動かす: インストールのコマンドを読んでから動かす

公式サイトに書かれている1行を、ターミナルに貼り付けて実行します（下は執筆時点のものです。**必ず公式サイトで最新のコマンドを確かめてください**）。

```sh
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

長く見えますが、第1章の知識で読めます。

| 部分 | 意味 |
| --- | --- |
| `curl URL` | URL の中身をダウンロードして、stdout（第1章5節）に出すコマンド。ここではインストール用のシェルスクリプトを取ってくる |
| `-fsSL` | `-f -s -S -L` をまとめたもの（第1章1.3節）。`-f`: サーバがエラーを返したら失敗にする（fail）、`-s`: 進み具合を表示しない（silent）、`-S`: ただしエラーは表示する（show error）、`-L`: 「別の URL へ移動して」と言われたら、ついていく（location） |
| `"$( ... )"` | コマンド置換（第1章5.3節）。中のコマンドの出力を、1つの文字列にする |
| `/bin/bash -c 文字列` | 次の文字列を、スクリプトとして実行する（command） |

つまり「インターネットからスクリプトを取ってきて、その場で bash で実行する」コマンドです。便利な反面、**信頼できる配布元のものだけを実行する**必要があります。心配なときは、先に保存して読んでから実行できます。

```sh
$ cd ~/dev/ch02
$ curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh > install.sh   # 保存する
$ head -n 20 install.sh                                                                        # 最初を読む
$ bash install.sh                                                                              # 実行する
```

途中で Mac のログインのパスワードを聞かれます（`/opt/homebrew` を作るためです）。打っても画面に表示されませんが、そのまま打って Return を押します。

### 3.3 手を動かす: PATH を設定する

インストールの最後に「Next steps」として、PATH を設定するコマンドが表示されます。Apple Silicon では次の内容です。

```sh
$ echo >> ~/.zprofile                                              # ~/.zprofile の最後に空の行を1行足す
$ echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile   # この1行を足す
$ eval "$(/opt/homebrew/bin/brew shellenv)"                        # 今のシェルにも、すぐに効かせる
```

- `>>` はファイルの最後に書き足すリダイレクトです（第1章5.2節）。PATH の設定なので `~/.zprofile` に書きます（第1章11.1節）。
- 2行目はシングルクォート（第1章4.3節）なので、`eval "$(...)"` という文字がそのまま書き込まれます。
- 第1部の成果物（dotfiles）を作った後は、`~/.zprofile` はリポジトリのファイルを指すリンクです。そのときはリポジトリの `zprofile` を書き換えます。

`brew shellenv` は、「PATH などを設定するコマンド」を**文字として出力する**コマンドで、`eval` は、受け取った文字をシェルのコマンドとして実行する組み込みコマンドです。`eval` を付けずに動かすと、何を設定しているかが見えます。

```sh
$ /opt/homebrew/bin/brew shellenv
export HOMEBREW_PREFIX="/opt/homebrew";
export HOMEBREW_CELLAR="/opt/homebrew/Cellar";
export HOMEBREW_REPOSITORY="/opt/homebrew";
fpath[1,0]="/opt/homebrew/share/zsh/site-functions";
eval "$(/usr/bin/env PATH_HELPER_ROOT="/opt/homebrew" /usr/libexec/path_helper -s)"
...
```

`export` で環境変数を設定し（第1章10.1節）、最後の行で PATH に `/opt/homebrew/bin` を足しています。

### 3.4 手を動かす: 入ったことを確かめる

```sh
$ which brew               # brew がどこにあるか（第1章10.2節）
/opt/homebrew/bin/brew
$ brew --version
Homebrew 4.x.x
$ brew doctor              # 問題が無いか診断する
Your system is ready to brew.
```

`brew doctor` は、問題を見つけると説明と直し方を英語で表示します。何か出たら、まずその文章を読みましょう（警告の多くは、実害のないものです）。

## 4. Homebrew を使う

### 4.1 用語

`brew` のコマンドは `brew 動詞 パッケージ名` の形です（`brew install git` なら「git を入れる」）。

| 用語 | 意味 |
| --- | --- |
| formula（フォーミュラ） | ターミナルで使うコマンドのパッケージ。例: `git`、`mise` |
| cask（カスク） | 画面のあるアプリ（GUI アプリ）のパッケージ。例: `visual-studio-code`、`google-chrome` |
| bottle（ボトル） | ビルド済み（すぐ動かせる形に組み立て済み）のパッケージ。これがあると、手元で組み立てずにすぐ入る |
| Cellar（セラー） | formula の実体が入る場所（`/opt/homebrew/Cellar/パッケージ名/バージョン/`） |

### 4.2 手を動かす: よく使うコマンド

まず `tree`（フォルダの中身を木の形で表示するコマンド）を入れて、使ってみます。

```sh
$ brew info tree                           # 説明、バージョン、入っているか
$ brew install tree                        # formula を入れる
$ cd ~/dev/ch02 && tree samples            # 使ってみる
samples
├── Brewfile.sample
├── README.md
...
$ brew list | wc -l                        # 入っているもの（依存で入ったものも含む）の数（第1章6.2節）
      45
$ brew leaves | wc -l                      # 自分で入れたもの（ほかから使われていないもの）の数
       8
```

差の 37 は「何かの依存として、自動で入ったものの数」です。

| コマンド | 意味 |
| --- | --- |
| `brew search 言葉` | 名前にその言葉を含むパッケージを探す |
| `brew info 名前` | 説明、バージョン、依存関係、入っているか |
| `brew install 名前` / `brew install --cask 名前` | formula を入れる / GUI アプリ（cask）を入れる |
| `brew list` / `brew leaves` | 入っているもの全部 / 自分で入れたもの |
| `brew update` | Homebrew 自身と、パッケージの一覧を新しくする |
| `brew outdated` / `brew upgrade` | 新しい版が出ているもの / すべてを新しい版にする（`brew upgrade git` なら git だけ） |
| `brew uninstall 名前` | 取り除く |
| `brew deps --tree 名前` | そのパッケージが使っているものを、木の形で（`--tree`） |
| `brew uses --installed 名前` | そのパッケージを使っているもののうち、入っているもの |
| `brew autoremove` / `brew cleanup` | もう誰にも使われていない依存を取り除く / 古い版やダウンロードの残りを消す |

```sh
$ brew deps --tree git
git
├── gettext
│   └── libunistring
└── pcre2
```

### 4.3 手を動かす: シンボリックリンクを見る・作る

Homebrew は、パッケージの実体を Cellar の「バージョンごとのフォルダ」に入れ、`/opt/homebrew/bin` には、そこを指す**シンボリックリンク**を置きます。シンボリックリンクは、別のファイルの場所を指す小さなファイルです（Finder の「エイリアス」に近いものです）。

```sh
$ ls -l /opt/homebrew/bin/tree
lrwxr-xr-x  1 alice  admin  30 11  4 10:00 /opt/homebrew/bin/tree -> ../Cellar/tree/2.2.1/bin/tree
$ readlink /opt/homebrew/bin/tree          # リンクが指している先だけを表示する
../Cellar/tree/2.2.1/bin/tree
```

- `ls -l` の最初の文字 `l` が、シンボリックリンク（link）の印です（第1章8.1節）。`->` の右側が指している先で、`..` は1つ上のフォルダです（第1章2.2節）。
- こうしておくと、新しい版を入れたときはリンクの指す先を変えるだけで済み、PATH に足すフォルダも `/opt/homebrew/bin` の1つで済みます。

自分でもリンクを作ってみます。`ln -s 実体 リンクを置く場所` で作ります（`ln` はリンクを作るコマンド、`-s` はシンボリックリンク）。**1つ目が実体、2つ目がリンク**です。

```sh
$ cd ~/dev/ch02
$ echo "版1" > real.txt
$ ln -s ~/dev/ch02/real.txt link.txt       # 実体はホームから始まるパスで書く
$ ls -l link.txt
lrwxr-xr-x  1 alice  staff  31 11  7 10:00 link.txt -> /Users/alice/dev/ch02/real.txt
$ cat link.txt                             # リンクを読むと、実体の中身が出る
版1
$ echo "版2" > real.txt                    # 実体を書き換える
$ cat link.txt
版2
$ rm link.txt                              # リンクを消しても、実体は残る
$ cat real.txt
版2
```

この仕組みは、第1部の成果物（dotfiles）で、`~/.zshrc` を Git のリポジトリのファイルにつなぐのに使います。

### 4.4 git は Homebrew で入れ直すべきか

CLT にも git が入っていて、`/usr/bin/git` として使えます。Apple が配っているものは更新が遅めなので、新しい機能を使いたいときは `brew install git` で Homebrew の版を入れます。PATH で `/opt/homebrew/bin` が `/usr/bin` より前にあれば、Homebrew の版が使われます。

```sh
$ which -a git            # -a: PATH の中で見つかる git をすべて（第1章10.2節）
/opt/homebrew/bin/git     # ← 1つ目が使われる
/usr/bin/git
```

### 4.5 手を動かす: Brewfile で環境を記録する

**Brewfile** は「この Mac に入れたいもの」の一覧を書くファイルです。新しい Mac で `brew bundle` を1回動かすだけで、同じものをまとめて入れられます。1行に1つ、次の形で書きます。

```ruby
brew "git"                    # formula（コマンド）
cask "visual-studio-code"     # cask（GUI アプリ）
```

今の Mac から作って、中身を見てみます。

```sh
$ cd ~/dev/ch02
$ brew bundle dump --file=Brewfile --describe     # 今入っているものから Brewfile を作る
$ cat Brewfile
# Simple, fast and user-friendly alternative to find
brew "fd"
...
$ brew bundle check --file=Brewfile               # Brewfile のものが、すべて入っているか
The Brewfile's dependencies are satisfied.
```

| コマンド・オプション | 意味 |
| --- | --- |
| `brew bundle dump` | 今入っているもの（自分で入れたもの）から Brewfile を作る。依存で入ったものは書かれない（`brew bundle` が自動で入れるため） |
| `brew bundle check` | Brewfile のものが、すべて入っているか確かめる |
| `brew bundle` | Brewfile のものを、すべて入れる |
| `--file=パス` | どの Brewfile を使うか |
| `--describe` | `dump` のとき、各行に説明のコメントを付ける |

例は [samples/Brewfile.sample](samples/Brewfile.sample) にあります。自分用の Brewfile は、練習問題8で作ります。

## 5. Node.js のバージョンと LTS

### 5.1 なぜバージョン管理の道具を使うのか

`brew install node` でも Node.js は入りますが、この教材では使いません。

- Homebrew は「最新の版」を入れる道具です。`brew upgrade` のたびに Node.js の大きな版（22 から 24 など）が上がり、動いていたプロジェクトが動かなくなることがあります
- 実際の開発では「このプロジェクトは 22、あちらは 24」のように、**プロジェクトごとに使う版が違う**ことがあります
- チームの全員（と、本番のサーバや CI）で、同じ版を使いたい

Flask で開発したとき、プロジェクトごとに venv（そのプロジェクト専用のライブラリの置き場）を作ったかもしれません。ここでは同じことを、**Node.js 自体の版**について行います（Python で言うと、pyenv で Python の版を選ぶことに当たります）。

Node.js の版を切り替える道具には nvm、fnm、Volta、mise などがあります。この教材では **mise**（ミーズ）を使います。Node.js 以外も同じ方法で管理でき、動きが速いからです。

### 5.2 リリースの種類と LTS

Node.js は毎年、新しい**メジャーバージョン**（`v22`、`v24` の数字の部分）を出しています。

| 状態 | 意味 |
| --- | --- |
| Current | 出たばかりの版。新しい機能が入るが、変更も多い |
| Active LTS | 長期サポート版（Long Term Support）。安定していて、本番で使うのに向く |
| Maintenance LTS | 重要なバグの修正と、セキュリティの修正だけが入る期間 |
| End-of-Life（EOL） | サポートが終わった版。セキュリティの修正も出ないので**使ってはいけない** |

これまでは、**偶数のメジャーバージョンが LTS になり、約30か月サポートされる**決まりでした（奇数は Current のまま、短い期間で終わります）。LTS には `Jod`（v22）、`Krypton`（v24）のようなコードネームが付きます。

**この教材では、その時点の Active LTS を使います。** どの版が LTS かは時期によって変わり、リリースの方針自体が見直されることもあるので、必ず公式の一覧で確かめてください。

- 公式のリリース一覧: https://nodejs.org/en/about/previous-releases

### 5.3 バージョン番号の読み方

バージョン番号は `v24.11.0` のように、`メジャー.マイナー.パッチ` の3つの数字です。

| 部分 | 例 | 上がるとき |
| --- | --- | --- |
| メジャー | `24` | 今までのプログラムが動かなくなるかもしれない、大きな変更 |
| マイナー | `11` | 機能の追加（今までのプログラムはそのまま動く） |
| パッチ | `0` | バグの修正 |

この決まりを**セマンティックバージョニング**と呼びます。npm のライブラリも同じ決まりで番号を付けます（第3部 第14章）。

## 6. mise で Node.js を入れる

公式ドキュメント: https://mise.jdx.dev/

### 6.1 手を動かす: mise を入れて有効にする

```sh
$ brew install mise
$ mise --version
2026.x.x macos-arm64
$ echo 'eval "$(mise activate zsh)"' >> ~/.zshrc    # ~/.zshrc の最後に1行足す
$ source ~/.zshrc                                   # 今のシェルで読み直す（第1章11.2節）
```

`mise activate zsh` は、`brew shellenv` と同じように「zsh で mise を有効にするコマンド」を文字として出力し、それを `eval` で実行しています。プロンプトを表示するたびに働く機能（6.4節）なので、`.zprofile` ではなく `.zshrc` に書きます（第1章11.1節）。

### 6.2 手を動かす: 全体で使うバージョンを決める

```sh
$ mise use --global node@lts      # 最新の LTS を入れ、どこでもそれを使うようにする
$ node -v                         # -v: バージョンを表示する
v24.x.x
$ which node
/Users/alice/.local/share/mise/installs/node/24.x.x/bin/node
$ cat ~/.config/mise/config.toml
[tools]
node = "lts"
```

| 部分 | 意味 |
| --- | --- |
| `mise use ツール@版` | その版を（まだ無ければ入れて）使うようにする |
| `node@lts` | Node.js の最新の LTS。`node@24` なら 24 系の最新、`node@24.11.0` ならその版 |
| `--global` | どのフォルダでも使う既定にする。設定は `~/.config/mise/config.toml` に書かれる |

Node.js は、自分のホームフォルダの下（`~/.local/share/mise/installs/`）に入っています。設定ファイルの形式は **TOML** で、`[tools]` は「ここから下は使う道具の一覧」という見出し、その下に `名前 = "値"` と書きます。

### 6.3 手を動かす: プロジェクトごとにバージョンを固定する

`--global` を付けずに `mise use` すると、**今いるフォルダだけ**の設定になります。

```sh
$ mkdir -p ~/dev/ch02/my-app && cd ~/dev/ch02/my-app
$ mise use node@22                # このフォルダでは Node.js 22 を使う
$ ls
mise.toml
$ cat mise.toml
[tools]
node = "22"
$ node -v
v22.x.x
$ cd .. && node -v                # フォルダを出ると、全体の既定（6.2節）に戻る
v24.x.x
```

`mise use` は、今いるフォルダに `mise.toml` を作ります。このファイルを Git でコミット（第3章）しておけば、ほかの人も、そのフォルダで `mise install` を打つだけで同じ版をそろえられます。`node = "22"` のようにメジャーだけ書くと 22 系の最新、`node = "22.12.0"` と書くとその版です。

> nvm などの道具は `.nvmrc` や `.node-version` で版を指定します。mise もこれらを読めますが、最近の版では既定で読まない設定です。この教材では `mise.toml` だけを使います。

### 6.4 手を動かす: mise の切り替えの正体を見る

`mise activate zsh` は、zsh に「**プロンプトを表示する前と、`cd` でフォルダを移動したときに、毎回 mise を呼ぶ**」仕掛け（**フック**）を登録します。mise は呼ばれるたびに、今いるフォルダから親のフォルダへ向かって `mise.toml` を探し、見つかった設定に合わせて、**PATH の先頭**の Node.js のフォルダを入れ替えます。

```sh
$ cd ~/dev/ch02/my-app
$ echo $PATH | tr ':' '\n' | head -n 1     # PATH の先頭（第1章10.2節）
/Users/alice/.local/share/mise/installs/node/22.x.x/bin
$ cd ~/dev/ch02
$ echo $PATH | tr ':' '\n' | head -n 1
/Users/alice/.local/share/mise/installs/node/24.x.x/bin
```

正体は第1章で学んだ「**PATH の前から順に探す**」仕組みそのものです。`node` が特別なことをしているわけではありません。

**フックが働かない場面**: フックは `.zshrc` で登録されるので、`.zshrc` を読まないシェルでは働きません。`zsh -c 'コマンド'` は新しい zsh でそのコマンドだけを動かしますが、このとき `.zshrc` は読まれません（第1章11.1節）。`-i` を足した `zsh -ic` は対話シェル（interactive）として起動するので、`.zshrc` を読みます。

```sh
$ cd ~/dev/ch02/my-app
$ zsh -c 'cd .. && node -v'      # フックが無いので、cd しても切り替わらない
v22.x.x
$ zsh -ic 'cd .. && node -v'     # .zshrc の mise のフックが cd で働く
v24.x.x
```

1つ目で `v22` のままなのは、新しいシェルが、親の PATH をそのまま受け継ぐからです（第1章10.1節の「環境変数のコピー」）。こうした場面で、そのフォルダの設定の Node.js を確実に使いたいときは `mise exec` を使います。

```sh
$ mise exec -- node -v            # 今いるフォルダの設定に従った node で、node -v を実行する
$ mise exec node@22 -- node -v    # 版を指定して実行する
```

`--` は「ここから後ろは mise のオプションではなく、実行するコマンドです」という区切りの印です。

### 6.5 mise のよく使うコマンド

| コマンド | 意味 |
| --- | --- |
| `mise ls` | 入っている道具と版。今のフォルダで使われているものに印が付く |
| `mise ls-remote node` | 入れられる Node.js の版の一覧（長いので `\| tail -n 5` などで） |
| `mise current node` | 今いるフォルダで使われる Node.js の版 |
| `mise which node` | 実際に使われる node のパス |
| `mise install` | `mise.toml` に書かれたものを、すべて入れる |
| `mise trust` | このフォルダの `mise.toml` を信頼する（下の説明） |
| `mise upgrade` | 新しい版に更新する |
| `mise uninstall node@20` | 取り除く |
| `mise doctor` | 設定に問題が無いか診断する |

**`mise trust`**: 他の人が作った `mise.toml` のあるフォルダに初めて入ると、mise は「このファイルを信頼しますか」と確かめます。`mise.toml` には環境変数も書ける（[samples/mise.toml.sample](samples/mise.toml.sample) の `[env]`）ので、clone しただけで意図しない設定が有効にならないようにする安全装置です。中身を見て問題なければ `mise trust` を打ちます。

### 6.6 npm と npx

Node.js を入れると、パッケージマネージャの **npm** と、パッケージを一時的に実行する **npx** も一緒に入ります。どちらも Node.js と同じフォルダに入るので、mise で版を切り替えると npm も切り替わります。

```sh
$ npm -v
11.x.x
$ which npm
/Users/alice/.local/share/mise/installs/node/24.x.x/bin/npm
```

第1章8.3節で述べたとおり、mise で入れた Node.js では `sudo npm install -g` は**不要**です（自分のホームフォルダの下に入っているため）。使い方は第3部 第14章で学びます。

### 6.7 既に別の方法で Node.js を入れている場合

```sh
$ which -a node             # PATH の中の node をすべて表示する
```

2つ以上表示されたら、どれが使われているか（1つ目）を確かめ、使わないものは取り除きます。

| 表示されたパス | 入れた方法 | 取り除き方 |
| --- | --- | --- |
| `~/.local/share/mise/installs/...` | mise | （残す） |
| `/opt/homebrew/bin/node` | Homebrew | `brew uninstall node` |
| `/usr/local/bin/node` | 公式サイトのインストーラ（.pkg）、または Intel 用の Homebrew | 公式サイトの手順を参考に、手で取り除く |
| `~/.nvm/versions/...` | nvm | `~/.zshrc` の nvm の行を消し、`~/.nvm` フォルダを消す |

取り除けないときでも、mise が PATH の先頭に自分のフォルダを入れるので、ふだんは mise の node が使われます。

## 7. 初めての Node.js

### 7.1 手を動かす: node -p で自分の環境を調べる

`node -p "式"` は、JavaScript の式を1つ計算して、結果を表示（print）します。`process` は、今動いている Node.js 自身の情報を持つオブジェクトです。

```sh
$ node -p "process.version"
v24.11.0
$ node -p "process.arch"            # Node.js が動いている CPU の種類
arm64
$ node -p "process.release.lts"     # LTS ならコードネーム
Krypton
$ node -p "1 + 2 * 3"               # ふつうの式も計算できる
7
```

| 式 | 中身 | 例 |
| --- | --- | --- |
| `process.version` | Node.js のバージョン | `v24.11.0` |
| `process.arch` | Node.js が動いている CPU の種類 | `arm64` |
| `process.platform` | OS の種類（macOS は `darwin`） | `darwin` |
| `process.release.lts` | LTS ならコードネーム。そうでなければ `undefined` | `Krypton` |
| `process.execPath` | 動いている node の実行ファイルの場所 | `/Users/alice/.local/share/mise/...` |
| `process.env.名前` | 環境変数（第1章10.1節）。無ければ `undefined` | `process.env.HOME` |

### 7.2 手を動かす: Node.js でファイルを動かす

ブラウザの外で JavaScript を動かす方法は、主に3つあります。

**1. 対話モード（REPL）**: `node` とだけ打つと、`>` が出て、1行ずつ試せます。

```sh
$ node
> 1 + 2
3
> process.platform
'darwin'
> .exit                      # 終わる（Ctrl + D でもよい）
```

**2. 1行だけ動かす**: `-e` は、次の文字列を JavaScript として実行します（evaluate）。`-p` と違い、結果は自動で表示されないので、`console.log` で表示します。

```sh
$ node -e "console.log('こんにちは、' + process.env.USER)"
こんにちは、alice
```

**3. ファイルを動かす**: いちばんよく使う形です。`~/dev/ch02/hello.mjs` を作ります（`.mjs` は JavaScript のファイルの拡張子の1つ。違いは第3部で学びます）。

```sh
$ cd ~/dev/ch02
$ cat > hello.mjs <<'EOF'
const name = process.env.USER;
console.log(`こんにちは、${name} さん`);
console.log(`Node.js ${process.version}（${process.arch}）で動いています`);
EOF
$ node hello.mjs
こんにちは、alice さん
Node.js v24.11.0（arm64）で動いています
$ USER=ねこ node hello.mjs           # 環境変数を変えて渡す（第1章10.1節）
こんにちは、ねこ さん
Node.js v24.11.0（arm64）で動いています
$ cd my-app && node ../hello.mjs     # 6.3節のフォルダでは 22 で動く
こんにちは、alice さん
Node.js v22.x.x（arm64）で動いています
$ cd ..
```

`` `…${式}…` `` は**テンプレート文字列**で、`${ }` の中の式の値を埋め込みます。完成形は [samples/hello.mjs](samples/hello.mjs) です。

`node --watch hello.mjs` と打つと、ファイルを保存するたびに実行し直します（`Ctrl + C` で終わる）。

[samples/node-info.mjs](samples/node-info.mjs) は、7.1節の情報などを表にして表示します（中身は第3部で学ぶ書き方を使っているので、読まなくてかまいません）。

```sh
$ node samples/node-info.mjs
```

ブラウザの JavaScript との違いは、`window` や `document`（DOM）が無い代わりに、`process`（実行中の Node.js の情報）や、ファイル・ネットワークを扱う機能があることです。第3部で詳しく学びます。

### 7.3 自分の環境を説明できるか

次のコマンドの結果をすべて説明できれば、この章は完了です。練習問題10では、これらをまとめて確かめるスクリプトを書きます。

```sh
$ uname -m                          # arm64 か（2.1節）
$ sysctl -n sysctl.proc_translated  # 0 か（2.2節）
$ which brew                        # /opt/homebrew/bin/brew か（3.4節）
$ which -a git                      # どちらの git が使われているか（4.4節）
$ mise doctor                       # 問題が無いか（6.5節）
$ which node                        # mise のフォルダか（6.2節）
$ node -p "process.release.lts"     # LTS のコードネームが出るか（7.1節）
```

---

## まとめ

- Homebrew は Mac 全体のコマンドとアプリ、mise は言語の版、npm はプロジェクトのライブラリを管理する。
- Apple Silicon の Homebrew は `/opt/homebrew`。ターミナルが Rosetta で動いていないか（`uname -m`、`sysctl`）に注意する。
- Homebrew の PATH の設定（`brew shellenv`）は `.zprofile`、mise の有効化は `.zshrc` に書く。
- `/opt/homebrew/bin` のコマンドは、Cellar の実体を指すシンボリックリンク。`ln -s 実体 リンク` で自分でも作れる。
- Node.js は LTS を使う。版はプロジェクトごとに `mise use` で `mise.toml` に固定し、Git で共有する。
- mise の切り替えの正体は「PATH の先頭の入れ替え」。困ったら `which node`、`mise current node`、`mise doctor`。
- `node -p "式"`、`node -e "文"`、`node ファイル.mjs` で JavaScript を動かせる。`process` で Node.js 自身の情報を読める。

## 練習問題

[exercises/README.md](exercises/README.md) に11問あります（基本・応用・発展の順）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Homebrew: https://brew.sh/ja/ 、ドキュメント https://docs.brew.sh/
- mise: https://mise.jdx.dev/
- Node.js のリリース一覧: https://nodejs.org/en/about/previous-releases
- Node.js 公式ドキュメント（`process`）: https://nodejs.org/docs/latest/api/process.html

前の章: [第1章 ターミナルとzshの基本](../ch01-terminal-zsh/README.md) ／ 次の章: [第3章 Git と GitHub](../ch03-git-github/README.md)
