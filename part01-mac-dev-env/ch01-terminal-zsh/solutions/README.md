# 第1章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。コマンドの書き方は1通りではありません。自分の答えが違っていても、同じ結果になり、理由を説明できれば正解です。

出力の例の `alice` は、ユーザー名の例です。ことわりが無ければ、コマンドは `~/dev/ch01` で打っています。

| ファイル | 内容 |
| --- | --- |
| [broken-script-fixed.sh](broken-script-fixed.sh) | 問題7 の直した後のスクリプト（`fixed.sh`） |
| [port.sh](port.sh) | 問題8 |
| [zsh-functions.zsh](zsh-functions.zsh) | 問題9（`~/.zshrc` に足すエイリアスと関数） |
| [log-summary.sh](log-summary.sh) | 問題10 |

解答のファイルを動かすときも、教材のフォルダではなく `~/dev/ch01` にコピーしてから動かします（例: `cp （Finder から port.sh をドラッグ） ~/dev/ch01/port-answer.sh`）。

---

## 基本

### 問題1 場所とパス

```sh
$ cd ~/dev/ch01/playground/src/routes
$ pwd
/Users/alice/dev/ch01/playground/src/routes   # 1. ~ ではなく、/ から始まる絶対パスで表示される
$ cd ../../docs                               # 2. routes → src → playground と2つ上がってから docs へ
$ cd -                                        # 3. 直前にいた場所（src/routes）へ戻る
~/dev/ch01/playground/src/routes
$ cd ~/dev/ch01/playground
$ ls -a                                       # 4. .hidden-config は ls -a にだけ出る
$ ls "My Documents"                           # 5. クォート
$ ls My\ Documents                            # 5. \ で空白をエスケープ
$ ls My Documents
ls: My: No such file or directory
ls: Documents: No such file or directory
```

- 2 は、`cd ~/dev/ch01/playground/docs` でも動きますが、これは `~` から始まる絶対パスです。相対パスは「今いる場所からの道順」なので、`..` で上がってから下ります。
- 4 は、`.` で始まる名前は隠しファイルで、`ls` は `-a` を付けないと表示しないためです（本文3.2節）。`.`（今いる場所）と `..`（1つ上）も `ls -a` にだけ出ます。
- 5 の `ls My Documents` は、シェルが空白で引数を区切るので、`My` と `Documents` の2つの引数になり、どちらも無いと言われます（本文2.4節）。

### 問題2 ファイルを作る・コピーする・消す

```sh
$ cd ~/dev/ch01/playground
$ mkdir -p backup/2026/11                                # 1. -p で途中の backup と 2026 も作る
$ cp memo.txt backup/2026/11/                            # 2.
$ mv backup/2026/11/memo.txt backup/2026/11/memo-old.txt # 3. mv は「移動」と「名前の変更」の両方に使う
$ cp -R docs backup/                                     # 4. -R でフォルダごと
$ rm -i backup/2026/11/memo-old.txt                      # 5.
remove backup/2026/11/memo-old.txt? n
$ ls backup/2026/11
memo-old.txt
$ rm -i backup/2026/11/memo-old.txt
remove backup/2026/11/memo-old.txt? y
$ mkdir src/{lib,tests}                                  # 6. ブレース展開で2つの引数になる
$ ls src
app.js	lib	models	routes	tests
```

- 1 で `-p` を付けないと、`backup` がまだ無いので `No such file or directory` になります。
- 4 で `-R` を付けないと、`cp: docs is a directory (not copied).` と言われます（本文3.4節）。
- 6 は、シェルが `src/{lib,tests}` を `src/lib src/tests` に書き換えてから `mkdir` に渡します。`echo src/{lib,tests}` で確かめられます。

### 問題3 グロブとクォート

```sh
$ cd ~/dev/ch01/playground
$ echo photos/*.jpg                # 1.
photos/IMG_0001.jpg photos/IMG_0002.jpg photos/IMG_0103.jpg
$ echo logs/app-?.log              # 2. ? はちょうど1文字（logs/app-[123].log でもよい）
logs/app-1.log logs/app-2.log logs/app-3.log
$ echo src/**/*.js                 # 3.
src/app.js src/models/task.js src/routes/index.js src/routes/tasks.js
$ echo *\ *.txt                    # 4. "* *.txt" とクォートすると、グロブも止まってしまう
draft final v2.txt meeting notes.txt
```

4 は、空白だけを `\` でエスケープします。`"* *.txt"` と全体をクォートすると、`*` も展開されなくなり、`* *.txt` という文字がそのまま表示されます。`*" "*.txt` のように、空白の所だけクォートしても同じ結果になります。

5.

| コマンド | 結果 | 理由 |
| --- | --- | --- |
| `echo "*.txt"` | `*.txt` | ダブルクォートの中では、グロブは展開されない |
| `echo '$HOME' "$HOME"` | `$HOME /Users/alice` | シングルクォートの中は、変数も展開されない。ダブルクォートの中は、変数は展開される |
| `echo *.xyz` | `zsh: no matches found: *.xyz`（`echo` は動かない） | あてはまるファイルが無いと、zsh はエラーにしてコマンドを動かさない |
| `bash -c 'echo *.xyz'` | `*.xyz` | bash は、あてはまるものが無いグロブを、そのままの文字として渡す |

> おまけ: bash で `echo src/**/*.js` を打つと、`src/app.js` が出てきません。bash の既定では `**` が `*` と同じ（1段だけ）で、「いくつ下でもよい」は zsh の機能だからです。

6. `?` が「ちょうど1文字」のグロブとして読まれ、あてはまるファイルが無いためです。URL 全体をクォートで囲みます。

```sh
$ curl 'https://example.com/search?q=node'
```

URL には `?`・`&`・`*`・`#` など、シェルにとって特別な文字がよく入るので、**URL は必ずクォートする**と覚えておきましょう。

### 問題4 リダイレクトと終了ステータス

```sh
$ bash samples/streams-demo.sh; echo $?            # 1.
これは stdout（標準出力）です
これは stderr（標準エラー出力）です
3
$ bash samples/streams-demo.sh > out.txt           # 2. 画面には stderr の行だけが出る
これは stderr（標準エラー出力）です
$ bash samples/streams-demo.sh 2> err.txt          # 3. 画面には stdout の行だけ
これは stdout（標準出力）です
$ bash samples/streams-demo.sh &> all.txt          # 4. または > all.txt 2>&1
$ bash samples/streams-demo.sh >> log.txt          # 5. 3回打つ（↑ キーで呼び出すと楽）
$ wc -l log.txt
       3 log.txt
$ bash samples/streams-demo.sh | cat; echo $?      # 6.
これは stdout（標準出力）です
これは stderr（標準エラー出力）です
0
$ rm out.txt err.txt all.txt log.txt               # 7.
```

- 5 で `log.txt` に入るのは stdout の行だけなので、1回に1行ずつ増えて3行です。`>` は毎回上書きなので、3回動かしても1行です。
- 6 は、パイプの終了ステータスが**最後のコマンド**（`cat`）のものになるためです（本文7.3節）。途中の失敗も見つけたいときは、スクリプトで `set -o pipefail` を使います（本文9.2節）。
- 7 は `rm *.txt` でも消せますが、グロブで消すときは、先に `echo *.txt` で何が消えるかを確かめる癖をつけましょう。

### 問題5 パイプでログを数える

```sh
$ wc -l samples/access.log                                               # 1.
      80 samples/access.log
$ grep -c POST samples/access.log                                        # 2.
12
$ awk '$9 == 404' samples/access.log | wc -l                             # 3.
      10
$ awk '{print $9}' samples/access.log | sort | uniq -c                   # 4.
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
$ awk '{print $1}' samples/access.log | sort | uniq -c | sort -rn | head -n 3   # 5.
  32 203.0.113.5
  21 198.51.100.23
  13 192.0.2.77
$ awk '$9 == 404 {print $7}' samples/access.log | sort | uniq -c | sort -rn     # 6.
   4 /tasks/999
   3 /wp-login.php
   3 /favicon.ico
```

- 2 は `grep POST samples/access.log | wc -l` でも同じです。
- 4 で `sort` を先にするのは、`uniq` が**隣り合った**同じ行しかまとめないためです（本文6.2節）。
- 6 の `/wp-login.php` は、WordPress（よく使われるブログのソフト）のログイン画面の場所です。このサイトは WordPress ではないので、**弱いところを探して、いろいろなサイトに手当たり次第にアクセスするボット**だと考えられます。公開したサーバには、必ずこうしたアクセスが来ます（第10部・第12部）。`/favicon.ico` は、ブラウザがタブのアイコンを自動で取りに来るもので、攻撃ではありません。

### 問題6 権限を読む・変える

1. `secret.txt` = **640**、`deploy.sh` = **755**、`id_ed25519` = **600**（`rw-` = 4+2 = 6、`r-x` = 4+1 = 5、`r--` = 4、`---` = 0）。
   `bob` は `staff` グループなので、`secret.txt` はグループの `r--` で「読めるが、書けない」。`deploy.sh` はグループの `r-x` で「実行できる」。`id_ed25519` は持ち主の `alice` しか読めません。秘密鍵（第3章）はこの形にしておかないと、ssh が「ほかの人に読まれるかもしれない」と言って使ってくれません。

2.

```sh
$ cd ~/dev/ch01/playground
$ touch a.sh b.txt c.txt
$ chmod u+x a.sh             # 持ち主（u）に x を足す
$ chmod 600 b.txt            # rw- --- ---
$ chmod a-w c.txt            # 全員（a）から w を外す（chmod -w c.txt でもよい）
$ ls -l a.sh b.txt c.txt
-rwxr--r--  1 alice  staff  0 11  7 10:00 a.sh
-rw-------  1 alice  staff  0 11  7 10:00 b.txt
-r--r--r--  1 alice  staff  0 11  7 10:00 c.txt
```

`c.txt` を数で書くと `444` です。

3.

```sh
$ echo hi > c.txt
zsh: permission denied: c.txt
```

持ち主の `alice` 自身でも、`w` が無いと書けません。このとき `sudo` を付けるのではなく、`ls -l` で権限を見て、必要なら `chmod u+w c.txt` で直します（本文8.3節）。

---

## 応用

### 問題7 動かないスクリプトを直す

1. 原因:

```sh
$ ./exercises/broken-script.sh
zsh: permission denied: ./exercises/broken-script.sh
$ bash exercises/broken-script.sh
exercises/broken-script.sh: line 2: cd: $'~\r': No such file or directory
…（表示が崩れたり、ホームではない場所のファイルを数えたりする）
```

| # | 原因 | 調べ方 | 見えたもの |
| --- | --- | --- | --- |
| 1 | 実行権限が無い | `ls -l exercises/broken-script.sh` | `-rw-r--r--`（`x` が無い） |
| 2 | 改行コードが CRLF | `file exercises/broken-script.sh`、`cat -e exercises/broken-script.sh` | `with CRLF line terminators`、行の最後が `^M$` |
| 3 | shebang が無い | `head -n 1 exercises/broken-script.sh` | 1行目がコメント（`#!` で始まっていない） |

2つ目の原因のせいで、`cd ~` が「`~\r` というフォルダへ移動」と読まれ、失敗しています。`$'~\r'` は、bash が「`~` の後に CR という見えない文字が付いている」ことを表す書き方です。

2. 直し方:

```sh
$ echo '#!/usr/bin/env bash' > fixed.sh                 # 1行目に shebang を書く（> で新しく作る）
$ tr -d '\r' < exercises/broken-script.sh >> fixed.sh   # \r を消した中身を、後ろに足す（>>）
$ chmod +x fixed.sh                                     # 実行権限を付ける
$ ./fixed.sh
今日は 2026-11-07 です
ホームには 12 個のファイル/フォルダがあります
$ file fixed.sh                                         # with CRLF line terminators と出なくなる
```

`'#!/usr/bin/env bash'` をシングルクォートで囲むのは、`!` をシェルに特別な意味で読ませないためです。VS Code で開いて、1行目を足し、右下の「CRLF」を「LF」に変えて保存してもかまいません。直した後のファイルは [broken-script-fixed.sh](broken-script-fixed.sh) です。

3. Windows で作られたファイルや、Windows を使う人からメールやチャットで受け取ったファイル、改行の設定がばらばらのリポジトリで起こります。実行権限は、ファイルをダウンロードしたり、zip で受け取ったりすると外れていることがあります。第3章の `.gitattributes`、第4章の EditorConfig で、もう一度出てきます。

### 問題8 環境変数を読むスクリプト

解答: [port.sh](port.sh)

```bash
#!/usr/bin/env bash
port="${PORT:-3000}"                   # PORT が無いか空なら 3000（本文10.1節）

# 数字を消して何か残れば、数字以外が混ざっている（本文6.2節の tr -d '0-9'）
if [[ -n "$(echo "$port" | tr -d '0-9')" ]]; then
  echo "PORT は数字にしてください: $port" >&2
  exit 1
fi

echo "ポート $port で待ち受けます"
```

```sh
$ PORT=9000                          # シェル変数
$ bash port.sh
ポート 3000 で待ち受けます            # 子のプロセス（bash）には渡らない
$ export PORT
$ bash port.sh
ポート 9000 で待ち受けます            # 環境変数になったので渡る
$ unset PORT
$ echo $PATH | tr ':' '\n' | wc -l     # PATH のフォルダの数（数は Mac によって違う）
       9
```

- `"$(echo "$port" | tr -d '0-9')"` の外側の `"…"` は、結果を1つの文字列として `-n` に渡すためです。中の `"$port"` は、`$( )` の中で新しくクォートし直しています。
- `PORT=9000` の後の `bash port.sh` が `3000` になるのは、`export` していないシェル変数は、子のプロセスに渡らないためです（本文10.1節）。第5部 第26章で、Node.js のサーバの設定を環境変数で渡すときに、同じことが起きます。
- 本当のサーバでは、`0` や `99999` のような、ポートとして使えない数も断ります。第5部 第26章で、Node.js で同じ確かめを書きます。

### 問題9 エイリアスと関数を作る

解答: [zsh-functions.zsh](zsh-functions.zsh)

```sh
$ cp ~/.zshrc ~/.zshrc.backup
$ type ll mkcd                          # 1.
ll is an alias for ls -lahF
mkcd is a shell function
$ cat >> ~/.zshrc <<'EOF'               # 2. bak を足す（open -e ~/.zshrc で開いて書いてもよい）

# bak ファイル: ファイル名.YYYY-MM-DD.bak という名前でコピーを作る
bak() {
  if [[ $# -lt 1 ]]; then
    echo "使い方: bak ファイル" >&2
    return 1
  fi
  cp -i "$1" "$1.$(date +%Y-%m-%d).bak"
}
EOF
$ source ~/.zshrc
$ cd ~/dev/ch01/playground && bak memo.txt && ls memo.txt.*
memo.txt.2026-11-07.bak
$ bak; echo $?
使い方: bak ファイル
1
```

- 日付は `$(date +%Y-%m-%d)` で作り、`"$1.$(date +%Y-%m-%d).bak"` のように、ファイル名の後ろにつなげます。
- `cp -i` にしておくと、同じ日に2回 `bak` したとき、上書きの前に確かめてくれます。
- 関数で `exit 1` と書くと、ターミナルのタブごと閉じてしまいます。関数は `return` です（本文11.3節）。

3: スクリプトは、**別のプロセス**として動きます。`bash mkcd.sh x/y` は新しい bash を起動し、その bash の中でフォルダを作って移動します。スクリプトが終わるとその bash はなくなるので、移動もなかったことになります。フォルダはファイルシステムに作られたので残ります。本文1.4節の「`cd` が組み込みである理由」と同じです。

---

## 発展

### 問題10 ログを要約するコマンドを作る

解答: [log-summary.sh](log-summary.sh)

```sh
$ mkdir -p ~/.local/bin
$ cp log-summary.sh ~/.local/bin/log-summary
$ chmod +x ~/.local/bin/log-summary
$ which log-summary                     # 本文11.4節で PATH に足してあれば見つかる
/Users/alice/.local/bin/log-summary
$ log-summary samples/access.log; echo "exit=$?"
ファイル: samples/access.log
リクエスト数: 80
4xx の件数: 17
5xx の件数: 7
アクセスの多いパス（上位3件）:
  18 /tasks
  12 /static/app.js
  11 /
警告: 5xx が 7 件あります
exit=2
$ awk '$9 < 500' samples/access.log > ok.log
$ log-summary ok.log > /dev/null; echo "exit=$?"
exit=0
```

ポイント:

- `which log-summary` で何も出ないときは、本文11.4節の `.zprofile` の設定（`~/.local/bin` を PATH に足す）ができていません。**PATH は `~/.zprofile` に書きます**。`.zshrc` に書くと、`source ~/.zshrc` するたびに、同じフォルダが PATH に重なっていきます。
- 件数は、`awk '$9 >= 500' "$log" | wc -l | tr -d ' '` のように「条件に合う行だけを通して、行の数を数え、前の空白を消す」で出しています。空白を消しておくと、`[[ $count_5xx -gt 0 ]]` で数として比べられます。
- エラーと警告は `>&2` で stderr に出しています。こうしておくと、`log-summary access.log > report.txt` としたとき、ファイルには結果だけが入り、警告は画面に出ます。
- 第3部 第11章で、同じ集計を JavaScript で書きます。

### 問題11 リダイレクトと awk をもう一歩

1.

```sh
$ bash samples/streams-demo.sh > both.txt 2>&1      # 画面には何も出ない。both.txt に2行
$ bash samples/streams-demo.sh 2>&1 > both.txt      # 画面に stderr の行が出る。both.txt には stdout の1行だけ
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
$ bash samples/streams-demo.sh 2>&1 > /dev/null | wc -l
       1
```

パイプがあるとき、stdout は最初からパイプを向いています。① `2>&1` で stderr を「今の stdout の先」＝パイプに向け、② その後で stdout だけを `/dev/null` に向けると、パイプに流れるのは stderr だけになります。

3.

```sh
$ awk '{sum += $10} END {print "合計:", sum, "平均:", sum / NR}' samples/access.log
合計: 373903 平均: 4673.79
```

4.

```sh
$ cut -d: -f2 samples/access.log | sort | uniq -c
  17 09
  14 10
  18 11
  15 12
  16 13
```

`[04/Nov/2026:09:03:15` の `:` で区切ると、1番目が `…[04/Nov/2026`、2番目が「時」になります。

5.

```sh
$ awk '$9 >= 500 {print $1, $7}' samples/access.log
203.0.113.5 /api/report
203.0.113.5 /api/report
198.51.100.9 /api/report
203.0.113.5 /api/report
192.0.2.77 /api/report
203.0.113.5 /api/report
198.51.100.23 /api/report
```

5xx は、どれも `/api/report` で起きています。いろいろな人が同じ場所でエラーになっているので、`/api/report` のサーバの側のバグを疑います。こうして、ログからどこを調べればよいかの見当を付けられます。
