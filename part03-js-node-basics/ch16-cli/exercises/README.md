# 第16章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part03/ch16-cli/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part03/ch16-cli/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | あいさつする CLI を parseArgs で作る | [greet-cli.mjs](greet-cli.mjs)、[greet-cli.test.mjs](greet-cli.test.mjs) | 3, 5, 6 |
| 2 | 基本 | 標準入力を大文字にして出す CLI | [upper.mjs](upper.mjs)、[upper.test.mjs](upper.test.mjs) | 3, 4 |
| 3 | 基本 | Ctrl+C で止められるカウントダウン | [countdown.mjs](countdown.mjs)、[countdown.test.mjs](countdown.test.mjs) | 6, 8 |
| 4 | 基本 | リダイレクトとパイプの結果を予想する（調べる問題） | [streams.mjs](streams.mjs) | 1, 5, 6.3 |
| 5 | 応用 | サブコマンドのある CLI の引数を解析する | [parse-cli.mjs](parse-cli.mjs)、[parse-cli.test.mjs](parse-cli.test.mjs) | 3 |
| 6 | 応用 | 「本当に消しますか？」と聞く関数 | [confirm.mjs](confirm.mjs)、[confirm.test.mjs](confirm.test.mjs)、[confirm-demo.mjs](confirm-demo.mjs) | 4 |
| 7 | 応用 | 設定を重ねて読み込む | [load-config.mjs](load-config.mjs)、[load-config.test.mjs](load-config.test.mjs) | 9 |
| 8 | 発展 | パイプの中で壊れる grep を直す | [buggy-grep.mjs](buggy-grep.mjs)、[check-grep.sh](check-grep.sh) | 4〜7 |
| 9 | 発展 | Ctrl+C で止めても壊れない書き出し | [long-task.mjs](long-task.mjs)、[check-long-task.sh](check-long-task.sh) | 8 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜7: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。問題1〜3のテストは、CLI を子プロセスとして起動して、外から確かめます（本文10節）。
- 問題8・9: `bash check-○○.sh ファイル` ですべて OK になれば完成です。`bash` は、シェルスクリプト（コマンドを並べたファイル）を実行するコマンドです。
- 作業用のファイルは OS の一時フォルダに作り、最後に消します。問題6と7で作る関数は、成果物の [project-memo-cli](../../project-memo-cli/README.md) で使います。

---

## 基本

### 問題1 あいさつする CLI を parseArgs で作る

[greet-cli.mjs](greet-cli.mjs) を、次のように動く CLI にしてください。

```sh
$ node greet-cli.mjs
こんにちは、world
$ node greet-cli.mjs alice bob
こんにちは、alice
こんにちは、bob
$ node greet-cli.mjs alice --shout --times 2
こんにちは、ALICE！
こんにちは、ALICE！
$ node greet-cli.mjs --help
使い方: node greet-cli.mjs [名前...] [-s|--shout] [-t|--times 回数] [-h|--help]
```

- 名前（位置引数）を並べると、1人ずつ `こんにちは、名前` と出す。無ければ `world`
- `-s`・`--shout`: 英字を大文字にして、最後に `！` を付ける
- `-t`・`--times 回数`: 全体をその回数だけ繰り返す（既定は 1）。1以上の整数でなければ（`0`・`-1`・`abc`・`1.5`・空の文字列）、標準エラー出力にエラーを書いて、終了コード 2
- `-h`・`--help`: ファイルにある `USAGE` を**標準出力**に出して、終了コード 0
- 知らないオプション（`--loud` など）: 標準エラー出力にエラーと `USAGE` を書いて、終了コード 2

```sh
$ node --test greet-cli.test.mjs
ℹ pass 7
ℹ fail 0
```

ヒント:

- 本文3.2節の `args.mjs` が、ほぼそのまま土台になります。`parseArgs` は、知らないオプションがあると例外を投げるので、`try`/`catch` で受け止めます。
- 「1以上の整数」は、`/^[1-9]\d*$/.test(values.times)` で確かめます（本文3.2節）。
- 終わり方は `process.exit()` ではなく `process.exitCode = 2` にします（本文6節）。
- `--help` は「頼まれて出す使い方」なので標準出力、エラーのときの使い方は標準エラー出力です（本文5.1節）。

### 問題2 標準入力を大文字にして出す CLI

[upper.mjs](upper.mjs) を、標準入力を読んで英字を大文字にして出す CLI にしてください。

```sh
$ printf 'hello\nworld\n' | node upper.mjs
HELLO
WORLD
$ printf 'hello\nworld\n' | node upper.mjs -n
1: HELLO
2: WORLD
```

- 標準入力を全部読み、1行ずつ `toUpperCase()` して出す。最後の行に改行が無くても、その行も出す
- `-n`・`--number`: 行の頭に `1: ` のように番号を付ける
- 入力が空なら、何も出さずに終了コード 0
- 日本語の文字が、チャンク（届くかたまり）の境目で切れて届いても、文字化けしない
- 知らないオプションなら、標準エラー出力にエラーを書いて、終了コード 2
- 標準入力が端末（パイプでない）なら、標準エラー出力に使い方を書いて、終了コード 2（テストでは確かめません。`node upper.mjs` とだけ打って試してください）

```sh
$ node --test upper.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文4節の `read-stdin.mjs` と同じく、`for await` でチャンクを **Buffer のまま**配列に集め、最後に `Buffer.concat(chunks).toString('utf8')` で文字列にします。チャンクごとに `toString` すると、文字の途中で切れたときに化けます。
- `'a\nb\n'.split('\n')` は `['a', 'b', '']` です。最後の `''` は行ではないので取り除きます（`lines.at(-1) === ''` なら `lines.pop()`）。
- 番号は `lines.forEach((line, i) => ...)` の `i + 1` です。

### 問題3 Ctrl+C で止められるカウントダウン

[countdown.mjs](countdown.mjs) を、1秒ごとに数を減らしながら表示し、最後に `発射！` と出す CLI にしてください。

```sh
$ node countdown.mjs 3
3
2
1
発射！
$ node countdown.mjs 10
10
9
^C中止しました
$ echo $?
130
```

- 引数の秒数から 1 まで数える。書かなければ 5 から
- 秒数が1以上の整数でなければ、標準エラー出力にエラーを書いて、終了コード 2
- 途中で Ctrl+C（SIGINT）を受けたら、タイマーを止めて、標準エラー出力に `中止しました` と出し、終了コード 130 で終わる（`発射！` は出さない）
- 1回の間隔は、ファイルの先頭にある `TICK_MS` を使う（テストでは 100ms にして速くします）

```sh
$ node --test countdown.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- 本文8節の `stop-me.mjs` が土台になります。`setInterval` で数え、`process.on('SIGINT', ...)` の中で `clearInterval` します。
- `clearInterval` でタイマーが無くなれば、Node.js はやることが無くなって自然に終わります。`process.exit()` は要りません。`process.exitCode = 130` だけ設定します（本文6節）。
- `echo $?` は、直前のコマンドの終了コードを表示します。

### 問題4 リダイレクトとパイプの結果を予想する（調べる問題）

[streams.mjs](streams.mjs) は、標準出力に `out 1`・`out 2`、標準エラー出力に `err 1` を出します。引数に `fail` を付けると、終了コード 1 で終わります。

```js
console.log('out 1');
console.error('err 1');
console.log('out 2');
process.exitCode = process.argv[2] === 'fail' ? 1 : 0;
```

次の11個のコマンドについて、**実行する前に**「画面に何が出るか」「ファイルに何が入るか」を予想して書き出してください。その後、一時フォルダ（`cd "$(mktemp -d)"` して、`streams.mjs` をコピー）で実行して確かめます。

```sh
 1. node streams.mjs > out.txt; cat out.txt
 2. node streams.mjs 2> /dev/null
 3. node streams.mjs 2>&1 | wc -l
 4. node streams.mjs | wc -l
 5. node streams.mjs fail && echo 成功
 6. node streams.mjs fail || echo 失敗
 7. node streams.mjs fail; echo $?
 8. node streams.mjs fail | wc -l; echo $?
 9. node streams.mjs > out.txt 2>&1; echo ---; cat out.txt
10. node streams.mjs 2>&1 > out.txt; echo ---; cat out.txt
11. node streams.mjs | grep err; echo $?
```

特に、次の3つは理由を説明してください。

- 8番: `streams.mjs` は失敗したのに、`$?` が 0 なのはなぜか。`streams.mjs` の終了コードを知るにはどうするか（zsh と bash で書き方が違います）
- 9番と10番: `>` と `2>&1` の順番を入れ替えると、結果が変わるのはなぜか
- 11番: `err 1` が画面に出ているのに、`grep` の終了コードが「見つからなかった」になるのはなぜか

> Mac の `wc -l` は、数の前に空白を付けて ` 3` のように出します。

---

## 応用

### 問題5 サブコマンドのある CLI の引数を解析する

todo を管理する CLI の引数を解析する関数 `parseCli(argv)` を、[parse-cli.mjs](parse-cli.mjs) に作ってください。`argv` は `process.argv.slice(2)` と同じ形の配列です。使い方が間違っていたら、ファイルにある `UsageError`（`exitCode` が 2）を投げます。

**サブコマンド**

| コマンド | 返す値 |
| --- | --- |
| `add <タイトル...> [-t, --tag 名前]... [--due YYYY-MM-DD]` | `{ command: 'add', title, tags, due }`。`title` は位置引数を空白1つでつないだもの。`tags` は書かれなければ `[]`、`due` は `null` |
| `list [-t, --tag 名前] [-a, --all] [-n, --limit 件数]` | `{ command: 'list', tag, all, limit }`。既定は `tag: null`、`all: false`、`limit: 20` |
| `done <番号>` | `{ command: 'done', id }`。`id` は数 |

**要件**

- `--help`・`-h` が（`--` より前の）どこかにあれば、ほかが間違っていても `{ command: 'help', topic }` を返す。`topic` は、1つ目の引数が知っているサブコマンドならその名前、そうでなければ `null`
- 1つ目の引数が `--version`・`-V` なら `{ command: 'version' }`
- オプションは**サブコマンドごと**に決まる。`done 3 --tag x` や `list --due ...` はエラー
- `--due` は `YYYY-MM-DD` の形で、**実在する日付**だけ（`2026-02-30` はエラー）
- `--limit` と番号は、1以上の整数だけ。`0`・`-1`・`1.5`・`''`・`1e2`・`' 3'` はエラー
- `add` のタイトルが無い、`list` に位置引数がある、`done` の番号が1つでない、はエラー
- コマンドが無い、知らないコマンド（メッセージにその名前を入れる）、1つ目が知らないオプション、はエラー
- `constructor` や `toString` は、知らないコマンドとして扱う
- `--` より後ろは、`-` で始まっていてもタイトルの一部（`add -- -5度の朝`）

```sh
$ node --test parse-cli.test.mjs
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

ヒント: `parseArgs` が投げるエラーも、`UsageError` に包み直します。日付は `Date.UTC` で作ってから、年・月・日が元と同じかを確かめると、実在するかが分かります。

### 問題6 「本当に消しますか？」と聞く関数

メモを消す前に確かめる関数 `confirm(message, options)` を、[confirm.mjs](confirm.mjs) に作ってください。今の `confirm.mjs` には最初の版が書いてありますが、テストのうち7個が失敗します。

**`confirm(message, { input, output, assumeYes, defaultAnswer, maxTries })`**

- `input`（既定 `process.stdin`）から答えを読み、`output`（既定 `process.stderr`）に `"<message> [y/N] "` と出す。`defaultAnswer`（既定 `false`）が `true` なら `[Y/n]`
- `y`・`yes`・`はい` なら `true`、`n`・`no`・`いいえ` なら `false`。大文字・小文字、前後の空白は区別しない
- 何も打たずに `Return` なら `defaultAnswer`
- それ以外の答えなら `"y か n で答えてください"` と出して、もう一度聞く。`maxTries`（既定 3）回聞いても分からなければ `false`
- 答えずに入力が終わったら（`Ctrl+D`）`false`。**待ったまま止まらない**
- `assumeYes`（`--yes` を付けたとき）なら、聞かずに `true`。何も出さず、`input` も読まない
- `input.isTTY` が `true` でなければ、`NotInteractiveError` を投げる（メッセージに `--yes` を入れる）。パイプから流れてきた答えは使わない
- 端末で `Ctrl+C` が押されたら、`CancelledError`（`exitCode` 130）を投げる
- 続けて何回呼んでも動く（`input` を閉じない）

```sh
$ node --test confirm.test.mjs
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

テストでは、本物の端末の代わりに `PassThrough` を使い、`input.isTTY = true` を付けて端末のふりをします。`Ctrl+C` はテストにしていないので、[confirm-demo.mjs](confirm-demo.mjs) を端末で動かして確かめてください。

```sh
$ node confirm-demo.mjs                 # y、n、変な答え、Return だけ、Ctrl+D、Ctrl+C を試す
メモを3件消します。よろしいですか？ [y/N] y
消しました（ふり）
$ node confirm-demo.mjs --yes
消しました（ふり）
$ echo y | node confirm-demo.mjs; echo $?
エラー: 端末ではないので確認できません。確認なしで進めるなら --yes を付けてください
2
```

ヒント: `readline/promises` の `question` は、入力が終わっても答えが来るのを待ち続けることがあります。`createInterface` の返す `rl` の `'close'` イベントと、`question` の `{ signal }` を組み合わせます。端末のときだけ（`input` と `output` の両方が端末のとき）`terminal` モードにすると、`Ctrl+C` は `rl` の `'SIGINT'` イベントとして届きます。

### 問題7 設定を重ねて読み込む

成果物の `memo` コマンドの設定を読み込む関数 `loadConfig({ flags, env, home, cwd })` を、[load-config.mjs](load-config.mjs) に作ってください。`env`・`home`・`cwd` を引数で受け取るのは、テストで本物のホームフォルダや環境変数を使わないためです。

**設定の項目と既定の値**

| 項目 | 既定の値 | 設定ファイル | 環境変数 | 引数（`flags`） |
| --- | --- | --- | --- | --- |
| `dir`（メモを置くフォルダ） | `<home>/memos` | `"dir"` | `MEMO_DIR` | `flags.dir` |
| `editor` | `vi` | `"editor"` | `MEMO_EDITOR` > `VISUAL` > `EDITOR` | `flags.editor` |
| `color` | `true` | `"color"`（`true`/`false`） | `NO_COLOR` があれば `false` | `flags.color === false` なら `false` |

**要件**

- 優先順位は、既定の値 < 設定ファイル < 環境変数 < 引数
- 設定ファイルは `$XDG_CONFIG_HOME/memo/config.json`。`XDG_CONFIG_HOME` が無い・空なら `<home>/.config`。相対パスなら無視して、`warnings` に入れる
- `flags.config` があれば、そのファイルを読む（`cwd` からの相対パス）。そのときは、無ければ `ConfigError`
- 既定の場所に設定ファイルが無いのはエラーではない
- 壊れた JSON、中身がオブジェクトでない、型の違う値は `ConfigError`（`exitCode` 2）。メッセージにファイルの場所や項目の名前を入れる
- 知らない項目は、エラーにせず `warnings` に入れる
- 空の環境変数は、設定されていないのと同じ
- `dir` は絶対パスにする。`~` と `~/...` はホームフォルダに展開する。相対パスは、設定ファイルの中なら設定ファイルのあるフォルダから、環境変数と引数なら `cwd` から
- `env` を書き換えない
- 返す値は `{ config: { dir, editor, color }, sources, configFile, fileLoaded, warnings }`。`sources` は各項目がどこから来たか（`'default'`・`'file'`・`'env'`・`'args'`）

```sh
$ node --test load-config.test.mjs
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

ヒント: いきなり全部を1つのオブジェクトに混ぜず、`set(key, value, source)` のような小さな関数で、値と出どころを一緒に記録しながら重ねていくと、`sources` が自然に作れます。

---

## 発展

### 問題8 パイプの中で壊れる grep を直す

[buggy-grep.mjs](buggy-grep.mjs) は、`grep` の小さな版です。端末で試すと、ちゃんと動いているように見えます。

```sh
$ node buggy-grep.mjs -i apple fruits.txt
apple
Apple pie
```

ところが、パイプやリダイレクトの中で使うと、おかしなところがたくさんあります。[check-grep.sh](check-grep.sh) で確かめてください。

```sh
$ bash check-grep.sh
[OK] 1. 見つかった行を出す
[OK] 2. -c で数を出す
[NG] 3. 見つからなければ終了コード 1
...
10 件失敗しました
```

確認スクリプトの14個のうち、直す前は10個が失敗します（1・2・7・8 だけ成功）。どれも、本文の4〜7節の内容です。**`buggy-grep.mjs` をコピーして `grep.mjs` を作り**、すべて成功するように直してください（`bash check-grep.sh grep.mjs`）。

**直した後の仕様**

- 終了コードは本物の `grep` と同じ: 1行でも見つかれば 0、見つからなければ 1、エラーがあれば（見つかった行があっても）2
- エラーは標準エラー出力に出す。無いファイルがあっても、残りのファイルは続ける
- `--color=auto`（既定）は、端末のときだけ色を付ける。`NO_COLOR`・`FORCE_COLOR` を守る。`always`・`never` はいつも付ける・付けない。それ以外の値はエラー
- 大きな出力をパイプに出しても、最後まで届く
- `| head` で途中で閉じられたら、エラーを出さずに終了コード 0 で終わる
- 標準入力やファイルのチャンクの境目で、行も文字（UTF-8）も壊さない

それぞれの NG について、「何が起きていたか」を説明してから直してください。特に9番では、20万行のうち足りないのは少しだけです（数行〜数百行。毎回変わることもあります）。本文6.1節の `exit-demo.mjs` では 10MB のうち 64KB しか届かなかったのに、こちらはなぜ少ししか切れないのかも考えてください（ヒント: `buggy-grep.mjs` は背圧を守って書いています）。

### 問題9 Ctrl+C で止めても壊れない書き出し

[long-task.mjs](long-task.mjs) は、`--items` 件を1件ずつ時間をかけて（`--delay` ミリ秒）出力ファイルに書きます。

```sh
$ node long-task.mjs out.txt --items 5 --delay 100
1/5
...
5 件を /.../out.txt に書きました
```

途中で `Ctrl+C` を押すと、出力ファイルは中途半端なまま残ります。前からあったファイルは、もう戻りません。次の要件を満たすように直してください。

- 出力ファイルと同じフォルダの一時ファイルに書き、最後まで終わったら `rename` で置き換える（第15章3.4節）
- `SIGINT` を受け取ったら、**今の1件が終わってから**止める。一時ファイルを消し、出力ファイルは元のまま、`中止しました` を含むメッセージを標準エラー出力に出して、終了コード 130
- `SIGTERM` も同じ。終了コードは 143
- 止めるのを待っている間に、もう一度シグナルを受け取ったら、待たずに**すぐに**終わる（一時ファイルが残ることがあるのは、かまいません）
- 最後まで終われば終了コード 0

```sh
$ bash check-long-task.sh
...
4 件失敗しました
$ bash check-long-task.sh            # 直した後
...
すべて成功しました
```

直す前は13個のうち4個が失敗します。成功している 2a・3a・4a（終了コード 130・143）は、直す前は Node.js が**シグナルで殺されて**いて、シェルがそれを 128 + 番号で表しているだけです。直した後は、自分で `process.exitCode` を決めて終わります。両者の違いを説明してください。

ヒント: `kill -INT` は、確認スクリプトの中から送っています。端末で試すときは、`node long-task.mjs out.txt --items 50` を動かして `Ctrl+C` を押します（1回、または素早く2回）。
