# 第3章 Git と GitHub

この章では、ファイルの変更の履歴を記録する **Git** と、それをインターネット上で共有する **GitHub** を学びます。この教材の残りの部では、作るものをすべて Git で管理します。
コマンドの使い方だけでなく、**Git が中で何を記録しているか**（コミットとブランチの正体）も見ていきます。中身を知っていると、困ったときに「何が起きて、どう戻せばよいか」を自分で判断できるようになります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第1章（コマンドとオプションの形、リダイレクト、権限）、第2章（Homebrew） |
| この章のゴール | 3つの領域（作業ツリー・ステージ・リポジトリ）を説明できる / コミット、ブランチ、マージができる / 失敗を安全に取り消せる / SSH で GitHub に接続し、プルリクエストで変更を取り込める |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 練習用のリポジトリを作るスクリプト、設定ファイルの例 |
| [exercises/](exercises/) | 練習問題と、問題用のリポジトリを作るスクリプト |
| [solutions/](solutions/) | 模範解答 |

> **読み方**: `$` で始まる行は、自分で打つコマンドです（`$` は打ちません）。`#` から後ろは説明のためのコメントです。`$` の付いていない行は、コマンドの結果の例です。コミットID（`4d9285f` のような英数字）は、打つ日時や人によって変わります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場所 |
| --- | --- |
| `git init`・`add`・`commit`・`status`・`log`・`diff`（3節、4節） | 第3部・第4部・第5部の成果物は、どれも `git init` から始めます。動くところまで作るたびにコミットし、壊したら戻れるようにします |
| 取り消し（6節） | 練習で「動かなくなった」ときに、動いていた時点に戻すのに使います |
| ブランチとマージ（7節、8節） | 第5部以降のタスク管理アプリは、機能を足すたびにブランチを作って進めます |
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

**リポジトリ**は、Git が履歴を記録しているフォルダのことです。Git は**分散型**と呼ばれ、GitHub の上のリポジトリも、自分の Mac の中のリポジトリも、同じ履歴を丸ごと持った対等なコピーです。GitHub は「みんなが、共有の場所として使うことにした1つのコピー」です。

### 1.1 インストールの確認

第2章のとおり、Xcode Command Line Tools に git が入っています。新しい版を使うときは Homebrew で入れます。

```sh
$ git --version           # --version: バージョンを表示する
git version 2.51.0
$ which -a git            # /opt/homebrew/bin/git が先なら Homebrew の版が使われる（第2章4.4節）
$ brew install git        # Homebrew の版を入れるとき
```

## 2. 最初の設定

Git の設定は `git config 名前 値` の形で書きます。`--global` を付けると、自分のすべてのリポジトリに効く設定になり、`~/.gitconfig` というファイルに保存されます。

```sh
# コミットに記録される名前とメールアドレス（必ず設定する）
$ git config --global user.name "Alice Example"
$ git config --global user.email "あなたのGitHubのnoreplyアドレス"

# 新しく作るリポジトリの、最初のブランチの名前を main にする（ブランチは7節）
$ git config --global init.defaultBranch main

# コミットのメッセージなどを書くエディタを VS Code にする（第4章で code コマンドを使えるようにします）
$ git config --global core.editor "code --wait"

# git pull で、知らないうちにマージのコミットを作らない（10.3節で説明）
$ git config --global pull.ff only

# 日本語のファイル名を "\346\227\245..." ではなく、そのまま表示する
$ git config --global core.quotepath false
```

設定を確かめるコマンドです。

```sh
$ git config user.name                    # 1つの設定の値を表示する
Alice Example
$ git config --list --show-origin         # --list: すべての設定 / --show-origin: どのファイルに書かれているかも表示
file:/Users/alice/.gitconfig    user.name=Alice Example
...
$ cat ~/.gitconfig                        # 設定ファイルの中身
[user]
	name = Alice Example
	email = ...
```

`user.name` は、本名でなくてもかまいません。GitHub のユーザー名などでもよいです。

**メールアドレスについて**: コミットに記録したメールアドレスは、リポジトリを公開すると誰でも見られます。個人のアドレスを公開したくない場合は、GitHub の Settings → Emails にある `12345678+username@users.noreply.github.com` という形のアドレスを使います（同じ画面の「Keep my email addresses private」もオンにします）。

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
- **ステージ**（インデックスとも呼びます）: 「次のコミットに入れるもの」を並べておく場所。`git add` で、作業ツリーからここにコピーします。
- **リポジトリ**: `.git` という隠しフォルダ（第1章3.1節）の中にある、コミットの履歴。`git commit` で、ステージの内容をそのまま1つの**コミット**（その時点の記録）として残します。

ステージがあるので、「たくさん変えたうちの一部だけをコミットする」ことができます。

## 4. 基本の操作

### 4.1 リポジトリを作る: git init

```sh
$ mkdir -p ~/dev/hello-git && cd ~/dev/hello-git
$ git init                       # 今いるフォルダに .git を作り、リポジトリにする
Initialized empty Git repository in /Users/alice/dev/hello-git/.git/
$ ls -a                          # -a: 隠しファイルも表示（第1章3.1節）
.	..	.git
```

### 4.2 状態を見る: git status

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

英語のメッセージを読む練習をしましょう。

| 表示 | 意味 |
| --- | --- |
| `On branch main` | 今 `main` というブランチにいる（7節） |
| `No commits yet` | まだコミットが1つも無い |
| `Untracked files` | Git がまだ記録していない（追跡していない）ファイル |
| `(use "git add <file>..." ...)` | 次に何をすればよいかのヒント。`<file>` はファイル名に置き換える |

### 4.3 記録する: git add と git commit

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
- `git commit` の結果の `4d9285f` が、このコミットの**コミットID**（コミットの名前）です。
- `-m` を付けないと、メッセージを書くためのエディタが開きます（2節の `core.editor`）。

`git add` には、ファイル名の代わりに次の書き方もできます。

| 書き方 | 意味 |
| --- | --- |
| `git add ファイル名` | そのファイルだけ |
| `git add .` | 今いるフォルダの中の、変更したファイルすべて（`.` は今いるフォルダ。第1章2.2節） |
| `git add -A` | リポジトリ全体の、変更したファイルすべて（all） |

### 4.4 変更を見る: git diff

ファイルを変えると、`git status` は `modified` と表示します。

```sh
$ echo "練習用のリポジトリです" >> README.md    # 最後に1行足す
$ git status
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   README.md
$ git status --short             # --short: 1ファイル1行の短い表示
 M README.md
```

`--short` の左の2文字は、「ステージ」と「作業ツリー」の状態です。

| 表示 | 意味 |
| --- | --- |
| ` M`（左が空白） | 作業ツリーで変更したが、まだ `add` していない |
| `M `（右が空白） | 変更して、`add` した |
| `A ` | 新しいファイルを `add` した |
| `??` | Git がまだ追跡していないファイル |

何を変えたかは `git diff` で見ます。

```sh
$ git diff                       # 作業ツリーとステージの違い（まだ add していない変更）
diff --git a/README.md b/README.md
index 8954bb9..dcb6241 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
 # hello
+練習用のリポジトリです
```

`+` で始まる行が足した行、`-` で始まる行が消した行です。`add` した後は `git diff` には何も出なくなり、代わりに `git diff --staged` で見られます。

| 見たいもの | コマンド |
| --- | --- |
| まだ `add` していない変更 | `git diff` |
| `add` した変更（次のコミットに入る変更） | `git diff --staged` |

### 4.5 履歴を見る: git log

```sh
$ git add README.md && git commit -m "説明を追加"
$ git log                        # 新しい順に、すべてのコミットを詳しく表示（q で終わる）
commit 19f366bfb81ddc8c2fcb195314a12b1c99cfd3c1
Author: Alice Example <alice@example.com>
Date:   Sat Nov 7 15:15:28 2026 +0900

    説明を追加

commit 4d9285f61cb688befeff7726cfab4a698d64a7ab
Author: Alice Example <alice@example.com>
Date:   Sat Nov 7 15:15:28 2026 +0900

    README を追加
$ git log --oneline              # --oneline: 1つのコミットを1行で
19f366b 説明を追加
4d9285f README を追加
```

コミットIDは40文字ありますが、ふつうは最初の7文字くらいで指定できます。`git log` は、長いときは `less` と同じ画面（第1章3.5節）で表示されるので、`q` で終わります。

よく使うオプション:

| オプション | 意味 |
| --- | --- |
| `--oneline` | 1つのコミットを1行で表示する |
| `--graph` | ブランチの枝分かれを、線の図で表示する（7節、8節で使います） |
| `--all` | 今いるブランチだけでなく、すべてのブランチのコミットを表示する |
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

**コミットの単位**: 1つのコミットには「1つの意味のある変更」だけを入れます。「ログイン機能の追加」と「関係ないタイプミスの修正」は、別々のコミットにします。後で問題が見つかったとき、そのコミットだけを取り消せるからです。

**コミットのメッセージ**: 1行目に「何をしたか」を短く書きます。必要なら1行空けて「なぜそうしたか」を書きます。

```
タスクの期限切れを赤く表示する

期限を過ぎたタスクに気づかないという意見があったため。
期限が今日のものは対象外にした（今日中に終わらせる可能性があるため）。
```

## 5. Git の中身をのぞく

この節は、Git が中でどう記録しているかを見ます。使い方を覚えるだけなら読み飛ばしてもかまいませんが、6節以降の「なぜそうなるか」が分かりやすくなります。

`.git` フォルダの中には、すべての履歴が**オブジェクト**として保存されています。まず3種類を押さえます。

| 種類 | 中身 | たとえると |
| --- | --- | --- |
| blob（ブロブ） | ファイルの中身だけ（ファイル名は持たない） | ファイルの中身 |
| tree（ツリー） | 「名前 → blob または tree」の一覧 | フォルダ |
| commit（コミット） | いちばん上の tree、親のコミット、作者、日時、メッセージ | ある時点の、すべてのファイルの記録 |

それぞれのオブジェクトには、中身から計算した40文字の英数字（**ハッシュ**）が名前として付きます。コミットIDは、このハッシュです。中身が1文字でも変わればハッシュも変わるので、**過去の履歴をこっそり書き換えることはできません**。

[samples/make-sample-repo.sh](samples/make-sample-repo.sh) で作る小さなリポジトリで確かめてみましょう。作者と日時を決めて作っているので、誰が作っても同じハッシュになります。

`git cat-file` は、オブジェクトを表示するコマンドです。`-t` で種類（type）を、`-p` で中身を読みやすく（pretty print）表示します。

```sh
$ cd このフォルダ
$ bash samples/make-sample-repo.sh ~/dev/git-sample
$ cd ~/dev/git-sample
$ git cat-file -t HEAD          # HEAD（今いるコミット。5.1節）の種類
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
```

- コミットの中身の `tree` が、そのコミットの時点の、いちばん上のフォルダです。`parent` が1つ前のコミットです。
- tree の中身の1行が、1つのファイルかフォルダです。`100644` はふつうのファイル、`040000` はフォルダの印です。

コミットは「前のコミットからの差分」ではなく、**その時点のすべてのファイルの記録**を指しています。ただし、変えていないファイルやフォルダは、前と同じハッシュのオブジェクトを指すだけなので、容量はほとんど増えません。

### 5.1 ブランチと HEAD の正体

```sh
$ cat .git/HEAD
ref: refs/heads/main
$ cat .git/refs/heads/main
4c2032f...（コミットID）
```

- **ブランチ**は「あるコミットIDを書いた、小さなファイル」です。コミットするたびに、今のブランチのファイルが、新しいコミットIDに書き換わります。
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

**`--amend`** の使い方の例です。コミットした後に、ファイルの入れ忘れに気づいたとき:

```sh
$ git add 入れ忘れたファイル
$ git commit --amend -m "README を追加"   # 直前のコミットを、今のステージの内容で作り直す
```

**コミットの指定**: `HEAD` は今いるコミット、`HEAD~1` は「HEAD の1つ前（親）のコミット」、`HEAD~2` は2つ前です。コミットIDの代わりに使えます。

`git reset` には、どこまで戻すかを決める3つのオプションがあります。

| オプション | ブランチの位置 | ステージ | 作業ツリー | 使いどころ |
| --- | --- | --- | --- | --- |
| `--soft` | 戻す | そのまま | そのまま | 直前のいくつかのコミットを、まとめてやり直したい |
| `--mixed`（何も付けないとき） | 戻す | 戻す | そのまま | コミットを取り消して、変更は手元に残したい |
| `--hard` | 戻す | 戻す | **戻す** | すべてを捨てて、その時点に戻したい |

```sh
$ git reset HEAD~1               # 直前のコミットを取り消す。変更は作業ツリーに残る
$ git reset --hard HEAD~1        # 直前のコミットを取り消し、変更も捨てる（注意）
```

### 6.1 reflog: 最後の命綱

`git reset --hard` で消してしまったコミットも、すぐには消えていません。**reflog** には、HEAD がこれまでに指したコミットの記録が残っています（既定で90日間）。

```sh
$ git reflog
0922511 HEAD@{0}: reset: moving to HEAD~1
6624598 HEAD@{1}: commit: 設定を追加
...
$ git reset --hard 6624598       # 消したコミットに戻る
```

いちばん上が最新です。`HEAD@{1}` は「1つ前に HEAD が指していたもの」です。

コミットさえしておけば、Git はほとんどのことから元に戻せます。逆に、**一度もコミットもステージもしていない変更**は Git にも記録が無いので、`git restore` や `git reset --hard` で消すと戻せません。

### 6.2 共有したコミットは書き換えない

`--amend` や `reset` は、コミットを**作り直す**（ID が変わる）操作です。GitHub に送って（push。10節）ほかの人が取り込んだ後に作り直すと、相手の履歴と食い違って混乱します。**push したコミットを取り消すときは `git revert`** を使いましょう。

```sh
$ git revert 0922511             # 0922511 の変更を打ち消す、新しいコミットを作る（メッセージのエディタが開く）
$ git revert --no-edit 0922511   # --no-edit: メッセージを自動のまま使い、エディタを開かない
```

## 7. ブランチ

ブランチを使うと、main を壊さずに、新しい機能を試せます。

```sh
$ git switch -c feature/login     # ブランチを作って、そこに切り替える（-c: create）
Switched to a new branch 'feature/login'
$ git branch                      # ブランチの一覧（* が今いるブランチ）
* feature/login
  main
$ git switch main                 # main に切り替える
$ git branch -d feature/login     # ブランチを消す（-d: delete。マージ済みのものだけ。-D で強制的に）
```

ブランチの名前の `/` は、ただの文字です。`feature/〇〇`（機能の追加）、`fix/〇〇`（直す）のように、種類が分かる名前を付けるとよく使われます。

`git checkout` でもブランチを切り替えられますが、`checkout` はファイルを元に戻す働きなども持っていて紛らわしいので、この教材では新しい `switch`（ブランチの切り替え）と `restore`（ファイルを元に戻す）を使います。

切り替える前に、作業中の変更はコミットしておきましょう。一時的に変更をよけておきたいときは、`git stash`（よけておく）と `git stash pop`（戻す）が使えます。

## 8. マージ

`git merge ブランチ` は、指定したブランチの変更を、今いるブランチに取り込みます。状況によって2通りの結果になります。

**fast-forward（早送り）**: main が、ブランチを作った後に進んでいないなら、main の印を、ブランチの先まで動かすだけで済みます。新しいコミットは作られません。

```
前:  main                 後:              main
      ↓                                     ↓
  ○───○───○───○       →    ○───○───○───○
           ↑                            ↑
         feature                      feature
```

**3-way マージ**: main も feature も進んでいる場合は、2つの親を持つ**マージコミット**が作られます。

```
          ○───○  feature                       ○───○
         /                    →               /     \
  ○───○───○───○  main                 ○───○───○───○───◎  main（マージコミット）
```

`git log --oneline --graph` で、この形を確かめられます。

```sh
$ git log --oneline --graph
*   a1b2c3d Merge branch 'feature'
|\
| * 1111111 feature の2つ目
| * 2222222 feature の1つ目
* | 3333333 main の変更
|/
* 4444444 最初のコミット
```

`*` が1つのコミット、`|`・`\`・`/` が枝の線です。

`git merge --no-ff ブランチ` とすると、fast-forward できる場合でも、マージコミットを作ります（no fast-forward）。「この機能は、ここでまとめて取り込んだ」という区切りを履歴に残したいときに使います。GitHub のプルリクエストの「Merge pull request」ボタンも、ふつうはこの形になります。

### 8.1 コンフリクト（衝突）

2つのブランチが**同じファイルの同じ場所**を別々に変えていると、Git はどちらを使えばよいか決められず、マージを途中で止めます。

```sh
$ git merge feature/default-name
Auto-merging src/greet.js
CONFLICT (content): Merge conflict in src/greet.js
Automatic merge failed; fix conflicts and then commit the result.
$ cat src/greet.js
<<<<<<< HEAD
export function greet(name) {
  return 'こんにちは、' + name + 'さん！';
=======
export function greet(name = 'ゲスト') {
  return `Hello, ${name}!`;
>>>>>>> feature/default-name
}
```

`<<<<<<< HEAD` から `=======` までが今いるブランチ（main）の内容、`=======` から `>>>>>>>` までが取り込もうとしているブランチの内容です。解消の手順は次のとおりです。

1. ファイルを開き、**最終的にあるべき内容**に書き直す（片方を選ぶとは限りません。両方の意図を活かすことが多いです）。`<<<<<<<`・`=======`・`>>>>>>>` の行は、すべて消す。
2. `git add ファイル` で「解消した」と Git に伝える。
3. `git commit`（メッセージは自動で入っているので、エディタを閉じるだけでよい。`git commit --no-edit` ならエディタも開かない）。

途中でやめたいときは `git merge --abort` で、マージを始める前の状態に戻せます。VS Code では、コンフリクトのあるファイルを開くと「Accept Current / Accept Incoming / Accept Both」のボタンが使えます（第4章）。

[samples/make-conflict-repo.sh](samples/make-conflict-repo.sh) で、このコンフリクトを作れます（練習問題で使います）。

## 9. リベース

`git rebase main` は、今のブランチのコミットを、main の先の上に**作り直して**並べ替えます。

```
前:        ○───○  feature                後:                ○'──○'  feature
          /                                                 /
  ○───○───○───○  main                  ○───○───○───○  main
```

マージコミットができないので、履歴が1本の線になり、読みやすくなります。一方で、コミットを作り直す（ID が変わる）ので、6.2節と同じ注意が要ります。

> **リベースの決まり**: 自分しか使っていないブランチにだけ使う。他の人と共有しているブランチ（特に main）をリベースしない。

リベースの途中でコンフリクトが起きたら、8.1節と同じように直して `git add` した後、`git commit` ではなく `git rebase --continue` を打ちます。やめたいときは `git rebase --abort` です。

この教材では、ふだんはマージを使い、自分の作業ブランチを最新の main に追いつかせたいときにだけリベースを使います。

## 10. リモートと GitHub

### 10.1 リモートの基本

**リモート**は、別の場所にある、同じプロジェクトのリポジトリです。GitHub の上のリポジトリが代表です。

```sh
$ git clone git@github.com:ユーザー名/リポジトリ.git    # GitHub のリポジトリの複製を、手元に作る
$ git remote -v                                       # 登録されているリモートの一覧（-v: URL も表示）
origin  git@github.com:ユーザー名/リポジトリ.git (fetch)
origin  git@github.com:ユーザー名/リポジトリ.git (push)
$ git remote add origin git@github.com:ユーザー名/リポジトリ.git   # 手元で作ったリポジトリに、後から登録する
```

`git clone` すると、複製の元が `origin` という名前で登録されます。

| コマンド | 働き |
| --- | --- |
| `git fetch` | リモートの新しいコミットを取ってくる。**自分のブランチは動かさない** |
| `git pull` | `fetch` した後、今のブランチに取り込む（`fetch` と `merge` を続けて行う） |
| `git push` | 自分のコミットを、リモートに送る |
| `git push -u origin ブランチ` | 初めて push するとき。`-u` で「このブランチは、リモートの同じ名前のブランチと対応する」と記録し、次からは `git push` だけで済む |

`fetch` すると、リモートのブランチの位置は、`origin/main` のような名前（**リモート追跡ブランチ**）で手元に記録されます。

```sh
$ git fetch
$ git status
Your branch is behind 'origin/main' by 2 commits, and can be fast-forwarded.
$ git log --oneline main..origin/main     # origin/main にあって、main に無いコミット
```

`Your branch is behind ... by 2 commits` は「手元の main は、origin/main より2つ遅れている」という意味です。`A..B` は「B にあって A に無いコミット」を表す書き方です。

### 10.2 push が断られるとき

ほかの人が先に push していると、自分の push は断られます。

```
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '...'
hint: Updates were rejected because the remote contains work that you do not have locally.
```

リモートの履歴を上書きしてしまわないための安全装置です。先にリモートの変更を取り込んでから、もう一度 push します。

### 10.3 pull の設定

`pull.ff only`（2節で設定）にしておくと、`git pull` は fast-forward できるときだけ取り込み、手元とリモートの両方に新しいコミットがある（枝分かれしている）ときは止まります。止まったら、状況を見て選びます。

```sh
$ git pull --rebase     # 自分のコミットを、リモートの先の上に作り直す（履歴が1本になる）
$ git pull --no-rebase  # マージコミットを作って取り込む
```

設定しないと、気づかないうちに `Merge branch 'main' of github.com:...` という、意味の薄いマージコミットが増えていきます。

[samples/make-remote-practice.sh](samples/make-remote-practice.sh) を使うと、GitHub を使わずに、手元のフォルダだけで「2人が同じリポジトリに push する」状況を作れます（練習問題で使います）。

## 11. SSH で GitHub に接続する

GitHub に push するには、本人であることを示す必要があります。方法は **SSH 鍵**と **HTTPS + トークン**の2つがあり、この教材では SSH 鍵を使います。

### 11.1 公開鍵と秘密鍵

SSH 鍵は、2つのファイルの組です。

| ファイル | 名前 | 扱い |
| --- | --- | --- |
| `~/.ssh/id_ed25519` | 秘密鍵 | **絶対に他人に渡さない**。権限は `600`（第1章8.2節） |
| `~/.ssh/id_ed25519.pub` | 公開鍵 | GitHub に登録する。見られても問題ない |

秘密鍵で作った「署名」は、組になっている公開鍵でだけ確かめられます。GitHub は、登録された公開鍵で署名を確かめ、「この秘密鍵を持っている人＝本人」と判断します。秘密鍵そのものはネットワークに流れません。仕組みは第2部 第8章（HTTPS と TLS）で詳しく学びます。

### 11.2 鍵を作る

```sh
$ ls -la ~/.ssh                         # 既に鍵があるか確かめる（id_ed25519 があれば作らなくてよい）
$ ssh-keygen -t ed25519 -C "GitHubのメールアドレス"
Enter file in which to save the key (/Users/alice/.ssh/id_ed25519):   ← そのまま Return
Enter passphrase (empty for no passphrase):                            ← パスフレーズを打つ（おすすめ）
Enter same passphrase again:                                           ← もう一度
```

- `ssh-keygen` は、SSH の鍵を作るコマンドです（key generate）。
- `-t ed25519` は鍵の種類（type）です。今のおすすめで、短く安全です。
- `-C` はコメント（comment）で、どの鍵かを見分けるためのラベルです。
- **パスフレーズ**は、秘密鍵を守るパスワードです。Mac を盗まれても、パスフレーズが無ければ鍵は使えません。打っても画面には表示されません。毎回打つ手間は、次の 11.3節の設定で省けます。

`ls -l ~/.ssh` で、秘密鍵の権限が `-rw-------`（`600`）になっていることを確かめましょう。秘密鍵が他人にも読める権限になっていると、`ssh` は「危ない」と判断して、その鍵を使いません。

### 11.3 キーチェーンに覚えさせる（Mac だけの設定）

`~/.ssh/config` に次の内容を書きます（ファイルが無ければ作ります。`code ~/.ssh/config` などで開けます）。

```
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

- `Host github.com` は「github.com に接続するときの設定」という意味です。
- `UseKeychain yes` は macOS だけの設定で、パスフレーズを macOS のキーチェーン（パスワードを保存する仕組み）に保存します。
- `AddKeysToAgent yes` は、鍵を ssh-agent（鍵を覚えておくプログラム）に自動で登録します。
- `IdentityFile` は、使う秘密鍵の場所です。

```sh
$ ssh-add --apple-use-keychain ~/.ssh/id_ed25519   # 一度パスフレーズを打てば、次からは聞かれない
```

[samples/ssh-config.sample](samples/ssh-config.sample) に例があります。

### 11.4 GitHub に公開鍵を登録する

```sh
$ pbcopy < ~/.ssh/id_ed25519.pub     # 公開鍵（.pub の方）を、クリップボードにコピーする（第1章12節）
```

GitHub の Settings → SSH and GPG keys → New SSH key で、Title に「MacBook Air 2026」など分かりやすい名前を付け、Key に貼り付けて保存します。

接続を確かめます。`ssh -T` は、ログインはせずに、接続と本人の確認だけをするオプションです。

```sh
$ ssh -T git@github.com
The authenticity of host 'github.com (...)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

初めて接続するときは、**接続先が本物の GitHub か**を確かめるように求められます。表示された fingerprint（接続先の鍵の指紋）が、GitHub の公式ドキュメント「GitHub's SSH key fingerprints」（参考資料のリンク）に書かれた値と同じことを確かめてから `yes` と打ちます。確かめた相手は `~/.ssh/known_hosts` に記録され、次からは聞かれません。

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

**プルリクエスト**（PR）は、「このブランチの変更を main に取り込んでください」という依頼です。変更の中身（差分）、話し合い（コメント）、自動のテストの結果（第11部）を、GitHub の1つの画面にまとめられます。

一人で開発するときも PR を使うと、変更の単位がはっきりし、後から「なぜこの変更をしたか」を振り返りやすくなります。この教材では、次の流れ（**GitHub Flow**）で進めます。

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

PR の説明に書くことを、あらかじめ用意しておく **PR テンプレート**も使えます。リポジトリに `.github/pull_request_template.md` を置くと、PR を作るときに自動で入力されます。例は [samples/pull_request_template.md](samples/pull_request_template.md) です。

## 13. .gitignore: コミットしないファイル

`.gitignore` というファイルに書いたパターンに当てはまるファイルは、`git status` に表示されず、`git add .` でもステージに入りません。リポジトリのいちばん上のフォルダに置きます。

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
$ mkdir -p ~/.config/git                         # -p: 途中のフォルダもまとめて作る（第1章3.2節）
$ echo ".DS_Store" >> ~/.config/git/ignore       # Git が、設定しなくても読む場所
```

例: [samples/global-gitignore.sample](samples/global-gitignore.sample)

### 13.2 無視されているか確かめる

```sh
$ git check-ignore -v logs/app.log      # -v: どのファイルの何行目のパターンで無視されたかも表示（verbose）
.gitignore:12:*.log	logs/app.log
```

無視されていなければ、何も表示されません。

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

[exercises/README.md](exercises/README.md) にあります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Pro Git（日本語版、無料）: https://git-scm.com/book/ja/v2 　「Git の内側」の章は5節の理解を深めます
- GitHub Docs（日本語）: https://docs.github.com/ja
- GitHub の SSH 鍵の fingerprint: https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints

前の章: [第2章 Homebrew と Node.js のインストール](../ch02-homebrew-node/README.md) ／ 次の章: [第4章 エディタとデバッガ](../ch04-editor-debugger/README.md)
