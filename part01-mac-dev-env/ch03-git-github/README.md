# 第3章 Git と GitHub

この章では、ファイルの変更の履歴を記録する **Git** と、それをインターネット上で共有する **GitHub** を、小さなリポジトリを自分で育てながら学びます。この教材の残りの部では、作るものをすべて Git で管理します。
コマンドの使い方だけでなく、**Git が中で何を記録しているか**（コミットとブランチの正体）ものぞきます。中身を知っていると、困ったときに「何が起きて、どう戻せばよいか」を自分で判断できます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第1章（コマンドとオプションの形、リダイレクト、権限、ヒアドキュメント）、第2章（Homebrew） |
| この章のゴール | 3つの領域（作業ツリー・ステージ・リポジトリ）を説明できる / コミット、ブランチ、マージができる / コンフリクトを直せる / 失敗を安全に取り消せる / SSH で GitHub に接続し、プルリクエストで変更を取り込める |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 練習用のリポジトリを作るスクリプト、設定ファイルの例 |
| [exercises/](exercises/) | 練習問題と、問題用のリポジトリを作るスクリプト |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 「**手を動かす**」の所は、実際に打って動かしてください。4〜8節と13節では、`~/dev/ch03/hello-git` という1つのリポジトリを、少しずつ育てていきます。練習問題は、そこで打ったコマンドを広げていく問題です。
> - 実習は `~/dev/ch03/` で行います（第1章2.5節）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします。
>
>   ```sh
>   $ mkdir -p ~/dev/ch03 && cd ~/dev/ch03
>   $ cp -R （ここに Finder から samples と exercises のフォルダをドラッグ） .
>   $ ls
>   exercises	samples
>   ```
>
>   `cp -R ` まで打ってから、Finder で教材の `part01-mac-dev-env/ch03-git-github` を開き、`samples` と `exercises` の2つのフォルダをターミナルにドラッグし、最後に ` .` を打って Return を押します。
> - 練習用のリポジトリを作るスクリプト（`samples/make-…`・`exercises/ex-…`）は、`~/dev/ch03` で `bash samples/make-….sh` のように動かします。作成先は `~/dev/ch03/` の下です。
> - コミットID（`4d9285f` のような英数字）は、打つ日時や人によって変わります。スクリプトで作るリポジトリだけは、日時を固定しているので、本文と同じ ID になります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場所 |
| --- | --- |
| `git init`・`add`・`commit`・`status`・`log`・`diff`（3〜4節） | 第3部以降の成果物は、どれも `git init` から始めます。動くところまで作るたびにコミットし、壊したら戻れるようにします |
| 取り消し（6節） | 練習で「動かなくなった」ときに、動いていた時点に戻すのに使います |
| ブランチとマージ（7〜8節） | 第5部以降のタスク管理アプリは、部ごとにブランチを作って進めます |
| プルリクエスト（12節） | 第11部で、プルリクエストを出すたびにテストが自動で動く仕組み（CI）を作ります |
| `.gitignore`（13節） | 第3部 第14章の `node_modules/`、第5部 第26章の `.env`（秘密の設定）を、コミットしないために使います |
| SSH の公開鍵と秘密鍵（11節） | 第2部 第8章（HTTPS）で、同じ「公開鍵で確かめる」仕組みを詳しく学びます |
| `git config`・`.gitconfig`（2節） | 第1部の成果物（dotfiles）で、この設定を Git で管理します |

---

## 1. Git と GitHub

| | Git | GitHub |
| --- | --- | --- |
| 何か | 変更の履歴を記録するプログラム | Git のリポジトリを預かり、共有するための Web サービス |
| どこで動くか | 自分の Mac の中 | インターネット上 |
| ネットワーク | 要らない（オフラインですべての機能が使える） | 要る |
| 主な機能 | コミット、ブランチ、マージ | リポジトリの公開、プルリクエスト、レビュー、Issue |

**リポジトリ**は、Git が履歴を記録しているフォルダのことです。Git は**分散型**と呼ばれ、GitHub の上のリポジトリも、自分の Mac の中のリポジトリも、同じ履歴を丸ごと持った対等なコピーです。GitHub は「みんなが共有の場所として使うことにした1つのコピー」です。

### 1.1 手を動かす: git が入っているか確かめる

```sh
$ git --version           # --version: バージョンを表示する
git version 2.51.0
$ which -a git            # /opt/homebrew/bin/git が先なら Homebrew の版が使われる（第2章4.4節）
/opt/homebrew/bin/git
/usr/bin/git
```

Homebrew の版が無ければ、`brew install git` で入れます。

## 2. 最初の設定

Git の設定は `git config 名前 値` の形で書きます。`--global` を付けると、自分のすべてのリポジトリに効く設定になり、`~/.gitconfig` に保存されます。

### 2.1 手を動かす: 設定して確かめる

```sh
$ git config --global user.name "Alice Example"                       # コミットに記録される名前
$ git config --global user.email "あなたのGitHubのnoreplyアドレス"      # コミットに記録されるメール
$ git config --global init.defaultBranch main      # 最初のブランチの名前を main にする（7節）
$ git config --global core.editor "code --wait"    # メッセージを書くエディタを VS Code に（第4章）
$ git config --global pull.ff only                 # pull で、知らないうちにマージのコミットを作らない（10.3節）
$ git config --global core.quotepath false         # 日本語のファイル名を "\346\227\245..." でなくそのまま表示
$ git config user.name                             # 1つの値を表示する
Alice Example
$ git config --list --show-origin | grep user      # すべての設定と、どのファイルに書かれているか
file:/Users/alice/.gitconfig    user.name=Alice Example
file:/Users/alice/.gitconfig    user.email=...
$ cat ~/.gitconfig
[user]
	name = Alice Example
	email = ...
```

- `user.name` は本名でなくてかまいません。GitHub のユーザー名などでもよいです。
- **メールアドレス**: コミットに記録したメールアドレスは、リポジトリを公開すると誰でも見られます。個人のアドレスを公開したくないときは、GitHub の Settings → Emails にある `12345678+username@users.noreply.github.com` という形のアドレスを使います（同じ画面の「Keep my email addresses private」もオンにします）。
- 第1部の成果物（dotfiles）を作った後は、`~/.gitconfig` はリポジトリのファイルを指すリンクになっています。`git config --global` で書き換えると、リポジトリのファイルが変わります。

[samples/gitconfig.sample](samples/gitconfig.sample) に、コメント付きの `~/.gitconfig` の例があります。

## 3. 3つの領域

Git を理解するうえで、いちばん大切な図です。

```
  作業ツリー             ステージ（インデックス）        リポジトリ（.git）
 （実際のファイル）      （次のコミットの準備場所）       （コミットの履歴）
┌──────────────┐  git add  ┌──────────────┐  git commit ┌──────────────┐
│ src/app.js   │ ────────▶ │ src/app.js   │ ──────────▶ │ ○─○─○ (HEAD) │
│ README.md    │           │              │             │              │
└──────────────┘ ◀──────── └──────────────┘ ◀────────── └──────────────┘
           git restore ファイル     git restore --staged ファイル
```

- **作業ツリー**: Finder やエディタで見えている、ふつうのファイル。
- **ステージ**（インデックスとも呼ぶ）: 「次のコミットに入れるもの」を並べておく場所。`git add` で、作業ツリーからここにコピーする。
- **リポジトリ**: `.git` という隠しフォルダの中にある、コミットの履歴。`git commit` で、ステージの内容をそのまま1つの**コミット**（その時点の記録）として残す。

ステージがあるので、「たくさん変えたうちの一部だけをコミットする」ことができます。

## 4. 基本の操作

### 4.1 手を動かす: git init でリポジトリを作る

```sh
$ mkdir -p ~/dev/ch03/hello-git && cd ~/dev/ch03/hello-git
$ git init                       # 今いるフォルダに .git を作り、リポジトリにする
Initialized empty Git repository in /Users/alice/dev/ch03/hello-git/.git/
$ ls -a                          # -a: 隠しファイルも表示（第1章3.2節）
.	..	.git
```

### 4.2 手を動かす: git status で状態を見る

`git status` は、3つの領域の違いを表示します。**迷ったら、まずこれを打ちます。**

```sh
$ echo "# hello" > README.md     # ファイルを作る（第1章5.2節）
$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	README.md

nothing added to commit but untracked files present (use "git add" to track)
```

| 表示 | 意味 |
| --- | --- |
| `On branch main` | 今 `main` というブランチにいる（7節） |
| `No commits yet` | まだコミットが1つも無い |
| `Untracked files` | Git がまだ記録していない（追跡していない）ファイル |
| `(use "git add <file>..." ...)` | 次に何をすればよいかのヒント。`<file>` はファイル名に置き換える |

### 4.3 手を動かす: git add と git commit で記録する

```sh
$ git add README.md              # README.md をステージに入れる
$ git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   README.md
$ git commit -m "README を追加"   # -m: コミットのメッセージを、その場で書く（message）
[main (root-commit) 4d9285f] README を追加
 1 file changed, 1 insertion(+)
 create mode 100644 README.md
```

- `Changes to be committed` は「ステージに入っていて、次のコミットに入るもの」です。
- `4d9285f` が、このコミットの**コミットID**（コミットの名前）です。
- `-m` を付けないと、メッセージを書くためのエディタが開きます（2節の `core.editor`）。

| 書き方 | 意味 |
| --- | --- |
| `git add ファイル名` | そのファイルだけ |
| `git add .` | 今いるフォルダの中の、変更したファイルすべて（`.` は今いるフォルダ。第1章2.2節） |
| `git add -A` | リポジトリ全体の、変更したファイルすべて（all） |

### 4.4 手を動かす: git diff で変更を見る

```sh
$ echo "練習用のリポジトリです" >> README.md    # 最後に1行足す
$ git status --short             # --short: 1ファイル1行の短い表示
 M README.md
$ git diff                       # まだ add していない変更
diff --git a/README.md b/README.md
index 8954bb9..dcb6241 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
 # hello
+練習用のリポジトリです
$ git add README.md
$ git diff                       # add した後は、何も出ない
$ git diff --staged              # add した変更（次のコミットに入る変更）
...
+練習用のリポジトリです
```

`+` で始まる行が足した行、`-` で始まる行が消した行です。`--short` の左の2文字は、「ステージ」と「作業ツリー」の状態です。

| 表示 | 意味 |
| --- | --- |
| ` M`（左が空白） | 作業ツリーで変更したが、まだ `add` していない |
| `M `（右が空白） | 変更して、`add` した |
| `A ` | 新しいファイルを `add` した |
| `??` | Git がまだ追跡していないファイル |

| 見たいもの | コマンド |
| --- | --- |
| まだ `add` していない変更 | `git diff` |
| `add` した変更 | `git diff --staged` |

### 4.5 手を動かす: git log で履歴を見る

```sh
$ git commit -m "説明を追加"
$ git log                        # 新しい順に、すべてのコミットを詳しく表示（q で終わる）
commit 19f366bfb81ddc8c2fcb195314a12b1c99cfd3c1
Author: Alice Example <alice@example.com>
Date:   Sat Nov 7 15:15:28 2026 +0900

    説明を追加

commit 4d9285f61cb688befeff7726cfab4a698d64a7ab
...
$ git log --oneline              # 1つのコミットを1行で
19f366b 説明を追加
4d9285f README を追加
$ git log -n 1 -p                # いちばん新しい1つと、その差分
```

コミットIDは40文字ありますが、ふつうは最初の7文字くらいで指定できます。長い出力は `less` と同じ画面（第1章3.6節）で表示されるので、`q` で終わります。

| オプション | 意味 |
| --- | --- |
| `--oneline` | 1つのコミットを1行で表示する |
| `--graph` | ブランチの枝分かれを、線の図で表示する（7〜8節） |
| `--all` | すべてのブランチのコミットを表示する |
| `-n 3` | 新しい方から3つだけ |
| `-p` | 各コミットで何を変えたか（差分）も表示する（patch） |

### 4.6 そのほかの基本のコマンド

| やりたいこと | コマンド |
| --- | --- |
| あるコミットで何を変えたかを見る | `git show コミットID` |
| ファイルの各行を、最後に変えたコミットを見る | `git blame ファイル` |
| ファイルの名前を変える（Git にも伝わる） | `git mv 古い名前 新しい名前` |
| ファイルを消す（Git にも伝わる） | `git rm ファイル` |

`git mv` や `git rm` は、ファイルを変える操作と `git add` を一度に行います。

### 4.7 コミットの単位とメッセージ

1つのコミットには「1つの意味のある変更」だけを入れます。「ログイン機能の追加」と「関係ないタイプミスの修正」は別々のコミットにします。後で問題が見つかったとき、そのコミットだけを取り消せるからです。

メッセージは、1行目に「何をしたか」を短く書き、必要なら1行空けて「なぜそうしたか」を書きます。

```
タスクの期限切れを赤く表示する

期限を過ぎたタスクに気づかないという意見があったため。
期限が今日のものは対象外にした（今日中に終わらせる可能性があるため）。
```

## 5. Git の中身をのぞく

使い方を覚えるだけなら読み飛ばしてもかまいませんが、6節以降の「なぜそうなるか」が分かりやすくなります。`.git` フォルダの中には、すべての履歴が**オブジェクト**として保存されています。

| 種類 | 中身 | たとえると |
| --- | --- | --- |
| blob（ブロブ） | ファイルの中身だけ（ファイル名は持たない） | ファイルの中身 |
| tree（ツリー） | 「名前 → blob または tree」の一覧 | フォルダ |
| commit（コミット） | いちばん上の tree、親のコミット、作者、日時、メッセージ | ある時点の、すべてのファイルの記録 |

それぞれのオブジェクトには、中身から計算した40文字の英数字（**ハッシュ**）が名前として付きます。コミットIDは、このハッシュです。中身が1文字でも変わればハッシュも変わるので、**過去の履歴をこっそり書き換えることはできません**。

### 5.1 手を動かす: オブジェクトをたどる

[samples/make-sample-repo.sh](samples/make-sample-repo.sh) で作るリポジトリは、作者と日時を固定しているので、誰が作っても同じハッシュになります。`git cat-file` はオブジェクトを表示するコマンドで、`-t` で種類（type）、`-p` で中身を読みやすく（pretty print）表示します。

```sh
$ cd ~/dev/ch03
$ bash samples/make-sample-repo.sh             # ~/dev/ch03/git-sample を作る
$ cd git-sample
$ git cat-file -t HEAD          # HEAD（今いるコミット。5.2節）の種類
commit
$ git cat-file -p HEAD          # HEAD の中身
tree 32fdb513c2182a0859eb24e110aed83af8eceda1
parent 0946517d25edb0c2f09f7b676a983d95adfe998e
author Sample Author <sample@example.com> 1793494980 +0900
committer Sample Author <sample@example.com> 1793494980 +0900

使い方を追記し、hello.js を追加
$ git cat-file -p 32fdb51       # 上の tree の中身（ハッシュは最初の数文字で指定できる）
100644 blob 6d86216eef055f3d37a175d22c7ec1a0e971ed95	README.md
040000 tree e453543522c469981c2ae4c4ead9047ad20d3820	src
$ git cat-file -p 6d86216       # blob の中身 = README.md の中身
```

- コミットの `tree` が、その時点のいちばん上のフォルダ、`parent` が1つ前のコミットです。
- tree の1行が1つのファイルかフォルダで、`100644` はふつうのファイル、`040000` はフォルダの印です。

コミットは「前からの差分」ではなく、**その時点のすべてのファイルの記録**を指しています。ただし、変えていないファイルは前と同じハッシュのオブジェクトを指すだけなので、容量はほとんど増えません。

### 5.2 手を動かす: ブランチと HEAD の正体を見る

```sh
$ cd ~/dev/ch03/hello-git
$ cat .git/HEAD
ref: refs/heads/main
$ cat .git/refs/heads/main
19f366bfb81ddc8c2fcb195314a12b1c99cfd3c1
$ git log --oneline -n 1
19f366b 説明を追加
```

- **ブランチ**は「あるコミットIDを書いた、小さなファイル」です。コミットするたびに、今のブランチのファイルが新しいコミットIDに書き換わります。
- **HEAD** は「今どのブランチにいるか」を指す印です。

ブランチを作るのが一瞬で終わり、いくつ作っても容量を使わないのはこのためです。

## 6. 取り消す

| やりたいこと | コマンド | 注意 |
| --- | --- | --- |
| 作業ツリーの変更を捨てる | `git restore ファイル` | 捨てた変更は戻せない |
| ステージから外す（変更は残す） | `git restore --staged ファイル` | |
| 直前のコミットを直す（メッセージ、入れ忘れ） | `git commit --amend` | コミットIDが変わる |
| コミットを打ち消す、新しいコミットを作る | `git revert コミットID` | 履歴は残る。共有したコミットにはこれを使う |
| ブランチを、前のコミットに戻す | `git reset コミットID` | 共有したコミットには使わない |

**コミットの指定**: `HEAD` は今いるコミット、`HEAD~1` は1つ前（親）、`HEAD~2` は2つ前です。コミットIDの代わりに使えます。

### 6.1 手を動かす: restore で戻し、--amend で直す

```sh
$ cd ~/dev/ch03/hello-git
$ echo "まちがい" >> README.md
$ git restore README.md                  # 作業ツリーの変更を捨てる
$ git status --short                     # 何も出ない＝きれいな状態
$ echo "メモ" > memo.txt
$ git add memo.txt
$ git restore --staged memo.txt          # ステージから外す（ファイルは残る）
$ git status --short
?? memo.txt
$ git add memo.txt && git commit -m "メモをついか"
$ git commit --amend -m "メモを追加"      # 直前のコミットのメッセージを直す
$ git log --oneline -n 2
8c1e5a2 メモを追加                         # ID も変わる
19f366b 説明を追加
```

`--amend` は、直前のコミットを「今のステージの内容」で作り直します。入れ忘れたファイルがあれば、先に `git add` してから `--amend` すれば、同じコミットに入ります。

`git reset` には、どこまで戻すかを決める3つのオプションがあります。

| オプション | ブランチの位置 | ステージ | 作業ツリー | 使いどころ |
| --- | --- | --- | --- | --- |
| `--soft` | 戻す | そのまま | そのまま | 直前のいくつかのコミットを、まとめてやり直したい |
| `--mixed`（何も付けないとき） | 戻す | 戻す | そのまま | コミットを取り消して、変更は手元に残したい |
| `--hard` | 戻す | 戻す | **戻す** | すべてを捨てて、その時点に戻したい |

### 6.2 手を動かす: reflog で取り戻す

`git reset --hard` で消したコミットも、すぐには消えていません。**reflog** には、HEAD がこれまでに指したコミットの記録が残っています（既定で90日間）。

```sh
$ git reset --hard HEAD~1                # わざと「メモを追加」を消す
HEAD is now at 19f366b 説明を追加
$ ls
README.md                                # memo.txt も消えた
$ git reflog
19f366b HEAD@{0}: reset: moving to HEAD~1
8c1e5a2 HEAD@{1}: commit (amend): メモを追加
...
$ git reset --hard 8c1e5a2               # 消したコミットに戻る（HEAD@{1} と書いてもよい）
$ ls
README.md	memo.txt
```

いちばん上が最新で、`HEAD@{1}` は「1つ前に HEAD が指していたもの」です。コミットさえしておけば、Git はほとんどのことから元に戻せます。逆に、**一度もコミットもステージもしていない変更**は Git にも記録が無いので、`git restore` や `git reset --hard` で消すと戻せません。

### 6.3 共有したコミットは書き換えない

`--amend` や `reset` は、コミットを**作り直す**（ID が変わる）操作です。GitHub に送って（push。10節）ほかの人が取り込んだ後に作り直すと、相手の履歴と食い違って混乱します。**push したコミットを取り消すときは `git revert`** を使います。

```sh
$ git revert 8c1e5a2             # 8c1e5a2 の変更を打ち消す、新しいコミットを作る（メッセージのエディタが開く）
$ git revert --no-edit 8c1e5a2   # --no-edit: メッセージを自動のまま使い、エディタを開かない
```

## 7. ブランチ

ブランチを使うと、main を壊さずに、新しいことを試せます。

### 7.1 手を動かす: ブランチを作って切り替える

```sh
$ cd ~/dev/ch03/hello-git
$ git switch -c feature/greeting       # ブランチを作って切り替える（-c: create）
Switched to a new branch 'feature/greeting'
$ echo "console.log('こんにちは');" > hello.js
$ git add hello.js && git commit -m "あいさつのプログラムを追加"
$ git branch                           # ブランチの一覧（* が今いるブランチ）
* feature/greeting
  main
$ git switch main                      # main に戻る
$ ls                                   # hello.js は無い（main にはまだ無いコミットだから）
README.md	memo.txt
$ git log --oneline --graph --all      # すべてのブランチの履歴
* 5b0c7d1 (feature/greeting) あいさつのプログラムを追加
* 8c1e5a2 (HEAD -> main) メモを追加
* 19f366b 説明を追加
* 4d9285f README を追加
```

| コマンド | 意味 |
| --- | --- |
| `git switch -c 名前` | ブランチを作って、そこに切り替える |
| `git switch 名前` | 切り替える |
| `git branch` | 一覧。`*` が今いるブランチ |
| `git branch -d 名前` | 消す（マージ済みのものだけ。`-D` で強制的に） |

- ブランチの名前の `/` はただの文字です。`feature/〇〇`（機能の追加）、`fix/〇〇`（直す）のように、種類が分かる名前を付けるとよく使われます。
- `git checkout` でも切り替えられますが、ファイルを元に戻す働きなども持っていて紛らわしいので、この教材では `switch`（切り替え）と `restore`（ファイルを戻す）を使います。
- 切り替える前に、作業中の変更はコミットしておきます。一時的によけておきたいときは、`git stash`（よけておく）と `git stash pop`（戻す）が使えます。

## 8. マージ

`git merge ブランチ` は、指定したブランチの変更を、今いるブランチに取り込みます。状況によって2通りの結果になります。

**fast-forward（早送り）**: main が、ブランチを作った後に進んでいないなら、main の印をブランチの先まで動かすだけで済みます。新しいコミットは作られません。

```
前:  main                 後:              main
      ↓                                     ↓
  ○───○───○───○       →    ○───○───○───○
           ↑                            ↑
         feature                      feature
```

**3-way マージ**: main も feature も進んでいるときは、2つの親を持つ**マージコミット**が作られます。

```
          ○───○  feature                       ○───○
         /                    →               /     \
  ○───○───○───○  main                 ○───○───○───○───◎  main（マージコミット）
```

### 8.1 手を動かす: fast-forward とマージコミットを作る

```sh
$ cd ~/dev/ch03/hello-git
$ git merge feature/greeting           # main は進んでいないので、早送り
Updating 8c1e5a2..5b0c7d1
Fast-forward
 hello.js | 1 +
 1 file changed, 1 insertion(+)
$ git branch -d feature/greeting       # マージが終わったブランチを消す
$ git switch -c feature/bye
$ echo "console.log('さようなら');" >> hello.js
$ git commit -am "お別れのあいさつを追加"    # -a: 追跡しているファイルの変更を add してからコミット
$ git switch main
$ echo "## 使い方" >> README.md
$ git commit -am "使い方の見出しを追加"     # main も進めた
$ git merge --no-edit feature/bye      # 両方進んでいるので、マージコミットになる
Merge made by the 'ort' strategy.
 hello.js | 1 +
 1 file changed, 1 insertion(+)
$ git log --oneline --graph
*   e7f1a90 Merge branch 'feature/bye'
|\
| * 3a6d2c4 お別れのあいさつを追加
* | 91b0e5f 使い方の見出しを追加
|/
* 5b0c7d1 あいさつのプログラムを追加
...
$ git branch -d feature/bye
```

- `git commit -a` は「追跡しているファイルの変更を、まとめて add してからコミットする」オプションです（新しいファイルは入りません）。`-am` は `-a -m` をまとめたものです。
- `--no-edit` は、マージコミットのメッセージを自動のまま使い、エディタを開かないオプションです。
- グラフの `*` が1つのコミット、`|`・`\`・`/` が枝の線です。

`git merge --no-ff ブランチ` とすると、fast-forward できる場合でも、マージコミットを作ります（no fast-forward）。「この機能は、ここでまとめて取り込んだ」という区切りを履歴に残したいときに使います。GitHub のプルリクエストの「Merge pull request」ボタンも、ふつうはこの形です。

### 8.2 手を動かす: コンフリクトを起こして直す

2つのブランチが**同じファイルの同じ場所**を別々に変えていると、Git はどちらを使えばよいか決められず、マージを途中で止めます（**コンフリクト**。衝突）。わざと起こしてみます。

```sh
$ git switch -c fix/title
$ sed -n 1p README.md                  # sed -n 1p: 1行目だけを表示する
# hello
```

1行目はエディタで書き換えます。 `README.md` を開いて（`open -e README.md` か `code README.md`）、1行目を次のように変えて保存してください。

| ブランチ | README.md の1行目 |
| --- | --- |
| `fix/title` | `# hello git` |
| `main` | `# こんにちは` |

```sh
$ git commit -am "題名を変える"         # fix/title で1行目を「# hello git」にしてコミット
$ git switch main                      # main に戻り、エディタで1行目を「# こんにちは」にして保存
$ git commit -am "題名を日本語に"
$ git merge fix/title
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Automatic merge failed; fix conflicts and then commit the result.
$ git status
...
Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   README.md
$ head -n 5 README.md
<<<<<<< HEAD
# こんにちは
=======
# hello git
>>>>>>> fix/title
```

`<<<<<<< HEAD` から `=======` までが今いるブランチ（main）の内容、`=======` から `>>>>>>>` までが取り込もうとしているブランチの内容です。直し方は次のとおりです。

1. エディタでファイルを開き、**最終的にあるべき内容**に書き直す（片方を選ぶとは限りません。両方の意図を活かすことが多いです）。ここでは1行目を `# こんにちは git` にし、`<<<<<<<`・`=======`・`>>>>>>>` の行はすべて消します。
2. `git add README.md` で「解消した」と Git に伝える。
3. `git commit --no-edit` でマージを終える（メッセージは自動で入っています）。

```sh
$ git add README.md
$ git commit --no-edit
$ git log --oneline --graph -n 4
$ git branch -d fix/title
```

途中でやめたいときは、`git merge --abort` で、マージを始める前の状態に戻せます。VS Code では、コンフリクトのあるファイルを開くと「Accept Current / Accept Incoming / Accept Both」のボタンが使えます（第4章6節）。

[samples/make-conflict-repo.sh](samples/make-conflict-repo.sh) は、少し大きなコンフリクトのあるリポジトリを作ります（練習問題7・12で使います）。

## 9. リベース

`git rebase main` は、今のブランチのコミットを、main の先の上に**作り直して**並べ替えます。

```
前:        ○───○  feature                後:                ○'──○'  feature
          /                                                 /
  ○───○───○───○  main                  ○───○───○───○  main
```

マージコミットができないので、履歴が1本の線になり、読みやすくなります。一方で、コミットを作り直す（ID が変わる）ので、6.3節と同じ注意が要ります。

> **リベースの決まり**: 自分しか使っていないブランチにだけ使う。他の人と共有しているブランチ（特に main）をリベースしない。

リベースの途中でコンフリクトが起きたら、8.2節と同じように直して `git add` した後、`git commit` ではなく `git rebase --continue` を打ちます。やめたいときは `git rebase --abort` です。この教材では、ふだんはマージを使い、自分の作業ブランチを最新の main に追いつかせたいときにだけリベースを使います（練習問題12）。

## 10. リモートと GitHub

### 10.1 手を動かす: 手元に「共有の場所」を作って push する

**リモート**は、別の場所にある、同じプロジェクトのリポジトリです。GitHub の上のリポジトリが代表ですが、まずは手元のフォルダをリモートにして、仕組みを確かめます。

```sh
$ cd ~/dev/ch03
$ git init --bare shared.git           # --bare: 作業ツリーを持たない、共有専用のリポジトリ（GitHub の上もこの形）
$ cd hello-git
$ git remote add origin ~/dev/ch03/shared.git    # リモートを origin という名前で登録する
$ git remote -v                        # 登録されているリモート（-v: URL も表示）
origin	/Users/alice/dev/ch03/shared.git (fetch)
origin	/Users/alice/dev/ch03/shared.git (push)
$ git push -u origin main              # 自分のコミットをリモートに送る
To /Users/alice/dev/ch03/shared.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
$ cd ~/dev/ch03
$ git clone shared.git hello-copy      # リモートの複製を、別のフォルダに作る（もう1人の人の手元のつもり）
$ cd hello-copy && git log --oneline -n 2
```

| コマンド | 働き |
| --- | --- |
| `git clone URL [フォルダ]` | リモートの複製を手元に作る。複製の元は `origin` という名前で登録される |
| `git remote add 名前 URL` | 手元で作ったリポジトリに、後からリモートを登録する |
| `git fetch` | リモートの新しいコミットを取ってくる。**自分のブランチは動かさない** |
| `git pull` | `fetch` した後、今のブランチに取り込む（`fetch` と `merge` を続けて行う） |
| `git push` | 自分のコミットを、リモートに送る |
| `git push -u origin ブランチ` | 初めて push するとき。`-u` で「このブランチは、リモートの同じ名前のブランチと対応する」と記録し、次からは `git push` だけで済む |

`hello-copy` でコミットして push し、`hello-git` で取り込んでみます。

```sh
$ cd ~/dev/ch03/hello-copy
$ echo "コピーから足した行" >> README.md && git commit -am "コピーから追記" && git push
$ cd ~/dev/ch03/hello-git
$ git fetch
$ git status
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
$ git log --oneline main..origin/main     # origin/main にあって、main に無いコミット
$ git pull
```

`fetch` すると、リモートのブランチの位置は `origin/main` のような名前（**リモート追跡ブランチ**）で手元に記録されます。`Your branch is behind ... by 1 commit` は「手元の main は origin/main より1つ遅れている」、`A..B` は「B にあって A に無いコミット」という意味です。

### 10.2 push が断られるとき

ほかの人が先に push していると、自分の push は断られます。

```
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '...'
hint: Updates were rejected because the remote contains work that you do not have locally.
```

リモートの履歴を上書きしないための安全装置です。先にリモートの変更を取り込んでから、もう一度 push します。

### 10.3 pull の設定

`pull.ff only`（2節）にしておくと、`git pull` は fast-forward できるときだけ取り込み、手元とリモートの両方に新しいコミットがある（枝分かれしている）ときは止まります。止まったら、状況を見て選びます。

```sh
$ git pull --rebase     # 自分のコミットを、リモートの先の上に作り直す（履歴が1本になる）
$ git pull --no-rebase  # マージコミットを作って取り込む
```

設定しないと、気づかないうちに `Merge branch 'main' of github.com:...` という、意味の薄いマージコミットが増えていきます。

[samples/make-remote-practice.sh](samples/make-remote-practice.sh) は、共有の場所と2人分の手元のリポジトリをまとめて作ります。練習問題10で、2人が同じリポジトリに push する状況を試します。

## 11. SSH で GitHub に接続する

GitHub に push するには、本人であることを示す必要があります。方法は **SSH 鍵**と **HTTPS + トークン**の2つがあり、この教材では SSH 鍵を使います。

### 11.1 公開鍵と秘密鍵

| ファイル | 名前 | 扱い |
| --- | --- | --- |
| `~/.ssh/id_ed25519` | 秘密鍵 | **絶対に他人に渡さない**。権限は `600`（第1章8.2節） |
| `~/.ssh/id_ed25519.pub` | 公開鍵 | GitHub に登録する。見られても問題ない |

秘密鍵で作った「署名」は、組になっている公開鍵でだけ確かめられます。GitHub は、登録された公開鍵で署名を確かめ、「この秘密鍵を持っている人＝本人」と判断します。秘密鍵そのものはネットワークに流れません。仕組みは第2部 第8章（HTTPS と TLS）で詳しく学びます。

### 11.2 手を動かす: 鍵を作る

```sh
$ ls -la ~/.ssh                         # 既に鍵があるか（id_ed25519 があれば作らなくてよい）
$ ssh-keygen -t ed25519 -C "GitHubのメールアドレス"
Enter file in which to save the key (/Users/alice/.ssh/id_ed25519):   ← そのまま Return
Enter passphrase (empty for no passphrase):                            ← パスフレーズを打つ（おすすめ）
Enter same passphrase again:                                           ← もう一度
$ ls -l ~/.ssh
-rw-------  1 alice  staff  411 11  7 10:00 id_ed25519
-rw-r--r--  1 alice  staff  103 11  7 10:00 id_ed25519.pub
```

| 部分 | 意味 |
| --- | --- |
| `ssh-keygen` | SSH の鍵を作るコマンド（key generate） |
| `-t ed25519` | 鍵の種類（type）。今のおすすめで、短く安全 |
| `-C "…"` | コメント（comment）。どの鍵かを見分けるためのラベル |
| パスフレーズ | 秘密鍵を守るパスワード。Mac を盗まれても、これが無ければ鍵は使えない。打っても表示されない |

秘密鍵が `-rw-------`（`600`）になっていることを確かめます。他人にも読める権限だと、`ssh` は「危ない」と判断して、その鍵を使いません。

### 11.3 手を動かす: キーチェーンに覚えさせる（Mac だけの設定）

`~/.ssh/config` に次の内容を足します（ファイルが無ければ作ります）。

```sh
$ cat >> ~/.ssh/config <<'EOF'
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
EOF
$ ssh-add --apple-use-keychain ~/.ssh/id_ed25519   # 一度パスフレーズを打てば、次からは聞かれない
```

| 行 | 意味 |
| --- | --- |
| `Host github.com` | github.com に接続するときの設定 |
| `AddKeysToAgent yes` | 鍵を ssh-agent（鍵を覚えておくプログラム）に自動で登録する |
| `UseKeychain yes` | パスフレーズを macOS のキーチェーンに保存する（macOS だけの設定） |
| `IdentityFile` | 使う秘密鍵の場所 |

[samples/ssh-config.sample](samples/ssh-config.sample) に例があります。

### 11.4 手を動かす: GitHub に公開鍵を登録して接続する

```sh
$ pbcopy < ~/.ssh/id_ed25519.pub     # 公開鍵（.pub の方）を、クリップボードにコピーする（第1章12節）
```

GitHub の Settings → SSH and GPG keys → New SSH key で、Title に「MacBook Air 2026」など分かりやすい名前を付け、Key に貼り付けて保存します。接続を確かめます（`ssh -T` は、ログインはせずに、接続と本人の確認だけをするオプション）。

```sh
$ ssh -T git@github.com
The authenticity of host 'github.com (...)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

初めて接続するときは、**接続先が本物の GitHub か**を確かめるよう求められます。表示された fingerprint（接続先の鍵の指紋）が、GitHub の公式ドキュメント「GitHub's SSH key fingerprints」（参考資料）に書かれた値と同じことを確かめてから `yes` と打ちます。確かめた相手は `~/.ssh/known_hosts` に記録され、次からは聞かれません。

```
Hi ユーザー名! You've successfully authenticated, but GitHub does not provide shell access.
```

と表示されれば成功です。

### 11.5 GitHub CLI（gh）

`brew install gh` で入る GitHub CLI を使うと、ターミナルから GitHub のリポジトリやプルリクエストを操作できます。

```sh
$ gh auth login                 # 質問に答えてログインする（プロトコルは SSH を選ぶ）
$ gh repo create my-repo --private --source=. --push
                                # 今のフォルダから、GitHub にリポジトリを作って push する
                                # --private: 非公開 / --source=.: このフォルダを使う / --push: すぐに push する
$ gh pr create                  # プルリクエストを作る（質問に答える）
$ gh pr view --web              # プルリクエストを、ブラウザで開く
```

## 12. プルリクエストで変更を取り込む

**プルリクエスト**（PR）は、「このブランチの変更を main に取り込んでください」という依頼です。変更の中身（差分）、話し合い（コメント）、自動のテストの結果（第11部）を、GitHub の1つの画面にまとめられます。一人で開発するときも PR を使うと、変更の単位がはっきりし、後から「なぜこの変更をしたか」を振り返りやすくなります。この教材では次の流れ（**GitHub Flow**）で進めます。

```sh
# 1. main を最新にする
$ git switch main && git pull

# 2. 作業用のブランチを作る（名前は、内容が分かるように）
$ git switch -c feature/task-due-date

# 3. 変更してコミットする（何回でもよい）
$ git add -A && git commit -m "タスクに期限を追加"

# 4. push する
$ git push -u origin feature/task-due-date

# 5. GitHub で PR を作る（push の後に表示される URL を開くか、gh pr create）
#    タイトルと説明に「何を・なぜ」変えたかを書く

# 6. 差分を自分で見直す。直すところがあれば 3〜4 を繰り返す（PR に自動で追加される）

# 7. GitHub の画面で Merge する

# 8. 手元を片付ける
$ git switch main && git pull
$ git branch -d feature/task-due-date
```

PR の説明に書くことを、あらかじめ用意しておく **PR テンプレート**も使えます。リポジトリに `.github/pull_request_template.md` を置くと、PR を作るときに自動で入力されます。例は [samples/pull_request_template.md](samples/pull_request_template.md) です。実際の流れは、練習問題9で GitHub を使って一通り行います。

## 13. .gitignore: コミットしないファイル

`.gitignore` というファイルに書いたパターンにあてはまるファイルは、`git status` に表示されず、`git add .` でもステージに入りません。リポジトリのいちばん上のフォルダに置きます。

| 書き方 | 意味 |
| --- | --- |
| `node_modules/` | どの深さにある `node_modules` フォルダも無視する（最後の `/` は「フォルダだけ」の意味） |
| `/build/` | `.gitignore` と同じ場所にある `build` フォルダだけを無視する（最初の `/` で場所を決める） |
| `*.log` | どの深さの `.log` ファイルも無視する（`*` は第1章4.1節のグロブと同じ） |
| `!important.log` | 前の行で無視したものを、もう一度対象に戻す（`!` は「〜を除く」） |
| `config/*.local.json` | `config` フォルダの直下の `.local.json` ファイル |
| `#` で始まる行 | コメント |

Node.js のプロジェクトで無視するものの代表は次のとおりです（例: [samples/node.gitignore](samples/node.gitignore)）。

| 対象 | 理由 |
| --- | --- |
| `node_modules/` | `npm install` で作り直せる。数万ファイルになる（第3部 第14章） |
| `.env` | パスワードや API キーなどの秘密の設定（第5部 第26章） |
| `dist/`、`build/`、`coverage/` | 組み立てやテストで作られるもの |
| `*.log` | ログ |

### 13.1 Mac だけのファイルは、自分の設定で無視する

Finder は、開いたフォルダに `.DS_Store`（表示の設定を覚えておくファイル）を勝手に作ります。これはプロジェクトではなく**自分の Mac** の都合なので、プロジェクトの `.gitignore` ではなく、自分のすべてのリポジトリに効く**グローバルな ignore** に書きます。

```sh
$ mkdir -p ~/.config/git
$ echo ".DS_Store" >> ~/.config/git/ignore       # Git が、設定しなくても読む場所
```

例: [samples/global-gitignore.sample](samples/global-gitignore.sample)

### 13.2 手を動かす: .gitignore を書いて確かめる

`hello-git` に、無視したいファイルを作ってみます。

```sh
$ cd ~/dev/ch03/hello-git
$ mkdir -p logs node_modules/x && touch logs/app.log debug.log node_modules/x/index.js .env
$ git status --short
?? .env
?? debug.log
?? logs/
?? node_modules/
$ cat > .gitignore <<'EOF'
node_modules/
.env
*.log
EOF
$ git status --short                     # 無視したものは出なくなる
?? .gitignore
$ git check-ignore -v logs/app.log       # どのファイルの何行目のパターンで無視されたか（-v: verbose）
.gitignore:3:*.log	logs/app.log
$ git check-ignore -v hello.js           # 無視されていなければ、何も出ない
$ git add .gitignore && git commit -m ".gitignore を追加"
```

### 13.3 既にコミットしてしまったファイル

`.gitignore` は「まだ Git が追跡していないファイル」にしか効きません。既にコミットしたファイルを無視したいときは、追跡をやめる必要があります。

```sh
$ git rm --cached .env          # --cached: Git の追跡から外すだけで、手元のファイルは残す
$ echo ".env" >> .gitignore
$ git add .gitignore && git commit -m ".env を追跡しないようにする"
```

> **秘密の情報をコミットしてしまったら**: 上の操作をしても、**過去のコミットには秘密の情報が残っています**。GitHub に push していたら、誰かに見られた可能性があります。まず、その API キーやパスワードを**使えなくして、新しいものに取り替える**ことがいちばん先です。

### 13.4 改行コードをそろえる

第1章の練習問題7で見たように、Windows の CRLF が混ざるとスクリプトが動かなくなります。リポジトリに `.gitattributes` というファイルを置くと、Git が改行コードを LF にそろえてくれます（例: [samples/gitattributes.sample](samples/gitattributes.sample)）。

```
* text=auto eol=lf
```

---

## まとめ

- Git は手元で動く履歴の記録、GitHub はそれを共有する場所。
- 作業ツリー → `git add` → ステージ → `git commit` → リポジトリ。迷ったら `git status`。
- コミットはその時点のすべてのファイルの記録、ブランチはコミットIDを書いたファイル、HEAD は今いるブランチ。
- コミットしたものは reflog で取り戻せる。共有したコミットは書き換えず、`git revert` で打ち消す。
- 同じ場所を変えるとコンフリクトになる。「あるべき内容」に書き直して `add` → `commit`。
- SSH の秘密鍵は渡さない。公開鍵を GitHub に登録する。初めての接続では fingerprint を確かめる。
- 変更はブランチ → push → PR → マージで取り込む。秘密の情報は `.gitignore` で最初から外す。

## 練習問題

[exercises/README.md](exercises/README.md) に12問あります（基本・応用・発展の順）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Pro Git（日本語版、無料）: https://git-scm.com/book/ja/v2 　「Git の内側」の章は5節の理解を深めます
- GitHub Docs（日本語）: https://docs.github.com/ja
- GitHub の SSH 鍵の fingerprint: https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints

前の章: [第2章 Homebrew と Node.js のインストール](../ch02-homebrew-node/README.md) ／ 次の章: [第4章 エディタとデバッガ](../ch04-editor-debugger/README.md)
