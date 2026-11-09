# 第15章 Node.js の標準 API

Node.js には、ファイル、パス、プロセス、バイト列、ストリーム、子プロセスなどを扱う**標準の API**（組み込みモジュール）がたくさんあります。npm のパッケージの多くも、中ではこれらを使っています。
この章では、第4部でフレームワークなしの Web サーバを作るときと、第16章で CLI を作るときに毎日使うものを選んで、「便利な使い方」だけでなく「どういうときに壊れるか」まで確かめます。途中で落ちても壊れないファイルの書き方、文字の途中で切れたバイト列、大きなファイルを少しずつ流す Stream が中心です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第12章（async/await、AbortSignal）、第13章（イベントループ、スレッドプール）、第14章（ES Modules） |
| この章のゴール | `path` でパスを安全に組み立てられる / `fs/promises` でファイルを扱い、エラーの code で場合分けできる / 途中で落ちても壊れないファイルの書き方を説明できる / `EventEmitter` の決まり（同期・`error`・リークの警告）を説明できる / Buffer と文字コードの境目の問題を避けられる / Stream と `pipeline` で大きなデータを少しずつ処理し、背圧を説明できる / `execFile` と `exec` の違いを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | path、fs、壊れない書き込み、EventEmitter、Buffer、Stream、readline とメモリ、child_process、util・os・crypto |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> ファイルを作るサンプルと練習問題は、教材のフォルダ（OneDrive）を汚さないよう、OS の一時フォルダ（`os.tmpdir()`。Mac では `/var/folders/...` の下）に作って、最後に消します。

---

## 1. 標準 API の地図

| モジュール | 何をするか | この教材で使う場所 |
| --- | --- | --- |
| `node:path` | パスを組み立てる・分解する | どこでも |
| `node:fs/promises`、`node:fs` | ファイルとフォルダ | 第16章、第4部 第19章（静的ファイル） |
| `node:process`（`process`） | 引数、環境変数、終了コード、標準入出力、シグナル | 第16章 |
| `node:events` | `EventEmitter`。HTTP のサーバもストリームもこれを継承している | 第4部 |
| `Buffer`（`node:buffer`） | バイト列 | 第4部 第20章（ボディの読み取り） |
| `node:stream`、`node:stream/promises` | データを少しずつ流す | 第4部 第17・20章 |
| `node:readline` | 1行ずつ読む、対話的な入力 | 第16章 |
| `node:zlib` | gzip などの圧縮 | 第4部 第19章 |
| `node:crypto` | 乱数、ハッシュ、暗号 | 第4部 第22章、第10部 |
| `node:child_process` | 別のプログラムを動かす | 第16章、第10部 第55章 |
| `node:util`・`node:os` | 便利な関数、OS の情報 | どこでも |
| `node:http`・`node:net`・`node:test` など | 第2部と第4部、第11部で | |

Python の標準ライブラリ（`os`・`pathlib`・`shutil`・`subprocess`・`io`・`hashlib`）にあたるものです。どれも、公式のドキュメント（https://nodejs.org/api/）に、各関数がどの Node.js のバージョンから使えるか、安定しているか（Stability）が書かれています。

## 2. path: パスを組み立てる

```sh
$ node samples/path-demo.mjs
--- 組み立てる
path.join('data', 'memos', 'a.md')           → "data/memos/a.md"
path.join('data/', '/memos/', '../a.md')     → "data/a.md"
path.resolve('data', 'a.md')（今のフォルダから）       → "<cwd>/data/a.md"
path.resolve('/srv', 'data', '/etc', 'x')    → "/etc/x"
path.normalize('/a//b/./c/../d')             → "/a/b/d"
--- 分解する
path.dirname(file)                           → "/Users/ryota/dev/memo"
path.basename(file)                          → "2026-11-04 会議.md"
path.basename(file, '.md')                   → "2026-11-04 会議"
path.extname(file)                           → ".md"
path.extname('archive.tar.gz')               → ".gz"
path.extname('.zshrc')                       → ""
...
```

| 関数 | 何をするか | 注意 |
| --- | --- | --- |
| `path.join(...)` | `/` でつなぎ、`..` や `//` を整理する | 途中の `/etc` も「つなぐ」だけ |
| `path.resolve(...)` | 右から見て、**絶対パスになるまで**つなぐ。足りなければ今のフォルダ（`process.cwd()`）から | 途中に `/` で始まるものがあると、そこから先だけになる |
| `path.relative(from, to)` | `from` から `to` への相対パス | 結果が `..` で始まれば、`to` は `from` の外 |
| `path.dirname`・`basename`・`extname`・`parse` | 分解する | `extname` は最後の `.` から。先頭の `.` は拡張子ではない |

文字列を `+` や `` `${dir}/${name}` `` でつながず、`path.join` を使います。`/` の重なりや `..` を正しく整理してくれ、Windows では `\` を使ってくれます（`path.win32`）。

`path.join` も `path.resolve` も、`..` を含むパスを**外に出ないように止めてはくれません**（練習問題1）。利用者が送ってきた名前でファイルを開くときの対策（パストラバーサル）は、第4部 第19章で扱います。

`~` は zsh が展開するもので、Node.js のパスとしては意味がありません。`path.isAbsolute('~/dev')` は `false` です。ホームは `os.homedir()` で取ります。

## 3. fs/promises: ファイルとフォルダ

### 3.1 3つの書き方

| 書き方 | 例 | 使う場面 |
| --- | --- | --- |
| Promise | `import fs from 'node:fs/promises'`、`await fs.readFile(p)` | **ふつうはこれ** |
| コールバック | `import fs from 'node:fs'`、`fs.readFile(p, (err, data) => {})` | 古いコード |
| 同期 | `fs.readFileSync(p)` | 起動時に1回だけ読む設定、CLI の短い処理。**サーバのリクエストの処理の中では使わない**（第13章5.2節） |

`node:fs` には、`createReadStream` のような Stream を作る関数もあります（7節）。

### 3.2 よく使う関数

```sh
$ node samples/fs-demo.mjs
作業フォルダ: /var/folders/.../T/ch15-fs-demo
1. readFile: "# メモA\n追記した行\n"
2. flag wx で既にあるファイルに書くと: EEXIST
3. 無いファイルを読む: ENOENT
3. フォルダを readFile: EISDIR
3. 空でないフォルダを rmdir: ENOTEMPTY
4. stat: { size: 26, isFile: true, isDirectory: false, mtime: true }
5. readdir: [ '2026（フォルダ）', 'b.md（ファイル）', 'link-to-a.md（リンク）' ]
   recursive: [ 'memos', 'memos/2026', 'memos/2026/a.md', 'memos/b.md', 'memos/link-to-a.md' ]
6. b.md はまだあるか: false
7. 片付けた: 消えた
```

| やりたいこと | 関数 |
| --- | --- |
| 読む・書く・追記 | `readFile(p, 'utf8')`、`writeFile(p, data)`、`appendFile(p, data)` |
| フォルダを作る | `mkdir(p, { recursive: true })`（途中も作る。既にあってもエラーにしない） |
| 一覧 | `readdir(p, { withFileTypes: true })`（種類も分かる）、`{ recursive: true }`（下まで） |
| 情報 | `stat(p)`（リンクの先）、`lstat(p)`（リンクそのもの） |
| 消す | `rm(p, { recursive: true, force: true })`（**`rm -rf` と同じ。パスを必ず確かめる**） |
| 名前を変える・動かす | `rename(from, to)` |
| 一時フォルダを作る | `mkdtemp(path.join(os.tmpdir(), 'prefix-'))` |

`fs.rm` に `recursive: true, force: true` を付けると、確認なしにフォルダごと消えます。変数が空だったり、`path.join` の結果が思ったものと違ったりすると、大事なフォルダを消しかねません。消す前に、そのパスを `console.log` で表示して確かめる、`os.tmpdir()` の下か確かめる、といった用心をしてください。

### 3.3 エラーの code で場合分けする

fs の関数が失敗すると、`err.code` に理由が入ります。

| code | 意味 |
| --- | --- |
| `ENOENT` | そのファイル・フォルダが無い（No such file or directory） |
| `EEXIST` | 既にある |
| `EACCES`・`EPERM` | 権限が無い |
| `EISDIR`・`ENOTDIR` | フォルダなのにファイルとして、またはその逆 |
| `ENOTEMPTY` | フォルダが空でない |
| `EMFILE` | 開いているファイルが多すぎる（同時に開きすぎ。練習問題6） |

「ファイルがあるか確かめてから読む」（`fs.access` や `existsSync` の後に `readFile`）は、確かめた後、読む前に、別のプロセスが消すかもしれません（**TOCTOU**、Time Of Check to Time Of Use）。まず読んでみて、`ENOENT` なら「無かった」と扱う方が確実です（`fs-demo.mjs` の6）。「無ければ作る」も同じで、`flag: 'wx'` を使えば「確かめる」と「作る」が1回の操作になります（2）。

### 3.4 途中で落ちても壊れない書き方

`writeFile` は、まずファイルを空にしてから、中身を書いていきます。書いている途中でプロセスが落ちたら（電源が切れた、メモリが足りなくて OS に止められた、Ctrl+C）、ファイルは**途中までの、壊れた内容**になります。

```sh
$ node samples/atomic-write-demo.mjs
(1) そのまま上書き     :     65550 文字、壊れている（JSON として読めない）
(2) 一時ファイル + rename:        30 文字、元のまま（正しい JSON）、残った一時ファイル 1 個
```

**一時ファイルに全部書いてから、`rename` で置き換える**と、ファイルは「元のまま」か「新しい内容」のどちらかになり、途中の状態はありません。同じディスクの中の `rename` は、OS が一瞬で（**アトミックに**）行うからです。

```js
const tmp = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`; // 同じフォルダに
await fs.writeFile(tmp, data);
await fs.rename(tmp, file);
```

残った一時ファイル（2）の片付けや、ディスクまで確実に書き出す `fsync`、同時に更新したときの取りこぼしは、練習問題2で扱います。設定ファイルやデータの JSON を保存するとき（成果物のメモの CLI でも）は、この書き方にします。

## 4. process: 今動いているプロセス

`process` は import しなくても使えるオブジェクトです（`import process from 'node:process'` とも書けます）。

| プロパティ・関数 | 中身 |
| --- | --- |
| `process.argv` | コマンドラインの引数（`[node のパス, スクリプトのパス, ...引数]`）。第16章で詳しく |
| `process.env` | 環境変数（値はいつも文字列か `undefined`） |
| `process.cwd()` | 今のフォルダ。**スクリプトのあるフォルダとは限らない**（それは `import.meta.dirname`） |
| `process.exitCode`・`process.exit()` | 終了コード。第16章で違いを詳しく |
| `process.stdout`・`stderr`・`stdin` | 標準入出力（Stream） |
| `process.platform`・`arch` | `'darwin'`・`'arm64'`（Apple Silicon の Mac） |
| `process.memoryUsage()`・`resourceUsage()` | メモリなどの使用量 |
| `process.on('SIGINT', ...)` | シグナル（Ctrl+C など）。第16章で |

## 5. events: EventEmitter

**EventEmitter** は、「何かが起きたら、登録しておいた関数を呼ぶ」仕組みです。HTTP のサーバ（`server.on('request')`）も、Stream（`on('data')`）も、子プロセス（`on('exit')`）も、EventEmitter を継承しています。

```sh
$ node samples/events-demo.mjs
1. progress 25%
...
2. await once(emitter, "done") → { bytes: 100 }
3. emit の前
3. リスナーの中
3. emit の後
4. error のリスナーが無いと throw される: 誰も聞いていないエラー
(node:6113) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 data listeners added to [EventEmitter]. MaxListeners is 10. ...
5. 警告: MaxListenersExceededWarning
6. for await で受け取った tick 1
...
6. signal で止めた: AbortError
```

覚えておく決まりです。

- **`emit` は同期**です（3）。登録した関数を、登録した順に、その場で呼びます。重い処理をするリスナーは、`emit` した側を待たせます
- **`'error'` は特別**です（4）。`'error'` のリスナーが1つも無いときに `emit('error', err)` すると、`err` が例外として投げられ、たいていプロセスが終わります。Stream やサーバでは、`error` のリスナーを付け忘れないようにします
- **リスナーの付けすぎ**は警告されます（5）。リクエストのたびに `on` して `off` し忘れる、というメモリリークの典型を見つけるためです
- `events.once(emitter, 名前)` で、イベントを1回 **Promise** で待てます（2）。`events.on(emitter, 名前)` は、`for await` で次々に受け取れます（6）

Flask には EventEmitter にあたる仕組みはあまり出てきませんが、Blinker のシグナル（`request_started` など）が近い考え方です。

## 6. Buffer: バイト列

ファイルもネットワークも、流れてくるのは文字ではなく**バイト**です（第2部 第6章・第7章）。Node.js では、バイト列を **Buffer**（`Uint8Array` を広げたもの）で扱います。

```sh
$ node samples/buffer-demo.mjs
1. Buffer.from("Aあ😀"): 41 e3 81 82 f0 9f 98 80 （8 バイト）
   文字列の length: 4 / 文字の数: 3
   ...
3. チャンク: [ 'e3 81 93 e3', '82 93 e3 81', 'ab e3 81 a1 e3 81 af' ]
   チャンクごとに toString: こ�����ちは
4. Buffer.concat してから toString: こんにちは
5. StringDecoder: こんにちは
   TextDecoder(stream: true): こんにちは
6. a === b: false / a.equals(b): true / Buffer.compare(a, b): 0
```

- UTF-8 では、`A` は1バイト、`あ` は3バイト、`😀` は4バイトです。**文字数とバイト数は違います**（第2部 第6章の Content-Length）。`Buffer.byteLength(文字列)` でバイト数を数えます
- ストリームから届くチャンクは、**文字の途中で切れている**ことがあります（3）。チャンクごとに `toString()` すると、切れた所が `�` に化けます。全部集めて `Buffer.concat` してから変換するか（4）、途中のバイトを次まで持っておいてくれる `StringDecoder`・`TextDecoder`（`stream: true`）を使います（5、練習問題3）
- Buffer を `===` で比べると、中身ではなく「同じオブジェクトか」を比べます（6）。中身は `equals` で比べます。パスワードやトークンのような**秘密の値**を比べるときは、かかる時間から中身を推測されないよう `crypto.timingSafeEqual` を使います（第10部）

## 7. Stream: 少しずつ流す

### 7.1 なぜ Stream か

`readFile` は、ファイルを**全部メモリに読んでから**返します。1GB のログなら 1GB 以上のメモリを使い、読み終わるまで何もできません。**Stream** は、データを小さなチャンク（ファイルなら既定で 64KiB）に分けて、届いた分から順に処理します。

```sh
$ node samples/readline-demo.mjs
1,000,000 行、46 MiB のファイルを作った
readFile: 500 の行 20,000 件、1073ms、メモリの最大 220 MiB
readline: 500 の行 20,000 件、264ms、メモリの最大 64 MiB
```

| 種類 | 何をするか | 例 |
| --- | --- | --- |
| Readable | データを出す | `fs.createReadStream`、HTTP のリクエスト（サーバ側）、`process.stdin` |
| Writable | データを受け取る | `fs.createWriteStream`、HTTP のレスポンス（サーバ側）、`process.stdout` |
| Transform | 受け取って、変えて、出す | `zlib.createGzip()`、自分で作る変換 |
| Duplex | 読み書きが別々にできる | TCP のソケット |

第2部 第6章で「リクエストのボディは Stream として届く」と書いたのは、この Readable のことです。第4部 第20章で、ボディを少しずつ読んで、大きすぎたら途中で断る処理を作ります。

### 7.2 pipeline でつなぐ

```js
import { pipeline } from 'node:stream/promises';
await pipeline(fs.createReadStream(src), zlib.createGzip(), fs.createWriteStream(`${src}.gz`));
```

```sh
$ node samples/stream-demo.mjs
1. gzip: 1388890 バイト → 237141 バイト
2. Transform: 22 個のチャンク（1つ 64KiB まで）で流れた。先頭: LINE 0 OK
3. 背圧: write() が false を返した回数 5、drain の回数 5
4. for await で読んだバイト数: 1388890
5. Readable.from(ジェネレータ): [ '1\n', '2\n', '3\n' ]
6. pipeline の失敗: 途中で失敗 / 書く側は閉じられた: true
```

`pipeline` は、ストリームをつなぎ、**どこかで失敗したら、全部のストリームを閉じて reject** します（6）。古い書き方の `a.pipe(b).pipe(c)` は、途中のエラーを伝えず、ストリームも閉じないので、ファイルを開いたままにしたり、エラーを見逃したりします。新しく書くコードでは `pipeline` を使います。

### 7.3 背圧（バックプレッシャー）

読む側が速く、書く側が遅いと、書けないデータがメモリに溜まり続けます。そこで Writable の `write()` は、溜まった量が `highWaterMark` を超えると **`false` を返して**「少し待って」と伝えます。書く側が空いたら `'drain'` イベントが来るので、それまで書くのを待ちます（3）。これを**背圧**（backpressure）と呼びます。

`pipeline` や `for await` を使えば、背圧は自動で処理されます。自分で `write()` を呼ぶときだけ、戻り値を見る必要があります（`samples/atomic-write-demo.mjs` の子プロセスや、`readline-demo.mjs` のファイルの作り方）。

### 7.4 1行ずつ読む

テキストのファイルを1行ずつ処理するには、`node:readline` の `createInterface` と `for await` を使います。

```js
import { createInterface } from 'node:readline';
const rl = createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
for await (const line of rl) { /* line は改行を含まない1行 */ }
```

`crlfDelay: Infinity` は、CRLF（`\r\n`）の `\r` と `\n` が別のチャンクに分かれても、1つの改行として扱うための設定です。

## 8. そのほかの便利な API

### 8.1 util・os・crypto

```sh
$ node samples/util-demo.mjs
```

| 関数 | 何をするか |
| --- | --- |
| `util.inspect(obj, { depth })` | `console.log` が使っている、オブジェクトを文字列にする関数。深い所も見たいときに |
| `util.styleText('red', 文字列)` | 端末の文字に色を付ける。出力先が端末でないとき（ファイルにリダイレクトしたときなど）は色を付けない（第16章） |
| `util.parseArgs` | コマンドラインの引数を解析する（第16章） |
| `util.promisify` | コールバックの関数を Promise にする（第12章） |
| `os.homedir()`・`os.tmpdir()`・`os.EOL` | ホーム、一時フォルダ、改行の文字 |
| `os.availableParallelism()` | 使える CPU の数（第13章） |
| `crypto.randomUUID()`・`randomBytes(n)` | 推測されない ID や乱数。**`Math.random()` は推測できるので、ID やトークンに使わない** |
| `crypto.createHash('sha256')` | ハッシュ（ファイルの指紋など。**パスワードの保存には使わない**。第10部） |

### 8.2 child_process: 別のプログラムを動かす

```sh
$ node samples/child-demo.mjs      # Mac での出力の例（1と2は OS によって変わる）
1. execFile("ls", ["-1", "/"]) の最初の3行: [ 'Applications', 'Library', 'System' ]
2. 失敗したとき: code = 1 / stderr = ls: /no/such/dir: No such file or directory
3. exec（シェルを通す）: [ '!!! ファイル名に書かれたコマンドが実行された !!!' ]
4. execFile（シェルを通さない）: 2 report.txt; echo "!!! ファイル名に書かれたコマンドが実行された !!!"
5. spawn の出力: tick 1
...
6. timeout で止めた: killed = true / signal = SIGTERM
```

| 関数 | シェル | 出力 | 使う場面 |
| --- | --- | --- | --- |
| `execFile(プログラム, [引数...])` | 通さない | 終わってからまとめて | **ふつうはこれ** |
| `spawn(プログラム, [引数...])` | 通さない | Stream で少しずつ | 出力が大きい、長く動く |
| `exec('コマンドの文字列')` | **通す**（`/bin/sh -c`） | 終わってからまとめて | パイプなどシェルの機能が本当に必要なときだけ |

3と4の違いが大事です。`exec` は文字列をシェルに渡すので、ファイル名に `;` や `$(...)` が含まれていると、**それがコマンドとして実行されます**（**コマンドインジェクション**）。`execFile` は、引数を配列のまま OS に渡すので、ファイル名はただの1つの引数です。この教材でコマンドを動かすときに `execFile` を使うのはこのためで、第10部 第55章でもう一度扱います。

Python の `subprocess.run(['ls', '-1'])`（リスト）と `subprocess.run('ls -1', shell=True)` の違いと同じです。

## 9. Python との対応

| やりたいこと | Python | Node.js |
| --- | --- | --- |
| パスをつなぐ | `os.path.join`、`pathlib.Path / 'a'` | `path.join` |
| 絶対パス | `os.path.abspath`、`Path.resolve()` | `path.resolve` |
| ファイルを読む | `open(p, encoding='utf-8').read()`、`Path.read_text()` | `await fs.readFile(p, 'utf8')` |
| フォルダを作る | `os.makedirs(p, exist_ok=True)` | `await fs.mkdir(p, { recursive: true })` |
| 一覧 | `os.listdir`、`os.scandir`、`Path.iterdir()` | `fs.readdir(p, { withFileTypes: true })` |
| 消す | `shutil.rmtree` | `fs.rm(p, { recursive: true })` |
| 置き換え | `os.replace` | `fs.rename` |
| 1行ずつ読む | `for line in open(p):` | `for await (const line of createInterface(...))` |
| バイト列 | `bytes`、`bytearray` | `Buffer` |
| 圧縮 | `gzip` | `zlib` |
| 別のプログラム | `subprocess.run([...])` | `execFile`、`spawn` |
| 環境変数 | `os.environ` | `process.env` |
| 乱数・UUID | `secrets`、`uuid.uuid4()` | `crypto.randomBytes`、`crypto.randomUUID()` |

## まとめ

- パスは `path.join`・`path.resolve` で組み立てる。どちらも `..` で外に出ることは止めない。`~` は使えない（`os.homedir()`）。
- ファイルは `fs/promises` で扱い、失敗は `err.code`（`ENOENT` など）で場合分けする。確かめてから使うより、使ってみてエラーを受け取る。
- 大事なファイルは、一時ファイルに書いてから `rename` で置き換える。途中で落ちても壊れない。
- EventEmitter の `emit` は同期。`error` のリスナーが無いと例外になる。付けすぎは警告される。
- バイト数と文字数は違う。チャンクの境目で文字が切れるので、`Buffer.concat` か `TextDecoder`（`stream: true`）を使う。
- 大きなデータは Stream で少しずつ流す。つなぐのは `pipeline`。書く側が遅いときの背圧も `pipeline` が処理する。
- 別のプログラムは `execFile`・`spawn` で動かす。`exec` はシェルを通すので、利用者の入力を入れるとコマンドインジェクションになる。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js「API ドキュメント」（全体の目次）: https://nodejs.org/api/
- Node.js「Path」: https://nodejs.org/api/path.html
- Node.js「File system」: https://nodejs.org/api/fs.html
- Node.js「Events」: https://nodejs.org/api/events.html
- Node.js「Buffer」: https://nodejs.org/api/buffer.html
- Node.js「Stream」: https://nodejs.org/api/stream.html
- Node.js「Backpressuring in Streams」: https://nodejs.org/en/learn/modules/backpressuring-in-streams
- Node.js「Readline」: https://nodejs.org/api/readline.html
- Node.js「Child process」: https://nodejs.org/api/child_process.html
- MDN「TextDecoder」: https://developer.mozilla.org/ja/docs/Web/API/TextDecoder
- rename(2) のマニュアル（Mac のターミナルで `man 2 rename`）

前の章: [第14章 モジュールとパッケージ管理](../ch14-modules-npm/README.md) ／ 次の章: [第16章 CLI ツールを作る](../ch16-cli/README.md)
