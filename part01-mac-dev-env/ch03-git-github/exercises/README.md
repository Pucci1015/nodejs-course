# 第3章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。問題9 だけ GitHub を使い、ほかの問題は手元の Mac だけで解けます。
模範解答は [../solutions/README.md](../solutions/README.md) にあります。

問題は **基本 → 応用 → 発展** の順に並んでいます。基本は本文のコマンドをそのまま使えば解けます。発展は少し考える問題なので、できなくても次の章に進んでかまいません。

問題用のリポジトリは、サンプルやこのフォルダのスクリプトで作ります。何度でも作り直せるので、壊すつもりで試してください（作り直すときは、作成先のフォルダの中身を確かめてから消します）。スクリプトは、作業フォルダ `~/dev/ch03`（本文の「読み方」）で `bash exercises/ex-….sh` や `bash samples/make-….sh` のように動かします。作成先は `~/dev/ch03/` の下です。

| 問題 | 種類 | テーマ | 使うスクリプト | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 最初のリポジトリと `git status` | なし | 4.1〜4.3, 4.5 |
| 2 | 基本 | 変更を見る | なし | 4.4 |
| 3 | 基本 | 小さな取り消し | なし | 6.1, 6.2 |
| 4 | 基本 | ブランチを作ってマージする | なし | 7.1, 8.1 |
| 5 | 応用 | やってしまったことを取り消す | [ex-undo-setup.sh](ex-undo-setup.sh) | 6.1〜6.3, 13.3 |
| 6 | 応用 | マージの結果を予想する | [ex-predict.sh](ex-predict.sh) | 8.1 |
| 7 | 応用 | コンフリクトを解消する | [../samples/make-conflict-repo.sh](../samples/make-conflict-repo.sh) | 8.2 |
| 8 | 応用 | 要件どおりの .gitignore を書く | [ex-gitignore-setup.sh](ex-gitignore-setup.sh)、[check-gitignore.sh](check-gitignore.sh) | 13 |
| 9 | 応用 | GitHub で PR の流れを一通り行う | なし | 10〜12 |
| 10 | 発展 | 2人で同じリポジトリに push する | [../samples/make-remote-practice.sh](../samples/make-remote-practice.sh) | 10 |
| 11 | 発展 | Git の中身をたどる | [../samples/make-sample-repo.sh](../samples/make-sample-repo.sh) | 5 |
| 12 | 発展 | リベースでコンフリクトを解消する | [../samples/make-conflict-repo.sh](../samples/make-conflict-repo.sh) | 9 |

---

## 問題1 最初のリポジトリと git status（基本）

1. `~/dev/ch03/git-basic` というフォルダを作って移動し、`git init` でリポジトリにしてください。`ls -a` で、何ができたかを確かめてください。
2. `echo "# 買い物メモ" > memo.md` でファイルを作り、`git status` を実行してください。`memo.md` は、どの見出し（`Untracked files` など）の下に表示されましたか。それは何を意味しますか。
3. `memo.md` を `git add` し、もう一度 `git status` を実行してください。見出しはどう変わりましたか。
4. `"メモを作成"` というメッセージでコミットし、`git status` を実行してください。何と表示されましたか。
5. `echo "- 牛乳" >> memo.md` で1行足して `git add` とコミットをし、さらに `echo "- 卵" >> memo.md` でもう1行足して、またコミットしてください（メッセージは自由）。`git log --oneline` で、コミットが3つになっていることを確かめてください。

## 問題2 変更を見る（基本）

問題1 のリポジトリを使います。

1. 次の操作の後で `git status --short` を実行すると、どう表示されるかを**予想してから**確かめてください。

   ```sh
   $ echo "- パン" >> memo.md       # 追跡しているファイルを変える
   $ echo "メモ" > todo.md          # 新しいファイルを作る
   ```

2. `git diff` を実行し、`memo.md` のどの行が変わったかを読み取ってください。`+` の付いた行は何を表していますか。
3. `git add memo.md` をした後で、`git diff` と `git diff --staged` を実行してください。それぞれ何が表示されましたか。違いを説明してください。
4. `git status --short` の表示は、3 の後でどう変わりましたか。左の文字と右の文字が何を表しているかを、本文4.4節の表で確かめてください。
5. `todo.md` も `add` して、まとめてコミットしてください。`git log -n 1 -p` で、今のコミットで何を変えたかを表示してください。

## 問題3 小さな取り消し（基本）

問題1 のリポジトリを使います。1つずつ、操作の後に `git status` で状態を確かめてください。

1. `echo "- まちがい" >> memo.md` で1行足した後、`git restore memo.md` を実行してください。`cat memo.md` で、ファイルがどうなったかを確かめてください。
2. `echo "下書き" > draft.md` で作ったファイルを `git add` した後、「やっぱりまだコミットしない」ことにします。**ファイルは残したまま**ステージから外してください。
3. `draft.md` を消して（`rm draft.md`）から、`echo "- バター" >> memo.md` で1行足して、`"バタをー追加"` というメッセージでコミットしてください。その後、メッセージを打ち間違えたことに気づいたとします。直前のコミットのメッセージを `"バターを追加"` に直してください。`git log --oneline` で、メッセージとコミットIDがどう変わったかを確かめてください。
4. 1 の `git restore` で捨てた変更は、Git で取り戻せますか。理由も書いてください。

## 問題4 ブランチを作ってマージする（基本）

問題1 のリポジトリを使います。

1. `feature/fruits` というブランチを作って切り替え、`git branch` で、今どのブランチにいるかを確かめてください。
2. `memo.md` に `- りんご` を足してコミットしてください。`git log --oneline --graph --all` で、`main` と `feature/fruits` がそれぞれどのコミットを指しているかを確かめてください（コミットIDの横の、かっこの中に表示されます）。
3. `main` に切り替えて `cat memo.md` を実行してください。`- りんご` はありますか。理由も書いてください。
4. `main` に `feature/fruits` をマージしてください。表示されたメッセージから、fast-forward だったかどうかを読み取ってください。fast-forward になった理由を、本文8節の図の言葉で説明してください。
5. マージが終わったブランチ `feature/fruits` を消してください。

## 問題5 やってしまったことを取り消す（応用）

```sh
$ cd ~/dev/ch03
$ bash exercises/ex-undo-setup.sh      # 作成先は ~/dev/ch03/git-undo
$ cd git-undo
$ git log --oneline
6624598 設定を追加
0922511 機能Aを追加
1121950 最初のコミット
$ git status --short
A  notes.txt
 M src/app.js
```

このリポジトリでは、次のことをやってしまっています。順番に直してください。それぞれの後で `git status` と `git log --oneline` を実行して、状態を確かめましょう。

1. `notes.txt` を間違えてステージに入れてしまった。**ファイルは残したまま**ステージから外す。
2. `src/app.js` に入れたデバッグ用の変更が要らなくなった。変更を捨てる。
3. 直前のコミット「設定を追加」に、API キーの入った `.env` を入れてしまった（まだ push していない）。次の状態にする。
   - コミットから `.env` だけを取り除く（コミットは「設定を追加」の1つのまま）
   - 手元の `.env` ファイルは残す
   - これからも `.env` がコミットされないようにする

   ヒント: 本文13.3節の手順の、最後の `git commit` を、6.1節の `--amend` に変えます。メッセージは `-m "設定を追加"` で、同じものを付けます。
4. 間違えて `git reset --hard HEAD~1` を実行してしまった。「設定を追加」のコミットを取り戻す（3 で作り直した方のコミットに戻すこと）。
5. 「機能Aを追加」は、既にほかの人と共有している（push している）とする。この変更を、適切な方法で取り消す。
6. 3 で `.env` をコミットから取り除いたが、この API キーはまだ安全とは言えない。理由を1つ挙げ、本来どうすべきかを答える。

## 問題6 マージの結果を予想する（応用）

[ex-predict.sh](ex-predict.sh) は、次の操作を順に行います。`c 名前` は「`名前.txt` というファイルを作って、`名前` というメッセージでコミットする」という意味です。**実行する前に**、問いに答えてください。

```sh
c base                              # (0)
git switch -c feature-a             # (1)
c A1
git switch main                     # (2)
git merge feature-a                 # (3)
git switch -c feature-b             # (4)
c B1
git switch main                     # (5)
c M1                                # (6)
git merge feature-b                 # (7)
git switch -c feature-c             # (8)
c C1
git switch main                     # (9)
git merge --no-ff feature-c         # (10)
```

1. (3)、(7)、(10) のそれぞれで、fast-forward になるか、マージコミットが作られるか。理由も書く。
2. 最後の `git log --oneline --graph` の形を、本文8節のような図（`○───○`）で描く。
3. (10) で `--no-ff` を付けなかったら、履歴の形はどう変わるか。
4. 予想を書いてから、`bash exercises/ex-predict.sh`（作成先は `~/dev/ch03/git-predict`） を実行して確かめる（最後に履歴の図が表示されます）。

## 問題7 コンフリクトを解消する（応用）

```sh
$ cd ~/dev/ch03
$ bash samples/make-conflict-repo.sh   # 作成先は ~/dev/ch03/git-conflict
$ cd git-conflict
$ git log --oneline --graph --all
```

`main` は「あいさつを日本語にする」変更を、`feature/default-name` は「名前を省略したときの既定値を付け、文字列のつなぎ方を `` `...${}...` `` に書き換える」変更をしています。

1. `main` で `git merge feature/default-name` を実行し、コンフリクトになったファイルを `git status` で確かめてください。
2. `cat src/greet.js` で中身を見て、`<<<<<<< HEAD` から `=======` までと、`=======` から `>>>>>>>` までが、それぞれどちらのブランチの内容かを答えてください。
3. **両方の意図を活かした**次の内容にして、マージを終わらせてください。

   ```js
   export function greet(name = 'ゲスト') {
     return `こんにちは、${name}さん！`;
   }
   ```

4. `git log --oneline --graph` で、マージコミットができたことを確かめてください。
5. `README.md` は、どちらのブランチで変えられていましたか（`git log --oneline --all -- README.md` で、README.md を変えたコミットだけを表示できます）。`README.md` がコンフリクトにならなかった理由を考えてください。

## 問題8 要件どおりの .gitignore を書く（応用）

```sh
$ cd ~/dev/ch03
$ bash exercises/ex-gitignore-setup.sh   # 作成先は ~/dev/ch03/git-ignore-practice
$ cd git-ignore-practice
```

次の要件を満たす `.gitignore` を書いてください。書けたら、`cd ~/dev/ch03` で作業フォルダに戻って `bash exercises/check-gitignore.sh git-ignore-practice` で確かめられます（すべて `[OK]` になれば正解）。

| ファイル | 扱い | 理由 |
| --- | --- | --- |
| `node_modules/` の中（どの深さでも。`docs/node_modules/` も） | 無視 | 作り直せる |
| `build/bundle.js` | 無視 | 組み立てで作られるもの |
| `src/build/helper.js` | **コミットする** | `build` という名前だが、ソースコードの一部 |
| `.env`、`.env.local` | 無視 | 秘密の設定 |
| `.env.example` | **コミットする** | 必要な環境変数の見本 |
| `logs/app.log`、`debug.log`（すべての `.log`） | 無視 | ログ |
| `logs/keep/important.log` | **コミットする** | 例外として残したいログ |
| `coverage/` の中 | 無視 | テストで作られるもの |
| `config/settings.json` | **コミットする** | 共通の設定 |
| `config/settings.local.json` | 無視 | 個人の設定 |
| `secret/server.pem` | 無視 | 鍵のファイル（`.pem` はすべて） |
| `src/app.js`、`package.json`、`package-lock.json`、`.gitignore` | **コミットする** | |

ヒント: 本文13節の表の書き方だけで書けます。`!` の行は、打ち消したい行より**後**に書きます。

追加の問い:

1. `git check-ignore -v build/bundle.js` を実行し、どの行のパターンで無視されたかを確かめてください。
2. `.DS_Store` をこの `.gitignore` に書かないのはなぜですか。どこに書くべきですか。

## 問題9 GitHub で PR の流れを一通り行う（応用）

1. 本文11節の手順で SSH の鍵を作り、GitHub に登録して、`ssh -T git@github.com` が成功することを確かめてください。次の問いにも答えてください。
   - 公開鍵と秘密鍵は、それぞれどのファイルですか。GitHub に登録したのはどちらですか。
   - 秘密鍵の権限は、いくつであるべきですか。`ls -l ~/.ssh` で確かめてください。
   - 初めての接続で fingerprint を確かめないと、どんな危険がありますか。
2. GitHub に `git-practice` というリポジトリ（Private でよい）を作り、手元で作ったリポジトリを push してください。`README.md` と、問題8 で作った `.gitignore` を入れること。
3. 本文12節の流れ（ブランチ → コミット → push → PR → 自分で見直す → マージ → 片付け）を1回行ってください。`README.md` に「このリポジトリの目的」を書き足す変更にします。
4. `.github/pull_request_template.md`（[../samples/pull_request_template.md](../samples/pull_request_template.md) を参考に）を、同じ流れで追加してください。次の PR を作るとき、テンプレートが入力されることを確かめてください。

## 問題10 2人で同じリポジトリに push する（発展）

```sh
$ cd ~/dev/ch03
$ bash samples/make-remote-practice.sh   # 作成先は ~/dev/ch03/git-remote-practice
$ cd git-remote-practice
$ ls
alice	bob	origin.git
```

`origin.git` を GitHub の代わりにして、Alice と Bob の2人が `memo.md` を変えます。`alice` と `bob` のフォルダが、それぞれの手元のリポジトリです。`cd alice` や `cd ../bob` で行き来しながら進めます。`pull.ff only`（本文2節）を設定していない人は、先に設定してください。

1. **Alice**: `memo.md` の最後に「- 買い物: 卵」を足してコミットし、push する。
2. **Bob**: Alice の変更を取り込まずに、`memo.md` の最後に「- 宿題: 数学」を足してコミットし、push する。どんなメッセージが出たか。なぜ断られたのかを説明する。
3. **Bob**: `git fetch` してから `git status` と `git log --oneline --graph --all` を実行し、`origin/main` と `main` の関係を説明する。
4. **Bob**: `git pull` を実行するとどうなるか。その後、Bob の履歴が1本の線になるように取り込んで（本文10.3節）、push する。コンフリクトになったら解消する（リベースの途中のコンフリクトは、本文9節のとおり `git rebase --continue` で進めます）。
5. **Alice**: Bob の変更を取り込み、`memo.md` に両方の行があることを確かめる。このとき fast-forward になる理由を説明する。

## 問題11 Git の中身をたどる（発展）

```sh
$ cd ~/dev/ch03
$ bash samples/make-sample-repo.sh   # 本文5.1節で作っていれば「既に存在します」と出る。消さずにそのまま使う
$ cd git-sample
```

1. `git cat-file -p` だけを使って、HEAD のコミットから `src/app.js` の中身にたどり着いてください。途中で表示したオブジェクトの種類とハッシュ（最初の7文字）を、順に書いてください。
2. `src/app.js` と `src/hello.js` は同じ内容です。この2つのファイルの blob のハッシュを比べ、何が言えるかを説明してください。
3. `README.md` を1文字だけ変えてコミットすると、新しく作られるオブジェクトは、commit・tree・blob がそれぞれいくつか。予想してから、新しいコミットとその tree を `git cat-file -p` でたどって確かめてください（ハッシュが前のコミットと同じものは、新しく作られていません）。

## 問題12 リベースでコンフリクトを解消する（発展）

問題7 のリポジトリとは別の場所に、もう一度作ります（`~/dev/ch03` で打ちます）。

```sh
$ bash samples/make-conflict-repo.sh ~/dev/ch03/git-conflict2   # 作成先を引数で決める
$ cd ~/dev/ch03/git-conflict2
```

1. `feature/default-name` ブランチに切り替えて、`git log --oneline -n 1` でコミットIDをメモしてから、`git rebase main` を実行してください。
2. 問題7 と同じ内容にコンフリクトを解消し、リベースを最後まで進めてください。
3. `main` に切り替えて `git merge feature/default-name` を実行し、fast-forward になることを確かめてください。
4. 問題7（マージ）と問題12（リベース）の、最後の履歴の形の違いを説明してください。
5. `feature/default-name` のコミットIDは、リベースの前後で変わりましたか。理由も説明してください。
