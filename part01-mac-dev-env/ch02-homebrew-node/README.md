# 第2章 Homebrew と Node.js のインストール

この章では、Mac に開発用のソフトウェアを入れる仕組み（Homebrew）と、Node.js をプロジェクトごとに使い分ける仕組み（mise）を整えます。
既にインストール済みの場合も、**「どこに」「どのように」入っているか**を確認するつもりで読んでください。数か月後に新しい Mac を用意したときや、何かが壊れたときに、この章の手順をそのまま使えるように書いています。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 2〜3時間（ダウンロード時間を除く） |
| 前提 | 第1章（コマンドとオプションの形、パイプ、PATH、`.zprofile` と `.zshrc` の違い） |
| この章のゴール | Homebrew と mise の仕組みを説明できる / プロジェクトごとに Node.js のバージョンを固定できる / 「どの node が動いているか」を自分で確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | Brewfile の例、環境を確認するスクリプト、mise の設定例 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**: `$` で始まる行は、自分で打つコマンドです（`$` は打ちません）。`#` から後ろは説明のためのコメントで、打たなくてかまいません。`$` の付いていない行は、コマンドの結果の例です。結果に出てくる `alice` は例のユーザー名で、自分の Mac では自分のユーザー名になります。バージョンの数字（`24.x.x` など）も、時期によって変わります。

> 既に Homebrew と Node.js が入っている人へ: 3節と6.1〜6.2節のインストールの手順は、読むだけでかまいません。ただし 2節（Apple Silicon の注意点）、5節（LTS）、6.3節以降（プロジェクトごとの切り替え）、7節（確認方法）は、コマンドを実際に打ちながら読んでください。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場所 |
| --- | --- |
| `brew install`（2節〜4節） | 道具が必要になるたびに使います。第2部 第8章では `brew install mkcert` で HTTPS の練習用の道具を入れます |
| Brewfile（4.4節） | 第1部の成果物（dotfiles）で、「この Mac に入れるもの」の一覧として Git で管理します |
| LTS（5節） | 第3部以降のすべての部で「Node.js 24 以降の LTS」を前提にします。どの版を使えばよいかを自分で判断できるようにします |
| `mise use node@24` と `mise.toml`（6.3節） | 第3部・第4部・第5部の成果物を作り始めるとき、最初に打つコマンドです。プロジェクトの Node.js の版を固定します |
| 切り替えの正体は PATH（6.4節） | 「`node` のバージョンが思ったものと違う」ときの原因の調べ方です。第1章10節の PATH の知識をそのまま使います |
| `npm` と `npx`（6.6節） | 第3部 第14章からライブラリを入れるのに毎日使います |
| `node ファイル名`・`node -e`（7.2節） | 第2部から、すべての章でプログラムを動かすのに使います。`node --watch` は第4部で、保存のたびにサーバを動かし直すのに使います |

---

## 1. パッケージマネージャとは

### 1.1 なぜ必要か

アプリやコマンドを、Web サイトから手作業でダウンロードしてインストールすると、次のような問題が起きます。

- どこに何を入れたか分からなくなる
- 新しい版が出ても気づかない。更新を自分で追いかける必要がある
- あるツールが別のライブラリを必要としている（これを**依存関係**と呼びます）とき、それも自分で探して入れる必要がある

**パッケージマネージャ**は、これらをまとめて引き受ける道具です。「〇〇を入れて」と1行のコマンドで頼むと、ダウンロード、決まった場所への配置、依存関係のインストールまで済ませてくれます。ソフトウェアをまとめたものを**パッケージ**と呼びます。

Flask を使ったことがあれば、`pip install flask` を打ったはずです。pip は Python 用のパッケージマネージャで、Flask を入れるときに、Flask が使っている Werkzeug（リクエストを受け取る部分）や Jinja2（テンプレート）も一緒に入れてくれていました。これと同じ考え方です。

### 1.2 この教材で使う3つのパッケージマネージャ

この教材では、役割の違う3種類のパッケージマネージャを使います。混同しやすいので、最初に整理しておきます。

| 道具 | 管理するもの | 例 | Python での対応 |
| --- | --- | --- | --- |
| Homebrew | Mac 全体で使うコマンドやアプリ | git、mise、VS Code | （OS 全体のパッケージ管理） |
| mise | 言語のランタイム（実行するためのプログラム）のバージョン | Node.js 22 と 24 の切り替え | pyenv |
| npm | プロジェクトが使うライブラリ | Express、React | pip と venv |

npm は第3部で扱います。この章では Homebrew と mise を扱います。

## 2. Apple Silicon と Intel の違い

### 2.1 CPU の種類を調べる: uname -m

Mac には、CPU（計算をする部品）の種類が2つあります。

| Mac | CPU の種類（アーキテクチャ） |
| --- | --- |
| Apple Silicon（M1 以降）の Mac | **arm64** |
| それ以前の Intel の Mac | **x86_64** |

プログラムは、CPU ごとに別々に作られます（CPU が理解する命令が違うためです）。そのため、この違いがインストール先や、うまく動かないときの原因に関係します。

```sh
$ uname -m              # -m: CPU の種類（machine）を表示する
arm64                   # Apple Silicon で、ネイティブ（そのまま）で動いている
```

`uname` は、OS の情報を表示するコマンドです。オプションで、何を表示するかを選びます。

### 2.2 Rosetta 2

Apple Silicon の Mac は、Intel 用に作られたプログラムを **Rosetta 2** という変換の仕組みで動かせます。便利ですが、**ターミナル自体が Rosetta で動いている**と、そこから起動するものがすべて Intel 用として扱われ、Intel 用の Homebrew や Node.js が入ってしまうことがあります。

```sh
$ sysctl -n sysctl.proc_translated
0        # ネイティブで動いている（正常）
```

- `sysctl` は、OS の設定の値を読むコマンドです。`sysctl.proc_translated` は「このプログラムは Rosetta で変換されて動いているか」を表す項目です。
- `-n` は、値だけを表示するオプションです（`-n` を付けないと `sysctl.proc_translated: 0` のように、項目の名前も付きます）。
- 結果が `1` なら Rosetta で動いています（要注意）。Intel の Mac では、この項目が無いので `unknown oid` というエラーになります。

`1` が表示されたら、Finder で「アプリケーション」→「ユーティリティ」→「ターミナル」を選んで `⌘ + I`（情報を見る）を開き、「Rosetta を使用して開く」のチェックを外して、ターミナルを開き直します。

### 2.3 Homebrew のインストール先

| Mac | Homebrew の場所 | コマンドの場所 |
| --- | --- | --- |
| Apple Silicon | `/opt/homebrew` | `/opt/homebrew/bin` |
| Intel（または Rosetta） | `/usr/local` | `/usr/local/bin` |

Apple Silicon の Mac で `/usr/local/bin/brew` があるときは、過去に Rosetta を通したり、Intel の Mac から引っ越したりして、Intel 用の Homebrew が入った可能性があります。2つの Homebrew が混ざると、同じコマンドが2つ入り、PATH の順番（第1章10.2節）しだいでどちらが動くかが変わります。原因の分かりにくい不具合のもとになります。

## 3. Homebrew のインストール

公式サイト: https://brew.sh/ja/

### 3.1 Xcode Command Line Tools

Homebrew は、**Xcode Command Line Tools**（以下 CLT）を必要とします。CLT は、プログラムを組み立てる道具（コンパイラ）や git などをまとめたものです。Xcode 本体（数十 GB）は要りません。

```sh
$ xcode-select -p                 # -p: CLT の場所を表示する（print path）。入っていれば表示される
/Library/Developer/CommandLineTools
$ xcode-select --install          # 入っていなければインストールする（ダイアログが出る）
```

Homebrew のインストーラは、CLT が無ければ自動で入れようとするので、この手順は省いてもかまいません。macOS の大きなアップデートの後に `xcrun: error: invalid active developer path` と表示されたときは、`xcode-select --install` で CLT を入れ直すと直ります。

### 3.2 インストールの実行

公式サイトに書かれている1行を、ターミナルに貼り付けて実行します（下は執筆時点のものです。**必ず公式サイトで最新のコマンドを確かめてください**）。

```sh
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

長く見えますが、第1章の知識で読めます。内側から順に見ていきます。

| 部分 | 意味 |
| --- | --- |
| `curl URL` | `curl` は、URL の中身をダウンロードして、stdout（第1章5節）に出すコマンドです。ここでは、インストール用のシェルスクリプトをダウンロードします |
| `-fsSL` | `-f -s -S -L` の4つのオプションをまとめたものです（第1章1.3節）。`-f`: サーバがエラーを返したら失敗にする（fail）、`-s`: 進み具合を表示しない（silent）、`-S`: ただしエラーは表示する（show error）、`-L`: 「別の URL へ移動して」と言われたら、ついていく（location） |
| `"$( ... )"` | コマンド置換（第1章5.3節）。中のコマンドの出力を、1つの文字列にします |
| `/bin/bash -c 文字列` | `-c` は「次の文字列を、スクリプトとして実行する」というオプションです（command） |

つまり「インターネットからスクリプトを取ってきて、その場で bash で実行する」コマンドです。便利な反面、**信頼できる配布元のものだけを実行する**必要があります。心配なときは、先に保存して中身を読んでから実行することもできます。

```sh
$ curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh > install.sh   # ファイルに保存
$ less install.sh                                                                              # 中身を読む（q で終了）
$ bash install.sh                                                                              # 実行する
```

インストールの途中で、Mac のログインのパスワードを聞かれます（`/opt/homebrew` というフォルダを作るためです）。パスワードは打っても画面に表示されませんが、そのまま打って Return を押します。

### 3.3 PATH の設定

インストールの最後に「Next steps」として、PATH を設定するコマンドが表示されます。Apple Silicon では次の内容です。

```sh
$ echo >> ~/.zprofile                                              # ~/.zprofile の最後に空の行を1行足す
$ echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile   # ~/.zprofile の最後に、この1行を足す
$ eval "$(/opt/homebrew/bin/brew shellenv)"                        # 今のシェルにも、すぐに反映する
```

- `>>` は、ファイルの最後に書き足すリダイレクトです（第1章5.2節）。`>` と違い、元の中身は消えません。
- 2行目は、シングルクォート（第1章4.3節）の中身を、そのままの文字で `~/.zprofile` に書き足します。シングルクォートの中では `$( )` は置き換えられないので、`eval "$(...)"` という文字がそのまま書き込まれます。
- `~/.zprofile` は、ターミナルを開いたときに読まれるファイルです（第1章11節）。次からは、ターミナルを開くたびに自動で設定されます。
- 3行目は、今開いているターミナルにも、すぐに設定を効かせるためのものです。

`brew shellenv` は、「PATH などの環境変数を設定するコマンド」を**文字として出力する**コマンドです。`eval` は、受け取った文字を、シェルのコマンドとして実行するシェルの組み込みコマンドです。つまり `eval "$(brew shellenv)"` で、「brew が出力した設定のコマンドを、今のシェルで実行する」ことになります。

`eval` を付けずに実行すると、何を設定しているかが見えます。

```sh
$ /opt/homebrew/bin/brew shellenv
export HOMEBREW_PREFIX="/opt/homebrew";
export HOMEBREW_CELLAR="/opt/homebrew/Cellar";
export HOMEBREW_REPOSITORY="/opt/homebrew";
fpath[1,0]="/opt/homebrew/share/zsh/site-functions";
eval "$(/usr/bin/env PATH_HELPER_ROOT="/opt/homebrew" /usr/libexec/path_helper -s)"
...
```

`export` で環境変数を設定し（第1章10.1節）、最後の行で PATH に `/opt/homebrew/bin` を足しています。PATH の設定なので、第1章11節のとおり **`~/.zprofile`** に書きます。

### 3.4 確認

```sh
$ which brew               # brew がどこにあるか（第1章10.2節）
/opt/homebrew/bin/brew
$ brew --version           # --version: バージョンを表示する
Homebrew 4.x.x
$ brew doctor              # 問題が無いか診断する
Your system is ready to brew.
```

`brew doctor` は、問題を見つけると、その説明と直し方を英語で表示します。何か表示されたら、まずその文章を読みましょう（警告の多くは、実害のないものです）。

## 4. Homebrew を使う

### 4.1 用語

`brew` のコマンドは、`brew 動詞 パッケージ名` の形です（`brew install git` なら「git を入れる」）。Homebrew には独特の用語があります。

| 用語 | 意味 |
| --- | --- |
| formula（フォーミュラ） | ターミナルで使うコマンドのパッケージ。例: `git`、`mise` |
| cask（カスク） | 画面のあるアプリ（GUI アプリ）のパッケージ。例: `visual-studio-code`、`google-chrome` |
| bottle（ボトル） | ビルド済み（すぐ動かせる形に組み立て済み）のパッケージ。これがあると、手元で組み立てずにすぐ入る |
| Cellar（セラー） | formula の実体が入る場所（`/opt/homebrew/Cellar/パッケージ名/バージョン/`） |

### 4.2 よく使うコマンド

```sh
$ brew search postgres                     # 名前に postgres を含むパッケージを探す
$ brew info git                            # git の説明、バージョン、依存関係、入っているか
$ brew install git                         # formula を入れる
$ brew install --cask visual-studio-code   # --cask: GUI アプリ（cask）を入れる
$ brew list                                # 入っているもの（依存で入ったものも含む）
$ brew leaves                              # 自分で入れたもの（ほかのパッケージから使われていないもの）
$ brew update                              # Homebrew 自身と、パッケージの一覧を新しくする
$ brew outdated                            # 新しい版が出ているもの
$ brew upgrade                             # すべてを新しい版にする（brew upgrade git なら git だけ）
$ brew uninstall git                       # 取り除く
```

依存関係を調べるコマンドもあります。

```sh
$ brew deps --tree git                     # git が使っているパッケージを、木の形で表示（--tree）
git
├── gettext
│   └── libunistring
└── pcre2
$ brew uses --installed gettext            # gettext を使っているパッケージのうち、入っているもの（--installed）
git
```

使わなくなったものを片付けるコマンドです。

```sh
$ brew autoremove                          # 依存で入ったが、もう誰にも使われていないものを取り除く
$ brew cleanup                             # 古い版や、ダウンロードしたファイルの残りを消す
```

`brew list` と `brew leaves` の数は、第1章6.2節の `wc -l` で数えられます。

```sh
$ brew list | wc -l          # 入っているものの数
      45
$ brew leaves | wc -l        # 自分で入れたものの数
       8
```

差の 37 は「何かの依存として、自動で入ったものの数」です。

### 4.3 シンボリックリンク: Homebrew の置き方の仕組み

Homebrew は、パッケージの実体を Cellar の「バージョンごとのフォルダ」に入れ、`/opt/homebrew/bin` には、そこを指す**シンボリックリンク**を置きます。シンボリックリンクは、別のファイルの場所を指す小さなファイルです（Finder の「エイリアス」に近いものです）。

```sh
$ ls -l /opt/homebrew/bin/git
lrwxr-xr-x  1 alice  admin  28 11  4 10:00 /opt/homebrew/bin/git -> ../Cellar/git/2.51.0/bin/git
```

- `ls -l` の最初の文字が `l` なのは、シンボリックリンク（link）の印です（第1章8.1節）。
- `->` の右側が、リンクが指している先です。`..` は1つ上のフォルダ（第1章2.2節）なので、`/opt/homebrew/Cellar/git/2.51.0/bin/git` を指しています。
- `readlink ファイル` でも、リンクが指している先だけを表示できます。

```sh
$ readlink /opt/homebrew/bin/git
../Cellar/git/2.51.0/bin/git
```

こうしておくと、新しい版を入れたときは、リンクの指す先を変えるだけで済みます。PATH に足すフォルダも `/opt/homebrew/bin` の1つで済みます。シンボリックリンクは、第1部の成果物（dotfiles）でも使います。

### 4.4 git は Homebrew で入れ直すべきか

CLT にも git が入っていて、`/usr/bin/git` として使えます。Apple が配っているものは更新が遅めなので、新しい機能を使いたいときは `brew install git` で Homebrew の版を入れます。PATH で `/opt/homebrew/bin` が `/usr/bin` より前にあれば、Homebrew の版が使われます。

```sh
$ which -a git            # -a: PATH の中で見つかる git を、すべて表示する（第1章10.2節）
/opt/homebrew/bin/git     # ← 1つ目が使われる
/usr/bin/git
```

### 4.5 Brewfile で環境を記録する

**Brewfile** は「この Mac に入れたいもの」の一覧を書くファイルです。新しい Mac で `brew bundle` を1回実行するだけで、同じものをまとめて入れられます。第1部の成果物（dotfiles）に入れます。

Brewfile の中身は、1行に1つ、次の形で書きます。`#` から後ろはコメントです。

```ruby
brew "git"                    # formula（コマンド）
brew "mise"
cask "visual-studio-code"     # cask（GUI アプリ）
```

`brew bundle` のコマンドで、作る・確かめる・入れるができます。

```sh
$ brew bundle dump --file=~/Brewfile --describe   # 今入っているものから Brewfile を作る
$ brew bundle check --file=~/Brewfile             # Brewfile のものが、すべて入っているか確かめる
$ brew bundle --file=~/Brewfile                   # Brewfile のものを、すべて入れる
```

| オプション | 意味 |
| --- | --- |
| `--file=パス` | どの Brewfile を使うか |
| `--describe` | `dump` のとき、各行に説明のコメントを付ける |

`dump` で作った Brewfile には、自分で入れたもの（`brew leaves` に出るもの）だけが書かれます。依存で入ったものは、`brew bundle` が自動で入れるからです。

例は [samples/Brewfile.sample](samples/Brewfile.sample) にあります。

## 5. Node.js のバージョンと LTS

### 5.1 なぜバージョン管理の道具を使うのか

`brew install node` でも Node.js は入りますが、この教材では使いません。理由は次のとおりです。

- Homebrew は「最新の版」を入れる道具です。`brew upgrade` のたびに Node.js の大きな版（22 から 24 など）が上がり、動いていたプロジェクトが動かなくなることがあります
- 実際の開発では「このプロジェクトは Node.js 22、あちらは 24」のように、**プロジェクトごとに使う版が違う**ことがあります
- チームの全員（と、本番のサーバや CI）で、同じ版を使いたい

Flask で開発したとき、プロジェクトごとに venv（そのプロジェクト専用のライブラリの置き場）を作ったかもしれません。venv は「どのライブラリのどの版を使うか」をプロジェクトごとに分ける仕組みでした。ここでは同じことを、**Node.js 自体の版**について行います（Python で言うと、pyenv で Python の版を選ぶことに当たります）。

Node.js の版を切り替える道具には nvm、fnm、Volta、mise などがあります。この教材では **mise**（ミーズ）を使います。Node.js 以外（Python など）も同じ方法で管理でき、動きが速いからです。

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

この決まりを**セマンティックバージョニング**と呼びます。npm のライブラリも同じ決まりで番号を付けます（第3部 第14章で詳しく扱います）。

## 6. mise で Node.js を入れる

公式ドキュメント: https://mise.jdx.dev/

### 6.1 mise のインストールと有効化

```sh
$ brew install mise
$ mise --version
2026.x.x macos-arm64
```

次に、zsh を起動するときに mise を有効にする設定を `~/.zshrc` に足します。プロンプトを表示するたびに働く機能（6.4節）なので、`.zprofile` ではなく `.zshrc` に書きます（第1章11.1節）。

```sh
$ echo 'eval "$(mise activate zsh)"' >> ~/.zshrc    # ~/.zshrc の最後に1行足す
$ source ~/.zshrc                                   # 今のシェルで、.zshrc を読み直す（第1章11.2節）
```

`mise activate zsh` は、`brew shellenv` と同じように「zsh で mise を有効にするコマンド」を文字として出力します。それを `eval` で実行しています。

### 6.2 全体で使うバージョンを決める

```sh
$ mise use --global node@lts      # 最新の LTS を入れ、どこでもそれを使うようにする
$ node -v                         # -v: Node.js のバージョンを表示する（version）
v24.x.x
$ which node
/Users/alice/.local/share/mise/installs/node/24.x.x/bin/node
```

| 部分 | 意味 |
| --- | --- |
| `mise use ツール@版` | その版を（まだ無ければ入れて）使うようにする |
| `node@lts` | Node.js の、最新の LTS。`node@24` なら 24 系の最新、`node@24.11.0` ならその版 |
| `--global` | どのフォルダでも使う既定の設定にする。設定は `~/.config/mise/config.toml` に書かれる |

`which node` の結果から、Node.js は自分のホームフォルダの下（`~/.local/share/mise/installs/`）に入っていることが分かります。

`~/.config/mise/config.toml` の中身は、次のようになります。

```sh
$ cat ~/.config/mise/config.toml
[tools]
node = "lts"
```

この書き方は **TOML** という設定ファイルの形式です。`[tools]` は「ここから下は、使う道具の一覧」という見出しで、`名前 = "値"` の形で書きます。

### 6.3 プロジェクトごとにバージョンを固定する

`--global` を付けずに `mise use` すると、**今いるフォルダだけ**の設定になります。

```sh
$ mkdir -p ~/dev/my-app && cd ~/dev/my-app    # フォルダを作って移動する（&& は第1章7.2節）
$ mise use node@22                # このフォルダでは Node.js 22 を使う
$ ls
mise.toml
$ cat mise.toml
[tools]
node = "22"
$ node -v
v22.x.x
$ cd ~ && node -v                 # フォルダを出ると、全体の既定（6.2節）に戻る
v24.x.x
```

`mise use` は、今いるフォルダに `mise.toml` を作ります。このファイルを Git でコミット（第3章）しておけば、ほかの人も、そのフォルダで `mise install` を打つだけで、同じ版をそろえられます。

`node = "22"` のようにメジャーだけ書くと 22 系の最新が、`node = "22.12.0"` と書くとその版が使われます。

> 他の道具（nvm など）では、`.nvmrc` や `.node-version` というファイルで版を指定します。mise もこれらを読めますが、最近の版では既定で読まない設定になっています。この教材では `mise.toml` だけを使います。

### 6.4 mise はどうやって切り替えているのか

`mise activate zsh` は、zsh に「**プロンプトを表示する前と、`cd` でフォルダを移動したときに、毎回 mise を呼ぶ**」仕掛け（**フック**と呼びます）を登録します。mise は呼ばれるたびに、今いるフォルダから親のフォルダへ向かって `mise.toml` を探します。見つかった設定に合わせて、**PATH の先頭**の Node.js のフォルダを入れ替えます。

```sh
$ cd ~/dev/my-app
$ echo $PATH | tr ':' '\n' | head -n 2     # PATH の最初の2つ（第1章10.2節）
/Users/alice/.local/share/mise/installs/node/22.x.x/bin
/opt/homebrew/bin
```

つまり、正体は第1章で学んだ「**PATH の前から順に探す**」仕組みそのものです。`node` というコマンドが特別なことをしているわけではありません。

#### フックが働かない場面

このフックは、`.zshrc` の `mise activate` で登録されます。そのため、`.zshrc` を読まないシェルでは働かず、フォルダを移動しても切り替えは起きません。

`zsh -c 'コマンド'` は、新しい zsh を起動して、そのコマンドだけを動かして終わります（`-c` は 3.2節の `bash -c` と同じです）。このとき zsh は `.zshrc` を読まない（第1章11.1節）ので、フックは登録されません。`-i` を足した `zsh -ic 'コマンド'` は、新しい zsh を**対話シェルとして**（interactive）起動するので、`.zshrc` を読み、mise も有効になります。

```sh
$ cd ~/dev/my-app
$ zsh -c 'cd ~ && node -v'      # 新しいシェルの中で ~ に移動しても、フックが無いので切り替わらない
v22.x.x
$ zsh -ic 'cd ~ && node -v'     # 対話シェルとして起動すると、.zshrc の mise のフックが cd で働く
v24.x.x
```

1つ目で `v22` のままなのは、新しいシェルが、親（今のシェル）の PATH をそのまま受け継ぐからです（第1章10.1節の「環境変数のコピー」）。

スクリプトの中など、フックが働かない場面で、そのフォルダの設定の Node.js を確実に使いたいときは `mise exec` を使います。

```sh
$ mise exec -- node -v            # 今いるフォルダの設定に従った node で、node -v を実行する
$ mise exec node@22 -- node -v    # 版を指定して実行する
```

`--` は「ここから後ろは mise のオプションではなく、実行するコマンドです」という区切りの印です。

### 6.5 mise のよく使うコマンド

```sh
$ mise ls                   # 入っている道具と版。今のフォルダで使われているものに印が付く
$ mise ls-remote node       # 入れられる Node.js の版の一覧（とても長いので | tail -n 5 などで）
$ mise current node         # 今いるフォルダで使われる Node.js の版
$ mise which node           # 実際に使われる node のパス
$ mise install              # mise.toml に書かれたものを、すべて入れる
$ mise trust                # このフォルダの mise.toml を信頼する（下の説明）
$ mise upgrade              # 新しい版に更新する
$ mise uninstall node@20    # 取り除く
$ mise doctor               # 設定に問題が無いか診断する
```

**`mise trust`**: 他の人が作った `mise.toml` のあるフォルダに初めて入ると、mise は「このファイルを信頼しますか」と確かめます。`mise.toml` には環境変数も書けるので、clone しただけで意図しない設定が有効にならないようにする安全装置です。中身を見て問題なければ `mise trust` を打ちます。

### 6.6 npm と npx

Node.js を入れると、パッケージマネージャの **npm** と、パッケージを一時的に実行する **npx** も一緒に入ります。どちらもその Node.js と同じフォルダに入るので、mise で版を切り替えると npm も切り替わります。

```sh
$ npm -v                    # npm のバージョン
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

ほかのパッケージが使っているなど、取り除けないこともあります。その場合でも、mise が PATH の先頭に自分のフォルダを入れるので、ふだんは mise の node が使われます。

## 7. 確認と、初めての Node.js

### 7.1 自分の環境を説明できるか

次のコマンドで、自分の環境を確かめましょう。結果をすべて説明できれば、この章は完了です。

```sh
$ uname -m                          # arm64 か（2.1節）
$ sysctl -n sysctl.proc_translated  # 0 か（Rosetta で動いていないか。2.2節）
$ which brew                        # /opt/homebrew/bin/brew か（3.4節）
$ which -a git                      # どちらの git が使われているか（4.4節）
$ mise doctor                       # 問題が無いか（6.5節）
$ which node                        # mise のフォルダか（6.2節）
$ node -p "process.arch"            # arm64 か
$ node -p "process.release.lts"     # LTS のコードネームが表示されるか
```

`node -p "式"` は、JavaScript の式を1つ計算して、結果を表示（print）するオプションです。`process` は、今動いている Node.js 自身の情報を持つオブジェクトです。

| 式 | 中身 | 例 |
| --- | --- | --- |
| `process.version` | Node.js のバージョン | `v24.11.0` |
| `process.arch` | Node.js が動いている CPU の種類 | `arm64` |
| `process.platform` | OS の種類（macOS は `darwin`） | `darwin` |
| `process.release.lts` | LTS ならコードネーム。そうでなければ `undefined` | `Krypton` |
| `process.execPath` | 動いている node の実行ファイルの場所 | `/Users/alice/.local/share/mise/...` |

[samples/check-arch.sh](samples/check-arch.sh) と [samples/node-info.mjs](samples/node-info.mjs) は、これらをまとめて表示します（動かし方は [samples/README.md](samples/README.md)）。

### 7.2 初めての Node.js

ブラウザの外で JavaScript を動かしてみましょう。Node.js の動かし方は、主に3つあります。

**1. 対話モード（REPL）**: `node` とだけ打つと、`>` が表示され、JavaScript を1行ずつ打って試せます。

```sh
$ node
> 1 + 2
3
> process.platform
'darwin'
> .exit                      # 終わる（Ctrl + D でもよい）
```

**2. 1行だけ動かす**: `-e` は、次の文字列を JavaScript として実行するオプションです（evaluate）。`-p` と違い、結果は自動では表示されないので、`console.log` で表示します。

```sh
$ node -e "console.log('こんにちは、' + process.env.USER)"   # process.env は環境変数（第1章10.1節）
こんにちは、alice
```

**3. ファイルを動かす**: いちばんよく使う形です。

```sh
$ cd このフォルダ/samples
$ node node-info.mjs                 # ファイルの JavaScript を実行する
$ node --watch node-info.mjs         # --watch: ファイルを保存するたびに、実行し直す（Ctrl + C で終わる）
```

ブラウザの JavaScript との違いは、`window` や `document`（DOM）が無い代わりに、`process`（実行中の Node.js の情報）や、ファイル・ネットワークを扱う機能があることです。第3部で詳しく学びます。

---

## まとめ

- Homebrew は Mac 全体のコマンドとアプリ、mise は言語の版、npm はプロジェクトのライブラリを管理する。
- Apple Silicon の Homebrew は `/opt/homebrew`。ターミナルが Rosetta で動いていないか（`uname -m`、`sysctl`）に注意する。
- Homebrew の PATH の設定（`brew shellenv`）は `.zprofile`、mise の有効化は `.zshrc` に書く。
- `/opt/homebrew/bin` のコマンドは、Cellar の実体を指すシンボリックリンク。`ls -l` で `l` と `->` が見える。
- Node.js は LTS を使う。版はプロジェクトごとに `mise use` で `mise.toml` に固定し、Git で共有する。
- mise の切り替えの正体は「PATH の先頭の入れ替え」。困ったら `which node`、`mise current node`、`mise doctor`。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Homebrew: https://brew.sh/ja/ 、ドキュメント https://docs.brew.sh/
- mise: https://mise.jdx.dev/
- Node.js のリリース一覧: https://nodejs.org/en/about/previous-releases
- Node.js 公式ドキュメント（API）: https://nodejs.org/docs/latest/api/

前の章: [第1章 ターミナルとzshの基本](../ch01-terminal-zsh/README.md) ／ 次の章: [第3章 Git と GitHub](../ch03-git-github/README.md)
