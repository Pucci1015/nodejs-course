# 第3章 サンプル

## 練習用のリポジトリを作るスクリプト

作業フォルダ `~/dev/ch03`（本文の「読み方」）で `bash samples/make-….sh` のように動かします。作成先は引数で指定できます（省略すると `~/dev/ch03/` の下に作ります）。作成先が既にあるときは「既に存在します」と表示して、何もせずに終了します。作者と日時を固定しているので、誰が作っても同じコミットID になり、本文や解答に書かれた ID と見比べられます。

| ファイル | 作られるもの | 本文の節 |
| --- | --- | --- |
| [make-sample-repo.sh](make-sample-repo.sh) | 3つのコミットを持つ小さなリポジトリ（`~/dev/ch03/git-sample`）。オブジェクトの観察用 | 5 |
| [make-conflict-repo.sh](make-conflict-repo.sh) | 同じ行を変更した2つのブランチを持つリポジトリ（`~/dev/ch03/git-conflict`） | 8.2 |
| [make-remote-practice.sh](make-remote-practice.sh) | 共有用のベアリポジトリと、Alice・Bob の2つのクローン（`~/dev/ch03/git-remote-practice`） | 10.2, 練習問題10 |

```sh
$ cd ~/dev/ch03
$ bash samples/make-sample-repo.sh
$ cd git-sample && git log --oneline
4c2032f 使い方を追記し、hello.js を追加
0946517 app.js を追加
fc53296 README を追加
```

## 設定ファイルの例

| ファイル | 置き場所 | 本文の節 |
| --- | --- | --- |
| [gitconfig.sample](gitconfig.sample) | `~/.gitconfig` | 2 |
| [ssh-config.sample](ssh-config.sample) | `~/.ssh/config` | 11.3 |
| [node.gitignore](node.gitignore) | プロジェクトの `.gitignore` | 13 |
| [global-gitignore.sample](global-gitignore.sample) | `~/.config/git/ignore` | 13.1 |
| [gitattributes.sample](gitattributes.sample) | プロジェクトの `.gitattributes` | 13.4 |
| [pull_request_template.md](pull_request_template.md) | プロジェクトの `.github/pull_request_template.md` | 12 |

そのままコピーするのではなく、各行のコメントを読んで、必要なものだけを自分の設定に取り入れてください。`gitconfig.sample` の名前とメールアドレスは例なので、必ず自分のものに書き換えます。

## 読みどころ

- スクリプトの `GIT_AUTHOR_DATE` と `GIT_COMMITTER_DATE` は、コミットに記録される日時を指定する環境変数です。第1章10節の「そのコマンドだけに環境変数を渡す」書き方を使っています。日時はコミットのハッシュの計算に含まれるため、これを固定すると毎回同じハッシュになります。
- `make-remote-practice.sh` の `git init --bare` は、作業ツリーを持たない（`.git` の中身だけの）リポジトリを作ります。GitHub のサーバ上のリポジトリもこの形です。作業ツリーが無いので、誰かがそこで編集して push と食い違う、ということが起きません。
