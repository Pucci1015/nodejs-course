# 第16章 CLI ツールを作る

この章では、ターミナルで使う**コマンドラインのツール**（CLI）を Node.js で作ります。
CLI は小さなプログラムですが、シェルのパイプやリダイレクト、終了コード、シグナルの中で動くので、Web アプリにはない決まりがたくさんあります。端末で試すと動いて見えても、`| head` や `> out.txt` の中では壊れていることがよくあります。この章では、その「壊れ方」を実際に起こしてから直します。
ここで身につける「標準出力には結果だけ」「終了コードで成否を伝える」「シグナルを受けたら片付けて終わる」は、第4部以降の Web サーバを本番で動かすときにもそのまま使います。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第1部 第1章（パイプ・リダイレクト・終了ステータス・PATH）、第14章（`package.json`、`bin`）、第15章（`fs`、`process`、Stream、`readline`） |
| この章のゴール | シバン・`bin`・`npm link` で自分のコマンドを作れる / `parseArgs` でサブコマンドとオプションを解析し、間違いには終了コード 2 で答えられる / 標準出力と標準エラー出力を使い分けられる / 端末とパイプで振る舞いを変えられる（入力・色） / `process.exit()` で出力が切れる理由と、EPIPE を説明できる / シグナルを受けて安全に終われる / 設定の優先順位を決めて実装できる / CLI を子プロセスとして起動してテストできる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | `bin` と `npm link`、`parseArgs`、標準入力、色、`exit` と `exitCode`、EPIPE、シグナル、設定、CLI のテスト |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

---

## 1. CLI の決まりごと

シェルの中で動くプログラムは、ほかのプログラムと**つなげて**使われます（第1部 第1章5節）。つなげても困らないように、次の決まりがあります。

| 決まり | 理由 |
| --- | --- |
| **標準出力**（stdout）には結果だけを出す | `| grep`、`> out.txt` で次のプログラムやファイルに渡るのは標準出力。そこにメッセージが混ざると、受け取った側が壊れる |
| エラー、進み具合、質問は**標準エラー出力**（stderr）に出す | リダイレクトしても画面に残る。人に向けた文字はこちら |
| **終了コード**で成否を伝える。0 が成功、それ以外は失敗 | `&&`、`||`、`if`、CI、`make` は終了コードしか見ない |
| 使い方の間違いは終了コード 2 | 多くのコマンド（`grep`、`ls`、Python の `argparse`）の慣習 |
| 端末でなければ、色を付けない・質問しない | ファイルやパイプの先に人はいない |
| `--help` と `--version` に答える | 使い方を調べる、いつもの方法 |
| `Ctrl+C` で止まる。止まるときは片付ける | 書きかけのファイルを残さない |

`grep` は「見つかった 0、見つからない 1、エラー 2」のように、0 以外を使い分けるコマンドもあります。自分の CLI の終了コードは、`--help` か README に書いておきます。

```sh
$ grep -q root /etc/passwd; echo $?
0
$ grep -q nobody-here /etc/passwd; echo $?
1
$ grep -q x /nai; echo $?
grep: /nai: No such file or directory
2
```

## 2. コマンドにする: シバン、chmod、bin、npm link

### 2.1 シバンと実行の許可

`node hello.mjs` と書かずに `./hello.mjs` で動かすには、ファイルの1行目に**シバン**（shebang）を書き、実行の許可を付けます（第1部 第1章9節）。

```js
#!/usr/bin/env node
console.log('こんにちは');
```

```sh
$ cd samples/hello-cli
$ chmod +x bin/hello.mjs          # 実行してよい印（x）を付ける
$ ./bin/hello.mjs 山田
こんにちは、山田
```

`#!/usr/bin/env node` は「PATH の中から `node` を探して、それにこのファイルを渡す」という意味です。`#!/Users/ryota/.local/share/mise/installs/node/24.../bin/node` のように直接書くと、mise で Node.js のバージョンを変えたときや、ほかの人の Mac で動きません。Node.js はシバンの行を読み飛ばすので、1行目に書いても文法のエラーになりません。

### 2.2 package.json の bin

[samples/hello-cli/package.json](samples/hello-cli/package.json) には `bin` が書いてあります。

```json
{
  "name": "hello-cli",
  "type": "module",
  "bin": { "hello-cli": "./bin/hello.mjs" }
}
```

`bin` は「この名前のコマンドとして、このファイルを使う」という宣言です。このパッケージを `npm install` すると、npm が `node_modules/.bin/hello-cli` に**シンボリックリンク**を作ります（第14章10節で見た `node_modules/.bin` です）。

### 2.3 npm link で自分の Mac に入れる

作っている途中の CLI を、どこからでも名前で呼べるようにするのが `npm link` です。

```sh
$ cd samples/hello-cli
$ npm link                       # グローバルの場所に、このフォルダへのリンクを作る
added 1 package, and audited 3 packages in 175ms
$ hello-cli りょうた
こんにちは、りょうた
$ npm ls -g                      # グローバルに入っているもの
/Users/ryota/.local/share/mise/installs/node/24.x.x/lib
└── hello-cli@1.0.0 -> ./../../（samples/hello-cli への相対パス）
$ npm unlink -g hello-cli        # 元に戻す
```

`npm link` はファイルをコピーしないので、`bin/hello.mjs` を書き換えるとすぐに反映されます。

mise で入れた Node.js では、「グローバル」の場所は **Node.js のバージョンごと**のフォルダです（`npm prefix -g` で確かめられます）。そのため、mise で別のバージョンに切り替えると `hello-cli` が見つからなくなります。そのときは、使うバージョンでもう一度 `npm link` します。

> **注意**: `sudo npm link`、`sudo npm install -g` はしないでください。mise で入れた Node.js はホームフォルダの中にあるので、`sudo` は要りません。`sudo` で入れると、ファイルの持ち主が root になり、後で消せなくなります。

シバン付きのファイルを `bin` から指すとき、拡張子を `.mjs` にしておくと、`package.json` の `type` に関係なく ES Modules として読まれます。`bin` のファイルには、実行の許可（`chmod +x`）も必要です。npm は、インストールするときに `bin` のファイルへ実行の許可を付けますが、git で管理するときは自分で付けて、許可ごとコミットしておきます（`git ls-files -s` で `100755` になっていれば付いています）。

## 3. 引数を解析する: util.parseArgs

### 3.1 process.argv

`process.argv` は文字列の配列です。最初の2つは `node` のパスと、スクリプトのパスです（[samples/hello-cli/bin/hello.mjs](samples/hello-cli/bin/hello.mjs) で確かめられます）。自分で使うのは `process.argv.slice(2)` からです。

引数を自分で `for` で読むこともできますが、`-abc`（`-a -b -c`）、`--due=2026-11-05` と `--due 2026-11-05`、`--` の後ろ、などの決まりを全部正しく扱うのは大変です。Node.js には `util.parseArgs` があります（執筆時点では Node.js 18.3 から入り、20 で安定版。https://nodejs.org/api/util.html#utilparseargsconfig ）。

### 3.2 parseArgs の使い方

[samples/args-demo.mjs](samples/args-demo.mjs):

```js
import { parseArgs } from 'node:util';

const options = {
  tag: { type: 'string', short: 't', multiple: true }, // 何回でも書ける → 配列
  due: { type: 'string' },
  verbose: { type: 'boolean', short: 'v' },
  help: { type: 'boolean', short: 'h' },
  limit: { type: 'string', default: '10' },
};
const { values, positionals } = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
```

```sh
$ node args-demo.mjs add 牛乳を買う --tag 買い物 -t 急ぎ --due 2026-11-05 -v
values     : [Object: null prototype] {
  tag: [ '買い物', '急ぎ' ],
  due: '2026-11-05',
  verbose: true,
  limit: '10'
}
positionals: [ 'add', '牛乳を買う' ]
$ node args-demo.mjs add -x; echo $?
エラー: Unknown option '-x'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "-x"
使い方: node args-demo.mjs <コマンド> [引数...] [--tag 名前]... [--due 日付] [-v]
2
$ node args-demo.mjs add -- --これはオプションではない
values     : [Object: null prototype] { limit: '10' }
positionals: [ 'add', '--これはオプションではない' ]
```

| 項目 | 説明 |
| --- | --- |
| `type` | `'string'` か `'boolean'` だけ。数も `'string'` で受け取り、自分で確かめて `Number` にする |
| `short` | 1文字の別名（`-t`） |
| `multiple` | 何回でも書ける。値は配列 |
| `default` | 書かれなかったときの値 |
| `strict`（既定 `true`） | 知らないオプション、値の無い `--due`、`boolean` に値を付けた `--verbose=x` を**エラーにする** |
| `allowPositionals` | オプションでない引数（位置引数）を許す。`strict` のときの既定は `false` |
| `--` | ここから後ろは、`-` で始まっていても位置引数 |

`values` は `Object.prototype` を持たない（`null prototype`）オブジェクトです。`--constructor` のような名前でも、元からあるプロパティと混ざらないようにするためです。

数の確かめ方には注意がいります。`Number('')` は `0`、`Number(' 3')` は `3`、`Number('1e2')` は `100` です。「1以上の整数」を受け付けるなら、`/^[1-9]\d*$/` で文字列のまま確かめてから `Number` にするのが確実です（練習問題2）。

### 3.3 サブコマンド

`git commit`、`npm install` のように、1つ目の位置引数で動作を変える形を**サブコマンド**と呼びます。`parseArgs` にはサブコマンドの機能はないので、次のように2段階で解析します。

1. `argv[0]` を見てサブコマンドを決める（`-` で始まっていたら、サブコマンドではない）
2. サブコマンドごとに決めた `options` で、残りを `parseArgs` する

こうすると、「`done` には `--tag` は使えない」のように、サブコマンドごとに正しくエラーにできます。サブコマンドの名前は、`COMMANDS[name]` で引く前に `Object.hasOwn` で確かめます。`COMMANDS['constructor']` は、何も書いていなくても `Object` 関数を返すからです（第11章の練習問題で見たプロトタイプの話です）。

### 3.4 --help と --version

`--help` はどこに書かれていても（ほかの引数が間違っていても）ヘルプを出し、終了コード 0 で終わるのが親切です。ヘルプは**標準出力**に出します。`mycli --help | less` で読めるようにするためです。使い方の間違いのときに出す短い使い方は、エラーなので標準エラー出力です。

`--version` は、`package.json` の `version` を出すのがふつうです。ES Modules では、次のように JSON を読み込めます（執筆時点では Node.js 22 から安定）。

```js
import pkg from '../package.json' with { type: 'json' };
console.log(pkg.version);
```

## 4. 標準入力: パイプか、人か

`process.stdin.isTTY` は、標準入力が**端末**（TTY）につながっているときだけ `true` です。パイプやファイルのときは `undefined` です（`false` ではありません）。

[samples/stdin-demo.mjs](samples/stdin-demo.mjs) は、これで振る舞いを変えます。

```sh
$ printf 'りんご\nみかん\n' | node stdin-demo.mjs
標準入力から 2 行を読んだ。最初の行: "りんご"
stdin.isTTY: undefined, stdout.isTTY: undefined
$ node stdin-demo.mjs                    # 端末: 質問される
名前は？ りょうた
りょうたさん、続けますか？ [y/N] y
続けます
stdin.isTTY: true, stdout.isTTY: true
```

- パイプから全部読むときは、チャンクを `Buffer` のまま集めて、最後に `Buffer.concat(...).toString('utf8')` にします。チャンクごとに文字列にすると、境目で文字が壊れます（第15章6節）。行ごとに処理するなら `readline` に任せます（第15章7.4節）。
- 人に質問するときは `readline/promises` の `question` を使い、質問は**標準エラー出力**に出します（`createInterface({ input: process.stdin, output: process.stderr })`）。`node stdin-demo.mjs > out.txt` としても質問が画面に見えます。
- 端末でないのに質問してはいけません。`echo y | mycli rm --all` のように、パイプから「はい」が流れてくると、確かめたことになりません。端末でなければ断り、`--yes` を付けたときだけ進めます（練習問題4）。

`Ctrl+D` は「入力の終わり」（EOF）、`Ctrl+C` は「止めて」（SIGINT）です。質問の途中で押されたときにどうするか（止まったまま待ち続けないか）も、決めておく必要があります（練習問題4）。

## 5. 標準出力と標準エラー出力、色

### 5.1 どちらに出すか

| 出すもの | 出す先 | Node.js |
| --- | --- | --- |
| 結果（一覧、検索の結果、JSON） | 標準出力 | `console.log`、`process.stdout.write` |
| エラー、警告 | 標準エラー出力 | `console.error`、`console.warn` |
| 進み具合（`3/10 件`）、質問、「完了しました」 | 標準エラー出力 | `console.error`、`process.stderr.write` |

迷ったら「`> out.txt` したときに、ファイルに入ってほしいか」で決めます。練習問題1で、リダイレクトとパイプの組み合わせを予想します。

### 5.2 色を付ける

端末の文字の色は、**ANSI エスケープシーケンス**という、目に見えない制御文字で付けます（`\x1b[31m` で赤、`\x1b[39m` で元の色）。Node.js では `util.styleText` を使います（第15章8.1節）。

```sh
$ node color-demo.mjs | cat          # パイプの先は端末ではない
✔ 成功 ✘ 失敗 （補足）
stdout.isTTY   : false
hasColors()    : false
NO_COLOR       : （未設定）
端末の幅（columns）: （端末ではない）
色付きの "abc" の length: 13 "\u001b[31mabc\u001b[39m"
```

色の制御文字がファイルやパイプに入ると、`grep` で探せない、`wc -c` が合わない、ログが読みにくい、などの問題が起きます。そのため、色は**端末に出すときだけ**付けます。`styleText` は、既定で出力先が端末かを確かめて、端末でなければ色を付けません。さらに、次の環境変数も見ます。

| 環境変数 | 意味 |
| --- | --- |
| `NO_COLOR`（空でない値） | 色を付けない。利用者が決める共通の約束（https://no-color.org/ ） |
| `FORCE_COLOR`（`1`・`2`・`3`） | 端末でなくても色を付ける。CI のログに色を付けたいときなど |

`grep --color=auto|always|never` のように、利用者が選べるオプションを用意することもあります。`auto` は「端末なら色を付ける」です（練習問題3）。

`styleText(format, text, { stream })` の `stream` には、**実際に書く先**を渡します。既定は `process.stdout` です。標準エラー出力に書く文字なら `{ stream: process.stderr }` です。`stdout` だけをファイルにリダイレクトしたとき、`stderr` はまだ端末だからです。

## 6. 終了コードと process.exit()

### 6.1 exit は出力を捨てることがある

[samples/exit-demo.mjs](samples/exit-demo.mjs) は、10,000,000 バイトを書いてから、終わり方を変えます。

```sh
$ node exit-demo.mjs exitCode | wc -c   # process.exitCode = 3
 10000000
$ node exit-demo.mjs exit | wc -c       # process.exit(3)
   65536
$ node exit-demo.mjs exit > out.txt; wc -c out.txt; rm out.txt
 10000000 out.txt
```

`process.exit()` は**その場で**プロセスを終えます。Mac や Linux では、パイプへの書き込みは非同期で行われるので（https://nodejs.org/api/process.html#a-note-on-process-io ）、まだ書けていない分は捨てられます。パイプの大きさ（64KB）の分だけが届いたのが `65536` です。ファイルへの書き込みは同期なので切れません。「端末やファイルでは動くのに、パイプにつなぐと切れる」という、見つけにくいバグになります。

| 書き方 | 意味 | 使う場面 |
| --- | --- | --- |
| `process.exitCode = 1` | 終了コードを決めておく。やることが無くなったら自然に終わる | **ふつうはこれ** |
| `process.exit(1)` | すぐに終わる。待っている出力、タイマー、`finally` は捨てる | 何も書いていない最初のうち、2回目の `Ctrl+C`、EPIPE を受けた後 |

Python の `sys.exit()` は例外（`SystemExit`）を投げるだけなので、`finally` も動き、バッファも書き出されます。Node.js の `process.exit()` はそれとは違い、本当にその場で止まります。

### 6.2 終了コードの一覧

| コード | 意味 | 誰が決めるか |
| --- | --- | --- |
| 0 | 成功 | 自分 |
| 1 | 失敗（ふつうのエラー） | 自分。捕まえていない例外でも Node.js が 1 にする |
| 2 | 使い方の間違い | 自分（慣習） |
| 13 | 終わっていない top-level await がある | Node.js |
| 130 | `Ctrl+C`（SIGINT）で止まった（128 + 2） | シェル。自分で受け取ったときも、これにそろえる |
| 143 | SIGTERM で止まった（128 + 15） | 同上 |

シグナルで止まったプロセスの終了コードを、シェルは「128 + シグナルの番号」で表します（`kill -l` で番号の一覧が見られます）。

### 6.3 パイプの終了コード

`a | b` の `$?` は、**最後の** `b` の終了コードです。`a` が失敗しても、`b` が成功すれば 0 です。前のコマンドの終了コードは、zsh では `$pipestatus`、bash では `${PIPESTATUS[@]}` で見られます。bash のスクリプトで `set -o pipefail` を書くのは、パイプのどこかで失敗したら失敗にするためです（この教材の確認スクリプトにも書いてあります）。

## 7. EPIPE: 読む人が先にいなくなった

`mycli | head -3` では、`head` は3行読んだら終わり、パイプを閉じます。その後に `mycli` が書こうとすると、OS が **EPIPE**（Broken pipe）を返します。

```sh
$ node epipe-demo.mjs crash | head -3
line 1
line 2
line 3
node:events:505
    throw er; // Unhandled 'error' event
    ^

Error: write EPIPE
...
$ node epipe-demo.mjs fixed | head -3
line 1
line 2
line 3
```

`process.stdout` は Stream です。Stream のエラーは `'error'` イベントで届き、リスナーが無いと例外になります（第15章5節）。C や Python のコマンドは、ふつう **SIGPIPE** というシグナルで静かに終わりますが、Node.js は SIGPIPE を無視する設定で動くので、EPIPE がエラーとして届きます。

直し方は、`process.stdout` の `'error'` を受け取って、EPIPE なら静かに終わることです。

```js
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0); // 読む人がいない。もう書けないので exit で良い
  throw err;
});
```

`console.log` だけで書いているときは、EPIPE で落ちないことがあります（`console` は書き込みのエラーを無視します）。ただし、`console.log` は背圧（第15章7.3節）を気にせずにメモリに溜め続けるので、大きな出力には向きません。大きな出力を `process.stdout.write` と `'drain'` で書くなら、EPIPE の処理も一緒に書きます（練習問題3）。

## 8. シグナル: Ctrl+C で止められたとき

### 8.1 シグナルを受け取る

**シグナル**は、OS がプロセスに送る短い知らせです。

| シグナル | 番号 | 送られるとき | 受け取れるか |
| --- | --- | --- | --- |
| SIGINT | 2 | 端末で `Ctrl+C` | 受け取れる |
| SIGTERM | 15 | `kill <PID>`（既定）。サーバを止めるとき（第12部の Docker もこれ） | 受け取れる |
| SIGKILL | 9 | `kill -9 <PID>` | **受け取れない**。すぐに止まる |
| SIGHUP | 1 | 端末のウィンドウを閉じた | 受け取れる |

受け取らなければ、Node.js は SIGINT・SIGTERM ですぐに終わります。書きかけのファイルはそのまま残ります。`process.on('SIGINT', ...)` を書くと、自分で受け取れます。受け取った後は、**自分で終わらせる**必要があります（何もしないと、`Ctrl+C` が効かなくなります）。

[samples/signal-demo.mjs](samples/signal-demo.mjs):

```js
let stopping = false;
function shutdown(signal, code) {
  if (stopping) process.exit(code);   // 2回目: すぐに終わる
  stopping = true;
  clearInterval(timer);               // 新しい仕事を始めない
  setTimeout(() => {                  // 片付け（本物なら、書きかけのファイルを消す、接続を閉じる）
    fs.rmSync(tmp, { force: true });
    process.exitCode = code;          // 128 + シグナルの番号
  }, 500);
}
process.on('SIGINT', () => shutdown('SIGINT', 130));
process.on('SIGTERM', () => shutdown('SIGTERM', 143));
```

```sh
$ node signal-demo.mjs
PID 12345。一時ファイル /var/folders/.../ch16-signal-demo-12345.tmp を作った。Ctrl+C で止めてください
作業中… 1
作業中… 2
^C
SIGINT を受け取った。片付けてから終わる…
一時ファイルを消した
$ echo $?
130
```

### 8.2 安全に止めるための決まり

- シグナルのリスナーでは「止める」という印を付けるだけにし、実際に止めるのは仕事の切れ目にする。仕事の途中で止めると、データが中途半端になる
- 書き出しは一時ファイルに書いて、最後に `rename` する（第15章3.4節）。途中で止めたら一時ファイルを消すだけで、元のファイルは変わらない
- 片付けに時間がかかるとき、**2回目の `Ctrl+C` ではすぐに終わる**。利用者が「固まった」と思って何度も押すため
- 終了コードは 130（SIGINT）、143（SIGTERM）にそろえる。呼び出した側（シェル、CI）が「止められた」と分かる

練習問題5で、時間のかかる書き出しにこれを組み込みます。同じ考え方は、第4部でサーバを止めるとき（受け付けをやめ、処理中のリクエストを終えてから終わる）にも使います。

## 9. 設定: どこから読み、どれを優先するか

CLI の設定は、いくつかの場所から読み、**重ねて**使います。後ろのものほど強い（上書きする）のが一般的です。

```
既定の値 < 設定ファイル < 環境変数 < コマンドラインの引数
```

その場で書いたもの（引数）ほど「今回だけこうしたい」という強い意思なので、優先します。[samples/config-demo.mjs](samples/config-demo.mjs) で確かめられます。

```sh
$ mkdir -p /tmp/xdg/demo-cli && echo '{"editor":"code --wait"}' > /tmp/xdg/demo-cli/config.json
$ XDG_CONFIG_HOME=/tmp/xdg DEMO_EDITOR=nano node config-demo.mjs --dir /tmp/m
設定ファイル: /tmp/xdg/demo-cli/config.json （あった）
...
結果: { editor: 'nano', dir: '/tmp/m', color: true }
$ rm -r /tmp/xdg
```

### 9.1 設定ファイルの場所: XDG Base Directory

設定ファイルを `~/.myclirc` のようにホームフォルダの直下に置くと、ホームフォルダが散らかります。最近の CLI の多くは、**XDG Base Directory** という決まりに従い、`~/.config/<アプリの名前>/` に置きます（git の `~/.config/git/config`、mise の `~/.config/mise/config.toml` など）。

| 環境変数 | 設定されていないとき | 置くもの |
| --- | --- | --- |
| `XDG_CONFIG_HOME` | `~/.config` | 設定 |
| `XDG_DATA_HOME` | `~/.local/share` | データ（mise の Node.js もここ） |
| `XDG_STATE_HOME` | `~/.local/state` | 履歴など |
| `XDG_CACHE_HOME` | `~/.cache` | 消してもよいキャッシュ |

この決まりでは、`XDG_CONFIG_HOME` が相対パスなら無視します（https://specifications.freedesktop.org/basedir-spec/latest/ ）。Mac の決まりは `~/Library/Application Support/` ですが、CLI ではこちらがよく使われます。

### 9.2 よく使う環境変数

| 環境変数 | 意味 |
| --- | --- |
| `EDITOR`・`VISUAL` | 利用者が使いたいエディタ（`git commit` が開くもの）。`VISUAL` を先に見るのが慣習 |
| `NO_COLOR`・`FORCE_COLOR` | 色（5.2節） |
| `HOME` | ホームフォルダ。`os.homedir()` はこれを見る |
| `CI` | CI の中で動いている。質問しない、色を変える、などの判断に使われる |

### 9.3 気をつけること

- 設定ファイルが**無い**のは普通のこと（エラーにしない）。**壊れている**のはエラーにし、どのファイルの何が悪いかを書く
- 空の環境変数（`EDITOR=`）は「設定されていない」と扱うことが多い
- 設定ファイルの中の相対パスは、「どこから」の相対かを決めておく（ふつうは設定ファイルのあるフォルダから）
- `~` を展開するのはシェルです。`"~/memos"` と引用符で囲んだ値や、設定ファイルの中の `~` は、自分で展開する必要があります
- 「どの値がどこから来たか」を見せるコマンド（`git config --show-origin` のようなもの）があると、利用者が困ったときに調べやすい

練習問題6で、成果物の `memo` コマンドで使う設定の読み込みを作ります。

## 10. CLI をテストする

関数を `import` してテストするだけでは、終了コード、標準出力と標準エラー出力の分け方、標準入力の読み方は確かめられません。CLI は**子プロセスとして起動して**、外から確かめます。[samples/cli-test-demo/count.test.mjs](samples/cli-test-demo/count.test.mjs):

```js
function run(args, { input, cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: { PATH: process.env.PATH, HOME: cwd ?? os.tmpdir(), NO_COLOR: '1', ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (s) => (stdout += s));
    child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
    child.stdin.end(input ?? '');
  });
}

test('無いファイルは stderr に出して、終了コード 1。残りは続ける', async () => {
  // ...
  const r = await run(['nai.txt', 'a.txt'], { cwd: dir });
  assert.equal(r.code, 1);
  assert.equal(r.stdout, '1\ta.txt\n');
  assert.match(r.stderr, /nai\.txt: ファイルがありません/);
});
```

| 工夫 | 理由 |
| --- | --- |
| `process.execPath` で起動する | テストを動かしているのと同じ `node` を使う。PATH の中の別のバージョンを使わない |
| `env` を必要なものだけにする。`HOME` を一時フォルダにする | 自分の Mac の設定ファイル（`~/.config/...`）や環境変数でテストの結果が変わらない |
| テストごとに `mkdtemp` で作業フォルダを作り、終わったら消す | テストどうしが影響しない。教材のフォルダを汚さない |
| 標準入力を必ず `end()` する | 閉じないと、CLI が入力を待ち続けてテストが終わらない |
| 結果は `code`・`stdout`・`stderr` をまとめて確かめる | 「stdout は空で、stderr にメッセージ」のような分け方もテストになる |

```sh
$ cd samples/cli-test-demo
$ node --test count.test.mjs
✔ 標準入力の行数を数える (40.1ms)
...
ℹ pass 6
ℹ fail 0
```

子プロセスの起動には毎回 30〜50ms ほどかかります。細かい場合分け（引数の解析など）は関数として `import` してテストし、外からのテストは「つなぎ目」の確認に絞ると、テストが速く保てます（練習問題2と4は関数のテスト、3と5は外からのテストです）。テストの考え方は第11部で詳しく学びます。

## 11. Python との対応

| やりたいこと | Python | Node.js |
| --- | --- | --- |
| 引数 | `sys.argv`、`argparse`、click、typer | `process.argv`、`util.parseArgs`（npm には commander、yargs） |
| サブコマンド | `add_subparsers()`、`@click.group()` | 自分で2段階に解析する（3.3節） |
| 標準入力 | `sys.stdin.read()`、`for line in sys.stdin` | `for await (const chunk of process.stdin)`、`readline` |
| 端末か | `sys.stdin.isatty()` | `process.stdin.isTTY` |
| 質問 | `input()`、`click.confirm()` | `readline/promises` の `question` |
| 標準エラー出力 | `print(..., file=sys.stderr)` | `console.error` |
| 色 | `click.style()`、rich | `util.styleText` |
| 終了コード | `sys.exit(2)`（例外を投げるだけ） | `process.exitCode = 2`（`process.exit` はその場で止まる） |
| シグナル | `signal.signal(SIGTERM, handler)`、`KeyboardInterrupt` | `process.on('SIGTERM', ...)` |
| コマンドにする | `pyproject.toml` の `[project.scripts]` + `pip install -e .` | `package.json` の `bin` + `npm link` |
| テスト | `subprocess.run`、click の `CliRunner` | `child_process.spawn`、`execFile` |

Python では `Ctrl+C` が `KeyboardInterrupt` という例外になるので、`try`/`finally` で片付けられます。Node.js では例外にはならず、シグナルのイベントとして届きます。`finally` は動かないので、片付けはシグナルのリスナーから始めます。

## まとめ

- 標準出力には結果だけ。エラー・進み具合・質問は標準エラー出力。成否は終了コード（0 成功、1 失敗、2 使い方の間違い）で伝える。
- シバン（`#!/usr/bin/env node`）、`chmod +x`、`package.json` の `bin` でコマンドになる。開発中は `npm link` で自分の Mac に入れる。
- 引数は `util.parseArgs`（`strict`）で解析する。サブコマンドは2段階で解析し、数や日付は自分で確かめる。
- 端末かどうか（`isTTY`）で振る舞いを変える。端末でなければ色を付けない・質問しない。`NO_COLOR` を守る。
- `process.exit()` はパイプへの出力を捨てることがある。ふつうは `process.exitCode` を使う。`| head` の EPIPE は受け取って静かに終わる。
- シグナルを受け取ったら印を付け、仕事の切れ目で片付けて 130・143 で終わる。2回目はすぐに終わる。
- 設定は「既定 < 設定ファイル（XDG） < 環境変数 < 引数」の順に重ねる。CLI のテストは子プロセスとして起動し、環境を切り離して行う。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。
この章の内容を使って、第3部の成果物 [project-memo-cli](../project-memo-cli/README.md) を作ります。

## 参考資料

- Node.js「util.parseArgs」: https://nodejs.org/api/util.html#utilparseargsconfig
- Node.js「util.styleText」: https://nodejs.org/api/util.html#utilstyletextformat-text-options
- Node.js「Process」（`exitCode`・`exit`・シグナル・入出力の同期と非同期）: https://nodejs.org/api/process.html
- Node.js「Readline」: https://nodejs.org/api/readline.html
- Node.js「TTY」: https://nodejs.org/api/tty.html
- npm Docs「package.json の bin」: https://docs.npmjs.com/cli/configuring-npm/package-json#bin
- npm Docs「npm link」: https://docs.npmjs.com/cli/commands/npm-link
- NO_COLOR: https://no-color.org/
- XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/latest/
- Command Line Interface Guidelines（CLI の作り方の指針）: https://clig.dev/
- GNU Coding Standards「Standards for Command Line Interfaces」: https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html
- Mac のターミナルで `man 7 signal`（シグナルの一覧）、`man grep`（EXIT STATUS）

前の章: [第15章 Node.js の標準 API](../ch15-node-api/README.md) ／ 次: [成果物 project-memo-cli](../project-memo-cli/README.md)
