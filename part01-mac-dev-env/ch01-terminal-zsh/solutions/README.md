# 第1章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。コマンドの書き方は1通りではありません。自分の答えが違っていても、同じ結果になり、理由を説明できれば正解です。

出力の例の `alice` は、ユーザー名の例です。自分の Mac では、自分のユーザー名になります。

| ファイル | 内容 |
| --- | --- |
| [broken-script-fixed.sh](broken-script-fixed.sh) | 問題7 の直した後のスクリプト（`fixed.sh`） |
| [zsh-functions.zsh](zsh-functions.zsh) | 問題9（`~/.zshrc` に足すエイリアスと関数） |
| [log-summary.sh](log-summary.sh) | 問題10 |

---

## 基本

### 問題1 場所とパス

```sh
$ cd ~/dev/playground/src/routes
$ pwd
/Users/alice/dev/playground/src/routes      # 1. ~ ではなく、/ から始まる絶対パスで表示される
$ cd ../../docs                             # 2. routes → src → playground と2つ上がってから docs へ
$ pwd
/Users/alice/dev/playground/docs
$ cd -                                      # 3. 直前にいた場所（src/routes）へ戻る
~/dev/playground/src/routes
$ cd ~/dev/playground
$ ls -a                                     # 4. .hidden-config は ls -a にだけ出る
$ ls "My Documents"                         # 5. クォート
$ ls My\ Documents                          # 5. \ でスペースをエスケープ
$ ls My Documents                           # 6.
ls: My: No such file or directory
ls: Documents: No such file or directory
```

- 2 の答えは1つではありません。`cd ~/dev/playground/docs` も正しく動きますが、これは `~` から始まる絶対パスです。相対パスは「今いる場所からの道順」なので、`..` で上がってから下ります。
- 3 の `cd -` は、移動した先を表示してくれます。
- 4 は、`.` で始まる名前のファイルは「隠しファイル」で、`ls` は `-a` を付けないと表示しないためです（本文3.1節）。`.`（今いる場所）と `..`（1つ上）も `ls -a` にだけ出ます。
- 6 は、シェルがスペースで引数を区切るので、`ls` に `My` と `Documents` の2つの引数が渡り、どちらのフォルダも無いと言われます（本文2.4節）。Tab キーで補完すると、`My\ Documents` のようにエスケープが自動で付きます。

### 問題2 ファイルを作る・コピーする・消す

```sh
$ cd ~/dev/playground
$ mkdir -p backup/2026/11                               # 1. -p で途中の backup と 2026 もまとめて作る
$ cp memo.txt backup/2026/11/                           # 2.
$ mv backup/2026/11/memo.txt backup/2026/11/memo-old.txt # 3. mv は「移動」と「名前の変更」の両方に使う
$ cp docs backup/                                        # 4.
cp: docs is a directory (not copied).
$ cp -R docs backup/                                     # 4. -R でフォルダごと
$ ls backup
2026	docs
$ rm -i backup/2026/11/memo-old.txt                      # 5.
remove backup/2026/11/memo-old.txt? n
$ ls backup/2026/11
memo-old.txt
$ rm -i backup/2026/11/memo-old.txt
remove backup/2026/11/memo-old.txt? y
```

- 1 で `-p` を付けないと、`backup` がまだ無いので `mkdir: backup/2026: No such file or directory` になります。
- 4 は、`cp` が既定ではファイルしかコピーしないためです。フォルダは `-R`（中身ごと）を付けます（本文3.3節）。
- 6 の答えは「入らない」です。`rm` はゴミ箱を通らず、すぐに消します。消したものは戻せないので、慣れるまでは `-i` を付けます（本文3.4節）。

### 問題3 グロブとクォートの結果を予想する

| コマンド | zsh の結果 | 理由 |
| --- | --- | --- |
| `echo *.txt` | `draft final v2.txt meeting notes.txt memo.txt todo.txt` | シェルが `*.txt` を、あてはまるファイル名の並びにしてから、`echo` に渡す |
| `echo "*.txt"` | `*.txt` | ダブルクォートの中では、グロブは展開されない |
| `echo '$HOME' "$HOME"` | `$HOME /Users/alice` | シングルクォートの中は、変数も展開されない。ダブルクォートの中は、変数は展開される |
| `echo photos/IMG_00??.jpg` | `photos/IMG_0001.jpg photos/IMG_0002.jpg` | `?` は「ちょうど1文字」。`IMG_0103.jpg` は `IMG_00` で始まらないので入らない |
| `echo src/**/*.js` | `src/app.js src/models/task.js src/routes/index.js src/routes/tasks.js` | `**/` は「いくつ下のフォルダでもよい（0段も含む）」 |
| `echo *.xyz` | `zsh: no matches found: *.xyz`（`echo` は動かない） | あてはまるファイルが無い |

2: bash では `echo *.xyz` が `*.xyz` と表示されます。あてはまるファイルが無いグロブを、zsh はエラーにしてコマンドを動かさず、bash はそのままの文字列として渡すためです（本文4.1節）。

> おまけ: bash で `echo src/**/*.js` を実行すると、`src/app.js` が出てきません。bash の既定では `**` が `*` と同じ（1段のフォルダだけ）で、「いくつ下でもよい」は zsh の機能だからです。

3: `?` が「任意の1文字」のグロブとして読まれ、`search?q=node` にあてはまるファイルが無いためです。URL 全体をクォートで囲みます。

```sh
$ curl 'https://example.com/search?q=node'
```

URL には `?`・`&`・`*`・`#` など、シェルにとって特別な文字がよく入るので、**URL は必ずクォートする**と覚えておきましょう。

### 問題4 リダイレクトと終了ステータス

```sh
$ cd ../samples
$ bash streams-demo.sh
これは stdout（標準出力）です
これは stderr（標準エラー出力）です
$ echo $?                                   # 1.
3
$ bash streams-demo.sh > out.txt            # 2. 画面には stderr の行だけが出る
これは stderr（標準エラー出力）です
$ bash streams-demo.sh 2> err.txt           # 3. 画面には stdout の行だけが出る
これは stdout（標準出力）です
$ bash streams-demo.sh &> all.txt           # 4. または > all.txt 2>&1
$ bash streams-demo.sh >> log.txt           # 5. 3回実行する
$ bash streams-demo.sh >> log.txt
$ bash streams-demo.sh >> log.txt
$ wc -l log.txt
       3 log.txt
$ bash streams-demo.sh | cat                # 6.
$ echo $?
0
$ rm out.txt err.txt all.txt log.txt        # 7.
```

- 5 で `log.txt` に入るのは stdout の行だけなので、1回に1行ずつ増えて3行です（stderr の行は画面に出ます）。`>` は毎回上書きなので、3回実行しても1行です。
- 6 は、パイプの終了ステータスが、**最後のコマンド**（ここでは `cat`）のものになるためです。`cat` は成功しているので 0 です（本文7.3節）。途中の失敗も見つけたいときは、スクリプトで `set -o pipefail` を使います（本文9.2節）。

### 問題5 パイプでログを数える

```sh
$ cd ../samples
$ wc -l access.log                                               # 1.
      80 access.log
$ grep -c POST access.log                                        # 2.
12
$ awk '$9 == 404' access.log | wc -l                             # 3.
      10
$ awk '{print $9}' access.log | sort | uniq -c                   # 4.
  38 200
   4 201
   1 204
   5 302
   8 304
   2 400
   1 401
   4 403
  10 404
   4 500
   3 503
$ awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -n 3   # 5.
  32 203.0.113.5
  21 198.51.100.23
  13 192.0.2.77
$ awk '$9 == 404 {print $7}' access.log | sort | uniq -c | sort -rn     # 6.
   4 /tasks/999
   3 /wp-login.php
   3 /favicon.ico
```

- 2 は `grep POST access.log | wc -l` でも同じです。`grep -c` は「あてはまった行の数」を表示します。
- 4 で `sort` を先にするのは、`uniq` が**隣り合った**同じ行しかまとめないためです（本文6.2節）。
- 6 の `/wp-login.php` は、WordPress（よく使われるブログのソフト）のログイン画面の場所です。このサイトは WordPress ではないので、**WordPress の弱いところを探して、いろいろなサイトに手当たり次第にアクセスするボット**だと考えられます。公開したサーバには、必ずこうしたアクセスが来ます（第10部・第12部）。`/favicon.ico` は、ブラウザがタブのアイコンを自動で取りに来るもので、攻撃ではありません。
- `uniq -c` の件数の前の空白の数は、Mac と Linux で少し違います。

### 問題6 権限を読む

1. `secret.txt` = **640**、`deploy.sh` = **755**、`shared` = **750**、`id_ed25519` = **600**
   （`rw-` = 4+2+0 = 6、`r-x` = 4+0+1 = 5、`r--` = 4、`---` = 0）
2. 読めて、書ける（所有者の `rw-`）。
3. 読めるが、書けない（グループの `r--`）。
4. 読めて、実行できるが、書き換えられない（その他の `r-x`）。`/usr/bin` の中のコマンドが、だいたいこの形です。
5. `alice`（所有者）だけ。秘密鍵（第3章）は、この形にしておかないと、ssh が「ほかの人に読まれるかもしれない」と言って使ってくれません。
6. `chmod 600 secret.txt`
7. `touch` で作ったファイルは `-rw-r--r--` で、`chmod +x` の後は `-rwxr-xr-x` になります。所有者・グループ・その他の全員に `x`（実行）が足されました。

おまけ（`shared` フォルダ）:

`shared` は `drwxr-x---` なので、グループの `bob` は中に入れて（`x`）一覧も見られます（`r`）が、ファイルを作ったり消したりはできません（`w` が無い）。どのグループにも入っていない人は、何もできません。

---

## 応用

### 問題7 動かないスクリプトを直す

1. 起きること:

```sh
$ ./broken-script.sh
zsh: permission denied: ./broken-script.sh
$ bash broken-script.sh
broken-script.sh: line 2: cd: $'~\r': No such file or directory
…（表示が崩れたり、ホームではない場所のファイルを数えたりする）
```

2. 原因:

| # | 原因 | 調べ方 | 見えたもの |
| --- | --- | --- | --- |
| 1 | 実行権限が無い | `ls -l broken-script.sh` | `-rw-r--r--`（`x` が無い） |
| 2 | 改行コードが CRLF | `file broken-script.sh`、`cat -e broken-script.sh` | `with CRLF line terminators`、行の最後が `^M$` |
| 3 | shebang が無い | `head -n 1 broken-script.sh` | 1行目がコメント（`#!` で始まっていない） |

2つ目の原因のせいで、`cd ~` が「`~\r` というフォルダへ移動」と読まれ、失敗しています。`$'~\r'` は、bash が「`~` の後に CR という見えない文字が付いている」ことを表す書き方です。

3. 直し方（本文の書き方だけで直せます）:

```sh
$ echo '#!/usr/bin/env bash' > fixed.sh             # 1行目に shebang を書く（> で新しく作る）
$ tr -d '\r' < broken-script.sh >> fixed.sh         # \r を消した中身を、後ろに足す（>>）
$ chmod +x fixed.sh                                 # 実行権限を付ける
$ ./fixed.sh
今日は 2026-11-07 です
ホームには 12 個のファイル/フォルダがあります
$ file fixed.sh                                     # with CRLF line terminators と出なくなる
```

`'#!/usr/bin/env bash'` をシングルクォートで囲むのは、`!` をシェルに特別な意味で読ませないためです。VS Code で開いて、1行目を足し、右下の「CRLF」を「LF」に変えて保存してもかまいません。直した後のファイルは [broken-script-fixed.sh](broken-script-fixed.sh) です。

4. Windows で作られたファイルや、Windows を使う人からメールやチャットで受け取ったファイル、改行の設定がばらばらのリポジトリで起こります。実行権限は、ファイルをダウンロードしたり、zip で受け取ったりすると外れていることがあります。第3章の `.gitattributes`、第4章のエディタの設定（`files.eol`）で、もう一度出てきます。

### 問題8 環境変数と PATH を確かめる

1.

```sh
$ GREETING=hello
$ echo $GREETING
hello
$ env | grep GREETING              # 何も表示されない
$ export GREETING
$ env | grep GREETING
GREETING=hello
```

`GREETING=hello` だけでは**シェル変数**で、このシェルの中だけで使えます。`env` は別のプログラムとして起動されるので、シェル変数は見えません。`export` すると**環境変数**になり、このシェルから起動するプログラム（`env` や、後の章の `node`）にもコピーが渡ります（本文10.1節）。

2.

```sh
$ echo $PATH | tr ':' '\n' | wc -l
       9
```

数は、Mac の設定によって違います。`tr ':' '\n'` で `:` を改行に変えると、1行に1つのフォルダになるので、`wc -l` で行の数を数えれば、フォルダの数になります。

3. `✗` が付いたフォルダがあれば、PATH に「無いフォルダ」が入っています。困ることはありませんが、設定の書き間違いのことがあります。

4. 例:

```sh
$ which -a git
/opt/homebrew/bin/git
/usr/bin/git
```

使われるのは、最初に出てきた `/opt/homebrew/bin/git` です。シェルは PATH の**前から順に**探し、最初に見つかったものを使うためです（本文10.2節）。

5.

```sh
$ type cd
cd is a shell builtin          # 組み込み
$ type ls
ls is /bin/ls                  # ディスク上のプログラム
$ type echo
echo is a shell builtin        # 組み込み
```

`echo` は `/bin/echo` というプログラムもありますが、シェルは自分の組み込みのものを先に使います（`which -a echo` で両方を見られます）。

### 問題9 エイリアスと関数を作る

解答: [zsh-functions.zsh](zsh-functions.zsh)

```sh
$ cp ~/.zshrc ~/.zshrc.backup
$ code ~/.zshrc                      # または open -e ~/.zshrc で開き、zsh-functions.zsh の中身を足す
$ source ~/.zshrc
$ type ll
ll is an alias for ls -lahF
$ mkcd ~/dev/playground/new/folder
$ pwd
/Users/alice/dev/playground/new/folder
$ cd ~/dev/playground
$ bak memo.txt
$ ls memo.txt.*
memo.txt.2026-11-07.bak
$ bak
使い方: bak ファイル
```

- 3 の日付は `$(date +%Y-%m-%d)` で作り、`"$1.$(date +%Y-%m-%d).bak"` のように、ファイル名の後ろにつなげます。
- 関数を途中で終わらせるときは、`exit` ではなく `return` を使います。関数は今のシェルの中で動いているので、`exit` だとシェル（ターミナルのタブ）ごと終わってしまいます。
- `cp -i` にしておくと、同じ日に2回 `bak` したとき、上書きの前に確かめてくれます。

4: スクリプトは、**別のプロセス**として動きます。`bash mkcd.sh x/y` は、新しい bash を起動し、その bash の中でフォルダを作って移動します。スクリプトが終わると、その bash はなくなるので、移動もなかったことになります。元のシェル（zsh）の場所は変わりません。フォルダは、ファイルシステムに作られたので残ります。

「今のシェルの状態を変えるもの」は、組み込みコマンドか関数（または `source` で読み込むファイル）でなければできません。本文1.5節の「`cd` が組み込みである理由」と同じです。

---

## 発展

### 問題10 ログを要約するコマンドを作る

解答: [log-summary.sh](log-summary.sh)

```sh
$ mkdir -p ~/.local/bin
$ cp log-summary.sh ~/.local/bin/log-summary
$ chmod +x ~/.local/bin/log-summary
$ echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile   # 1回だけ実行する
$ exec zsh -l                                                    # ログインシェルを起動し直して、.zprofile を読み直す
$ which log-summary
/Users/alice/.local/bin/log-summary
$ log-summary ../samples/access.log; echo "exit=$?"
ファイル: ../samples/access.log
リクエスト数: 80
4xx の件数: 17
5xx の件数: 7
アクセスの多いパス（上位3件）:
  18 /tasks
  12 /static/app.js
  11 /
警告: 5xx が 7 件あります
exit=2
```

ポイント:

- **PATH は `~/.zprofile` に書きます**（本文11.1節）。`.zshrc` に書くと、`source ~/.zshrc` するたびに、同じフォルダが PATH に足されて重なっていきます。
- `'export PATH="$HOME/.local/bin:$PATH"'` を**シングルクォート**で囲むのは、`$HOME` や `$PATH` を今は展開せず、そのままの文字で `.zprofile` に書くためです。ダブルクォートにすると、今の PATH の値がまるごと書き込まれてしまいます。
- `>>`（足す）を `>`（上書き）と間違えると、`.zprofile` の中身が消えます。心配なら、先に `cp ~/.zprofile ~/.zprofile.backup` を取りましょう。
- `exec zsh -l` は、今のシェルを、新しいログインシェルに入れ替えるコマンドです。新しいタブを開いても同じことになります。
- 件数は、`awk '$9 >= 500' "$log" | wc -l` のように「条件に合う行だけを通して、行の数を数える」で出しています。Mac の `wc` は数字の前に空白を付けるので、`tr -d ' '` で消しています。
- エラーと警告は `>&2` で stderr に出しています。こうしておくと、`log-summary access.log > report.txt` としたとき、ファイルには結果だけが入り、警告は画面に出ます。
- 拡張子を外して `log-summary` という名前にしたのは、使う人にとって「何の言語で書かれているか」は関係ないからです。何で動かすかは、1行目の shebang で決まります。

### 問題11 リダイレクトと awk をもう一歩

1.

```sh
$ bash streams-demo.sh > both.txt 2>&1      # 画面には何も出ない。both.txt に2行
$ bash streams-demo.sh 2>&1 > both.txt      # 画面に stderr の行が出る。both.txt には stdout の1行だけ
これは stderr（標準エラー出力）です
```

リダイレクトは**左から順に**処理され、`2>&1` は「2番（stderr）を、**その時点で**1番（stdout）が向いている先に向ける」という意味です。

| 書き方 | 処理の順番 | 結果 |
| --- | --- | --- |
| `> both.txt 2>&1` | ① stdout → both.txt ② stderr → stdout の今の先（both.txt） | 両方がファイルに入る |
| `2>&1 > both.txt` | ① stderr → stdout の今の先（画面） ② stdout → both.txt | stderr は画面、stdout だけがファイル |

`2>&1` は「stderr を stdout に**つなぐ**」のではなく、「行き先を**写す**」と考えると分かりやすくなります。

2.

```sh
$ bash streams-demo.sh 2>&1 > /dev/null | wc -l
       1
```

パイプがあるとき、stdout は最初からパイプを向いています。① `2>&1` で stderr を「今の stdout の先」＝パイプに向け、② その後で stdout だけを `/dev/null` に向けると、パイプに流れるのは stderr だけになります。1 の2つ目の書き方の性質を、逆に使っています。

3.

```sh
$ awk '{sum += $10} END {print "合計:", sum, "平均:", sum / NR}' access.log
合計: 373903 平均: 4673.79
```

4.

```sh
$ cut -d: -f2 access.log | sort | uniq -c
  17 09
  14 10
  18 11
  15 12
  16 13
```

`[04/Nov/2026:09:03:15` の `:` で区切ると、1番目が `…[04/Nov/2026`、2番目が「時」になります。

5.

```sh
$ awk '$9 >= 500 {print $1, $7}' access.log
203.0.113.5 /api/report
203.0.113.5 /api/report
198.51.100.9 /api/report
203.0.113.5 /api/report
192.0.2.77 /api/report
203.0.113.5 /api/report
198.51.100.23 /api/report
```

5xx は、どれも `/api/report` で起きています。いろいろな人が同じ場所でエラーになっているので、`/api/report` のサーバの側のバグを疑います。こうして、ログからどこを調べればよいかの見当を付けられます。
