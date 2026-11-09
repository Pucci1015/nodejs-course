# 第3章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。

| ファイル | 内容 |
| --- | --- |
| [gitignore-answer](gitignore-answer) | 問題8 の `.gitignore`（ファイル名を `.gitignore` に変えて使う） |

コミットIDは、コミットした日時や人によって変わります。練習用のスクリプトで作った直後のコミットは日時を決めて作っているので、ここに書いた ID と同じになります。`--amend`・`revert`・`rebase` などで新しく作ったコミットや、問題1〜4 のように自分で作ったコミットは、人によって違う ID になります。

---

## 問題1 最初のリポジトリと git status

```sh
$ mkdir -p ~/dev/git-basic && cd ~/dev/git-basic
$ git init
Initialized empty Git repository in /Users/alice/dev/git-basic/.git/
$ ls -a
.	..	.git
```

1. `.git` という隠しフォルダができました。ここに、これからの履歴がすべて記録されます。

```sh
$ echo "# 買い物メモ" > memo.md
$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	memo.md
```

2. `Untracked files` の下です。「Git がまだ記録していない（追跡していない）ファイル」という意味です。

```sh
$ git add memo.md
$ git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   memo.md
```

3. `Changes to be committed`（次のコミットに入る変更）に変わりました。`new file` は「新しいファイル」です。

```sh
$ git commit -m "メモを作成"
[main (root-commit) e97e97d] メモを作成
 1 file changed, 1 insertion(+)
 create mode 100644 memo.md
$ git status
On branch main
nothing to commit, working tree clean
```

4. `nothing to commit, working tree clean`（コミットするものは無く、作業ツリーはきれい）と表示されました。3つの領域の中身がすべて同じ、という意味です。

```sh
$ echo "- 牛乳" >> memo.md
$ git add memo.md && git commit -m "牛乳を追加"
$ echo "- 卵" >> memo.md
$ git add memo.md && git commit -m "卵を追加"
$ git log --oneline
d0c7b3d 卵を追加
2017fcf 牛乳を追加
e97e97d メモを作成
```

5. 新しいコミットが上に表示されます。

## 問題2 変更を見る

```sh
$ echo "- パン" >> memo.md
$ echo "メモ" > todo.md
$ git status --short
 M memo.md
?? todo.md
```

1. `memo.md` は追跡していて、変えたがまだ `add` していないので ` M`（左が空白、右が M）です。`todo.md` は新しいファイルでまだ追跡していないので `??` です。

```sh
$ git diff
diff --git a/memo.md b/memo.md
index daba20a..1cb3dfb 100644
--- a/memo.md
+++ b/memo.md
@@ -1,3 +1,4 @@
 # 買い物メモ
 - 牛乳
 - 卵
+- パン
```

2. `+- パン` の行が足した行です。行の最初の `+` が「足した」の印で、その後ろの `- パン` が行の中身です。`+` も `-` も付いていない行は、変わった場所が分かるように表示されている、前後の行です。`todo.md` は追跡していないので、`git diff` には出ません。

```sh
$ git add memo.md
$ git diff                 # 何も表示されない
$ git diff --staged        # 上と同じ、memo.md の差分が表示される
```

3. `git diff` は「作業ツリーとステージの違い」なので、`add` した後は違いが無くなり、何も表示されません。`git diff --staged` は「ステージと最新のコミットの違い」なので、`add` した変更（次のコミットに入る変更）が表示されます。

```sh
$ git status --short
M  memo.md
?? todo.md
```

4. `memo.md` が ` M` から `M `（左が M、右が空白）に変わりました。左の文字はステージの状態、右の文字は作業ツリーの状態です。「変更はステージに入っていて、作業ツリーにはそれ以上の変更が無い」という意味です。

```sh
$ git add todo.md
$ git commit -m "パンと todo を追加"
$ git log -n 1 -p
commit f6ade0f...
Author: Alice Example <alice@example.com>
Date:   ...

    パンと todo を追加

diff --git a/memo.md b/memo.md
...
+- パン
diff --git a/todo.md b/todo.md
new file mode 100644
...
+メモ
```

5. `-n 1` で最新の1つだけ、`-p` で差分も表示されます。1つのコミットで2つのファイルを変えたことが分かります。

## 問題3 小さな取り消し

```sh
$ echo "- まちがい" >> memo.md
$ git restore memo.md
$ cat memo.md
# 買い物メモ
- 牛乳
- 卵
- パン
```

1. 足した `- まちがい` の行が消え、最後のコミットのときの内容に戻りました。

```sh
$ echo "下書き" > draft.md
$ git add draft.md
$ git restore --staged draft.md
$ git status --short
?? draft.md
```

2. `git restore --staged` で、ステージから外れました。ファイルは消えずに残り、「まだ追跡していないファイル（`??`）」に戻っています。

```sh
$ rm draft.md
$ echo "- バター" >> memo.md
$ git add memo.md && git commit -m "バタをー追加"
$ git log --oneline -n 2
6a0efd2 バタをー追加
f6ade0f パンと todo を追加
$ git commit --amend -m "バターを追加"
$ git log --oneline -n 2
5bb70c7 バターを追加
f6ade0f パンと todo を追加
```

3. メッセージが直り、**コミットIDも変わりました**（`6a0efd2` → `5bb70c7`）。`--amend` は、直前のコミットを直すのではなく、新しいコミットを作って置き換えるからです（本文6.2節）。

4. **取り戻せません。** `- まちがい` の行は、一度もコミットもステージ（`add`）もしていないので、Git には記録が残っていません（本文6.1節）。`git restore ファイル` は、捨てる前によく確かめてから使います。

## 問題4 ブランチを作ってマージする

```sh
$ git switch -c feature/fruits
Switched to a new branch 'feature/fruits'
$ git branch
* feature/fruits
  main
```

1. `*` の付いた `feature/fruits` にいます。

```sh
$ echo "- りんご" >> memo.md
$ git add memo.md && git commit -m "りんごを追加"
$ git log --oneline --graph --all
* 01c3469 (HEAD -> feature/fruits) りんごを追加
* 5bb70c7 (main) バターを追加
* f6ade0f パンと todo を追加
...
```

2. `feature/fruits` は新しい「りんごを追加」を、`main` は1つ前の「バターを追加」を指しています。`HEAD -> feature/fruits` は「今いるのは feature/fruits」という意味です。

```sh
$ git switch main
$ cat memo.md
# 買い物メモ
- 牛乳
- 卵
- パン
- バター
```

3. `- りんご` は**ありません**。りんごのコミットは `feature/fruits` にだけあり、`main` はその前のコミットを指しているからです。ブランチを切り替えると、作業ツリーのファイルも、そのブランチのコミットの内容に変わります。

```sh
$ git merge feature/fruits
Updating 5bb70c7..01c3469
Fast-forward
 memo.md | 1 +
 1 file changed, 1 insertion(+)
```

4. `Fast-forward` と表示されたので、fast-forward です。`feature/fruits` を作った後、`main` は1つも進んでいないので、`main` の印を `feature/fruits` の先（`01c3469`）まで動かすだけで済んだからです。新しいコミットは作られていません。

```sh
$ git branch -d feature/fruits
Deleted branch feature/fruits (was 01c3469).
```

5. マージ済みなので、`-d` で消せます。消えたのはブランチの印だけで、「りんごを追加」のコミットは `main` に残っています。

## 問題5 やってしまったことを取り消す

```sh
# 1. ステージから外す（ファイルは残る）
$ git restore --staged notes.txt

# 2. 作業ツリーの変更を捨てる
$ git restore src/app.js

# 3. 直前のコミットから .env を取り除き、作り直す
$ git rm --cached .env                  # 追跡から外す（手元の .env は残る）
rm '.env'
$ echo ".env" >> .gitignore
$ git add .gitignore
$ git commit --amend -m "設定を追加"     # 直前のコミットを、今のステージの内容で作り直す
$ git log --oneline
9f67438 設定を追加
0922511 機能Aを追加
1121950 最初のコミット
$ ls -a                                 # .env は手元に残っている
.	..	.env	.git	.gitignore	notes.txt	src
```

3 では、`git show --name-only HEAD` でコミットに入ったファイルの名前を見られます（`.env` が無く、`.gitignore` があれば正解）。

```sh
# 4. reset --hard してしまった後に取り戻す
$ git reset --hard HEAD~1               # （やってしまった操作）
HEAD is now at 0922511 機能Aを追加
$ git reflog
0922511 HEAD@{0}: reset: moving to HEAD~1
9f67438 HEAD@{1}: commit (amend): 設定を追加
6624598 HEAD@{2}: commit: 設定を追加
0922511 HEAD@{3}: commit: 機能Aを追加
1121950 HEAD@{4}: commit (initial): 最初のコミット
$ git reset --hard 9f67438              # 3 で作り直した方（commit (amend)）に戻る
```

4. reflog には、amend する**前**の「設定を追加」（`6624598`。`.env` が入っている）も残っています。間違えてそちらに戻すと、`.env` の入ったコミットが戻ってきます。`commit (amend)` と書かれた方を選びます。

```sh
# 5. 共有したコミットを打ち消す
$ git revert --no-edit 0922511
$ git log --oneline
xxxxxxx Revert "機能Aを追加"
9f67438 設定を追加
0922511 機能Aを追加
1121950 最初のコミット
```

5. 共有したコミットには `git revert` を使います。「機能Aを追加」の変更を打ち消す（`src/feature-a.js` を消す）新しいコミットが足されるだけで、今までの履歴は書き換わりません。`git reset` で消すと、そのコミットを既に持っているほかの人の履歴と食い違ってしまいます（本文6.2節）。

6. まだ安全とは言えない理由の例:
   - amend する前のコミット（`6624598`）が、まだリポジトリの中に残っている（reflog に記録が残っているので、少なくとも90日間は消えない）。
   - 実際の開発では、気づいたときには既に push していることが多い。そうなると、GitHub やほかの人の手元にも、そのコミットが残っている。

   本来すべきこと: **API キーを発行したサービスで、そのキーを使えなくし、新しいキーを作る**（本文13.3節）。そして、`.env` は最初のコミットの前に `.gitignore` に入れておきます。

## 問題6 マージの結果を予想する

1.

   | 操作 | 結果 | 理由 |
   | --- | --- | --- |
   | (3) `merge feature-a` | **fast-forward** | feature-a を作った後、main は1つも進んでいない。main の印を A1 まで動かすだけで済む |
   | (7) `merge feature-b` | **マージコミット** | feature-b を作った後に、main でも M1 をコミットしたので、2つのブランチが枝分かれしている |
   | (10) `merge --no-ff feature-c` | **マージコミット** | 本当は fast-forward できるが、`--no-ff` でマージコミットを作るように指定している |

2. `ex-predict.sh` の最後に表示される図:

   ```
   *   Merge branch 'feature-c'
   |\
   | * C1
   |/
   *   Merge branch 'feature-b'
   |\
   | * B1
   * | M1
   |/
   * A1
   * base
   ```

   A1 は fast-forward で取り込まれたので、main の線の上に、枝分かれせずに並んでいます。「feature-a というブランチがあった」ことは、履歴の形からは分かりません。

3. `--no-ff` を付けないと (10) は fast-forward になり、C1 が main の線の上にそのまま並びます（`Merge branch 'feature-c'` のコミットはできません）。履歴はすっきりしますが、「C1 は feature-c という作業のまとまりだった」ことが分からなくなります。GitHub の PR の「Merge pull request」がマージコミットを作るのは、この区切りを残すためです。

## 問題7 コンフリクトを解消する

```sh
$ git merge feature/default-name
Auto-merging src/greet.js
CONFLICT (content): Merge conflict in src/greet.js
Automatic merge failed; fix conflicts and then commit the result.
$ git status
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   src/greet.js
```

1. `Unmerged paths`（まだマージが終わっていないファイル）の下に、`both modified: src/greet.js`（両方のブランチで変えられた）と表示されます。

2. `<<<<<<< HEAD` から `=======` までが、今いる **main** の内容（日本語のあいさつ）です。`=======` から `>>>>>>> feature/default-name` までが、取り込もうとしている **feature/default-name** の内容（既定値と `` ` `` を使った書き方）です。

3. VS Code などで `src/greet.js` を開き、解答の内容に書き直します。`<<<<<<<`・`=======`・`>>>>>>>` の行もすべて消します。

   ```sh
   $ git add src/greet.js
   $ git commit --no-edit          # マージコミットのメッセージは、自動で用意されている
   ```

4. マージコミットができ、線が2本に分かれて合流しています。

   ```sh
   $ git log --oneline --graph
   *   6fff9a6 Merge branch 'feature/default-name'
   |\
   | * 5c1b3fd 名前を省略したときの既定値を追加
   * | ae64a3e あいさつを日本語にする
   |/
   * cf788aa greet 関数を追加
   ```

5. `README.md` を変えたのは main の「あいさつを日本語にする」（と、最初のコミット）だけです。

   ```sh
   $ git log --oneline --all -- README.md
   ae64a3e あいさつを日本語にする
   cf788aa greet 関数を追加
   ```

   片方のブランチだけが変えたファイルは、Git が自動でその変更を使うので、コンフリクトになりません。また、両方のブランチが同じファイルを変えていても、**変えた場所が離れていれば**自動でマージされます。コンフリクトになるのは「同じ場所（または隣り合う行）を両方が変えた」ときだけです。

   解消のこつは「どちらか片方を選ぶ」ことではなく、**それぞれのブランチが何をしたかったか**（main: 日本語にしたい、feature: 既定値を付けたい・書き方を変えたい）を読み取り、両方を満たす内容にすることです。

## 問題8 要件どおりの .gitignore を書く

解答: [gitignore-answer](gitignore-answer)

```sh
$ cp ../solutions/gitignore-answer ~/dev/git-ignore-practice/.gitignore
$ bash check-gitignore.sh ~/dev/git-ignore-practice
...
NG の数: 0
```

ポイント:

- `node_modules/` は最初に `/` が無いので、**どの深さの** `node_modules` にも当てはまります（`docs/node_modules/` も）。
- `/build/` は最初の `/` で「`.gitignore` と同じ場所の build」だけにしています。`build/` と書くと、`src/build/` まで無視されてしまいます。
- `.env.*` で `.env.local` などをまとめて無視し、`!.env.example` で例外を作っています。**順番が大切**で、`!` の行は、打ち消したい行より**後**に書きます。
- `!logs/keep/important.log` が効くのは、`logs/` というフォルダ自体は無視していないからです。もし `logs/` と書いてフォルダごと無視すると、Git はその中を見に行かないので、中のファイルを `!` で戻すことはできません。

追加の問いへの答え:

1. 次のように、`.gitignore` の7行目の `/build/` で無視されたことが分かります（行の番号は、書き方によって変わります）。

   ```sh
   $ git check-ignore -v build/bundle.js
   .gitignore:7:/build/	build/bundle.js
   ```

2. `.DS_Store` は、プロジェクトではなく「Mac の Finder を使う人」の都合だからです。プロジェクトの `.gitignore` に書き始めると、Windows のファイル、エディタごとのファイル…と、全員の環境の都合を書き足すことになります。自分の `~/.config/git/ignore` に書きます（本文13.1節）。

## 問題9 GitHub で PR の流れを一通り行う

1. 問いへの答え:
   - `~/.ssh/id_ed25519` が秘密鍵、`~/.ssh/id_ed25519.pub` が公開鍵です。GitHub に登録したのは**公開鍵**です。
   - 秘密鍵は **600**（`-rw-------`。自分だけが読み書きできる）です。ほかの人が読める権限（例: `644`）になっていると、ssh は `WARNING: UNPROTECTED PRIVATE KEY FILE!` と表示して、**その鍵を使いません**。他人が読める秘密鍵は、もう秘密ではないからです。
   - fingerprint を確かめないと、接続先が本物の GitHub ではなく、途中で通信を乗っ取った別のサーバ（**中間者攻撃**）でも気づけません。偽のサーバに push すると、コードを盗まれるおそれがあります。公開鍵の登録は「GitHub が自分を確かめる」ためのもの、fingerprint の確認は「自分が GitHub を確かめる」ためのものです。第2部 第8章の証明書の話につながります。

2. 手順の例:

   ```sh
   $ mkdir -p ~/dev/git-practice && cd ~/dev/git-practice
   $ git init
   $ echo "# git-practice" > README.md
   $ cp ~/dev/git-ignore-practice/.gitignore .
   $ git add -A && git commit -m "最初のコミット"
   $ gh repo create git-practice --private --source=. --push
   ```

   gh を使わないときは、GitHub の Web 画面で空のリポジトリを作り、表示された手順に従います。

   ```sh
   $ git remote add origin git@github.com:ユーザー名/git-practice.git
   $ git push -u origin main
   ```

3. 本文12節の流れのとおりです。

   ```sh
   $ git switch main && git pull
   $ git switch -c docs/purpose
   $ code README.md                                   # 目的を書き足す
   $ git add README.md && git commit -m "リポジトリの目的を書く"
   $ git push -u origin docs/purpose
   $ gh pr create                                     # または、push の後に表示された URL を開く
   # GitHub で差分を見直して、Merge pull request を押す
   $ git switch main && git pull
   $ git branch -d docs/purpose
   ```

   GitHub で「Merge pull request」を押すと、GitHub の上でマージコミットが作られます。手元の main は、`git pull` するまでそのコミットを持っていません。

4. テンプレートは、**main にマージされた後**で使われるようになります。テンプレートを足す PR そのものには、まだテンプレートは入力されません。

## 問題10 2人で同じリポジトリに push する

```sh
# 1. Alice
$ cd alice
$ echo "- 買い物: 卵" >> memo.md
$ git add memo.md && git commit -m "卵を追加" && git push

# 2. Bob
$ cd ../bob
$ echo "- 宿題: 数学" >> memo.md
$ git add memo.md && git commit -m "宿題を追加" && git push
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '.../origin.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. ...
```

2. リモートの main は、Alice の「卵を追加」まで進んでいますが、Bob の main はそのコミットを持っていません。Bob の push をそのまま受け入れると、Alice のコミットが消えてしまうので、リモートは断ります（本文10.2節）。

```sh
# 3.
$ git fetch
$ git status
On branch main
Your branch and 'origin/main' have diverged,
and have 1 and 1 different commits each, respectively.
$ git log --oneline --graph --all
* a9294d9 (HEAD -> main) 宿題を追加
| * ea6af14 (origin/main, origin/HEAD) 卵を追加
|/
* 974f939 共有メモを作成
```

3. `fetch` で、リモートの main の位置が `origin/main` として手元に記録されました。Bob の `main` と `origin/main` は「共有メモを作成」から**枝分かれ**していて（diverged）、それぞれ1つずつ、相手の持っていないコミットがあります。`fetch` は Bob の `main` を動かさないので、`memo.md` は何も変わっていません。

```sh
# 4.
$ git pull
fatal: Not possible to fast-forward, aborting.
$ git pull --rebase
CONFLICT (content): Merge conflict in memo.md
error: could not apply a9294d9... 宿題を追加
$ cat memo.md
# 共有メモ

- 買い物: 牛乳
<<<<<<< HEAD
- 買い物: 卵
=======
- 宿題: 数学
>>>>>>> a9294d9 (宿題を追加)
$ code memo.md             # 両方の行を残し、印の行を消す
$ git add memo.md
$ git rebase --continue    # エディタが開いたら、メッセージを確かめて閉じる
$ git push
```

4. `pull.ff only` なので、枝分かれしている状態の `git pull` は、何もせずに止まります。`git pull --rebase` で、Bob のコミットを `origin/main` の先の上に作り直します。2人とも**ファイルの最後**に1行足したので、同じ場所の変更としてコンフリクトになります。両方の行を残せば解消です（行の順番はどちらでもかまいません）。

   リベースの途中では、`<<<<<<< HEAD` の側が**土台にしている側**（ここでは origin/main の「卵」）、もう一方が**作り直している自分のコミット**（「宿題」）です。マージのときと逆に感じるので注意してください。

```sh
# 5. Alice
$ cd ../alice
$ git pull
Updating ea6af14..2e2897b
Fast-forward
$ cat memo.md
# 共有メモ

- 買い物: 牛乳
- 買い物: 卵
- 宿題: 数学
```

5. Bob がリベースしたので、リモートの main は「卵 → 宿題」の1本の線になっています。Alice の main は「卵」までで、その先に Bob のコミットが足されているだけなので、印を進めるだけで追いつけます（fast-forward）。

## 問題11 Git の中身をたどる

```sh
$ git cat-file -p HEAD                 # commit 4c2032f
tree 32fdb513c2182a0859eb24e110aed83af8eceda1
parent 0946517d25edb0c2f09f7b676a983d95adfe998e
...
$ git cat-file -p 32fdb51              # tree 32fdb51（いちばん上のフォルダ）
100644 blob 6d86216eef055f3d37a175d22c7ec1a0e971ed95	README.md
040000 tree e453543522c469981c2ae4c4ead9047ad20d3820	src
$ git cat-file -p e453543              # tree e453543（src フォルダ）
100644 blob 702f4280cee76a8b022e896aedf2bad15b43726f	app.js
100644 blob 702f4280cee76a8b022e896aedf2bad15b43726f	hello.js
$ git cat-file -p 702f428              # blob 702f428（app.js の中身）
console.log("hello");
```

1. たどった順: **commit `4c2032f` → tree `32fdb51` → tree `e453543` → blob `702f428`**

2. `app.js` と `hello.js` は**同じ blob `702f428`** を指しています。blob はファイル名を持たず、中身だけからハッシュを計算するので、**同じ中身のファイルは、名前や場所が違っても1つの blob を共有します**。ファイル名は tree が持っています。同じファイルを何回コピーしても、リポジトリの容量はほとんど増えません。

3. 新しく作られるのは **commit 1、tree 1、blob 1 の3つ**です。

   ```sh
   $ echo "!" >> README.md
   $ git add README.md && git commit -m "感嘆符を追加"
   $ git cat-file -p HEAD
   tree 05cdc1e059d112f883f57fbc30b1876617ff4f06      ← 新しい tree
   parent 4c2032fc3170376c12bca9b4e6955f86c969c377
   ...
   $ git cat-file -p 05cdc1e
   100644 blob 3d266e1467474bc8784b1d60c81c3e5cc1bf68a3	README.md     ← 新しい blob
   040000 tree e453543522c469981c2ae4c4ead9047ad20d3820	src           ← 前と同じ tree
   ```

   - README.md の中身が変わったので、新しい blob ができます。
   - いちばん上のフォルダの「README.md → blob」の行が変わったので、いちばん上の tree も新しくなります。
   - `src` フォルダの中身は変わっていないので、`src` の tree（`e453543`）とその中の blob は、前のコミットのものがそのまま使われます。

   これが本文5節の「コミットはすべてのファイルの記録だが、変わっていない部分は共有されるので、容量はほとんど増えない」の具体的な姿です。（新しいコミットのハッシュは、コミットした日時によって変わります。tree と blob のハッシュは、中身だけで決まるので、誰がやっても同じです。）

## 問題12 リベースでコンフリクトを解消する

```sh
$ git switch feature/default-name
$ git log --oneline -n 1
5c1b3fd 名前を省略したときの既定値を追加
$ git rebase main
CONFLICT (content): Merge conflict in src/greet.js
error: could not apply 5c1b3fd... 名前を省略したときの既定値を追加
$ code src/greet.js          # 問題7 と同じ内容にする
$ git add src/greet.js
$ git rebase --continue      # エディタが開いたら、メッセージを確かめて閉じる
Successfully rebased and updated refs/heads/feature/default-name.
$ git log --oneline -n 1
6d3cf53 名前を省略したときの既定値を追加      ← ID が変わっている
$ git switch main
$ git merge feature/default-name
Updating ae64a3e..6d3cf53
Fast-forward
$ git log --oneline --graph
* 6d3cf53 名前を省略したときの既定値を追加
* ae64a3e あいさつを日本語にする
* cf788aa greet 関数を追加
```

4. 問題7 は**枝分かれとマージコミットのある**履歴、問題12 は**1本の線**の履歴になります。ファイルの最後の内容は同じです。

5. コミットIDは**変わりました**（`5c1b3fd` → `6d3cf53`。新しい ID は、作り直した日時によって人ごとに違います）。リベースは、main の先（`ae64a3e`）を親とする**新しいコミット**を作り直すからです。コミットの中身には親のコミットIDと、ファイルの記録（tree）が入っているので、親が変われば（そしてコンフリクトを解消して中身が変われば）、ハッシュも変わります。元の `5c1b3fd` は reflog に残っています。
