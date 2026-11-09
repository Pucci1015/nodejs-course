# 第15章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- |
| 1 | path と Buffer の結果を予想する | [predict.mjs](predict.mjs) | 2, 6 |
| 2 | 途中で落ちても壊れない書き込みと、取りこぼさない更新 | [atomic.mjs](atomic.mjs)、[atomic.test.mjs](atomic.test.mjs) | 3.4 |
| 3 | バイトのチャンクを1行ずつにする Transform | [lines.mjs](lines.mjs)、[lines.test.mjs](lines.test.mjs) | 6, 7 |
| 4 | 大きなログ（.gz も）を少しずつ集計する | [log-stream.mjs](log-stream.mjs)、[log-stream.test.mjs](log-stream.test.mjs) | 7 |
| 5 | EventEmitter で進み具合を知らせる仕事の列 | [job-queue.mjs](job-queue.mjs)、[job-queue.test.mjs](job-queue.test.mjs) | 5 |
| 6 | フォルダの大きさを数える（du の小さな版） | [dir-size.mjs](dir-size.mjs)、[dir-size.test.mjs](dir-size.test.mjs) | 3 |

問題2〜6 は、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。テスト用のファイルは OS の一時フォルダに作り、最後に消します。

---

## 問題1 path と Buffer の結果を予想する

[predict.mjs](predict.mjs) には15個の式があります。**実行する前に**結果を予想して書き出してから、`node predict.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 2番と3番: `path.join` と `path.resolve` で結果が違うのはなぜか
- 4番と9番: 利用者が送ってきた名前（`../../../../etc/passwd`）を `path.join(公開するフォルダ, 名前)` に渡すと何が起きるか。`path.relative` の結果から、「公開するフォルダの外を指している」ことにどう気付けるか（本格的な対策は第4部 第19章）
- 12番と13番: 見た目が同じ `é` なのに、バイト数が違うのはなぜか（ヒント: `normalize('NFD')`。Mac のファイル名で起きることがある）

## 問題2 途中で落ちても壊れない書き込みと、取りこぼさない更新

[atomic.mjs](atomic.mjs) に、2つの関数を作ってください。成果物のメモの CLI で、設定やデータを保存するのに使える部品です。

**`writeFileAtomic(file, data, { fsync = true })`**

- 同じフォルダに一時ファイルを作って `data` を書き、`fs.rename` で `file` に置き換える（`samples/atomic-write-demo.mjs`）
- 一時ファイルの名前は、同時に書いてもぶつからないようにする
- 書いている途中で失敗したら、一時ファイルを消してから、元のエラーで rejected になる。`file` は元のまま
- `fsync` が `true` なら、`rename` の前に、一時ファイルの内容をディスクまで書き出す（`FileHandle` の `sync()`）
- フォルダが無ければ、作らずに `ENOENT` で rejected

**`updateJson(file, updater, { defaultValue = {} })`**

- `file` の JSON を読み、`updater(今の値)` の結果を、`writeFileAtomic` で書き戻す。新しい値を返す
- ファイルが無ければ `defaultValue`（のコピー）から始める。壊れた JSON なら、上書きせずに rejected
- `updater` は async でもよい。`updater` が失敗したら、ファイルは変えずに rejected
- **同じプロセスの中で同時に呼ばれても、更新を取りこぼさない**（50回同時に +1 したら、50 になる）

```sh
$ node --test atomic.test.mjs
ℹ pass 9
ℹ fail 0
```

ヒント: 「読む → 変える → 書く」の間に `await` があるので、2つの `updateJson` が同時に動くと、どちらも同じ古い値を読み、片方の更新が消えます（第2部 第10章の練習問題8、第12章の練習問題5と同じ問題）。同じファイルへの更新を、1つずつ順番に動かす仕組みを考えてください。

考えてみよう:

1. 一時ファイルを、`os.tmpdir()` ではなく、書き込み先と**同じフォルダ**に作るのはなぜか（`man 2 rename` の `EXDEV`）
2. 別の**プロセス**（同じ CLI を2つのターミナルで同時に実行した、など）が同じファイルを更新するときは、`updateJson` の順番待ちでは守れない。なぜか。どうすれば守れるか
3. プロセスが落ちて、一時ファイルが残ってしまったときは、どう片付けるとよいか

## 問題3 バイトのチャンクを1行ずつにする Transform

`node:readline` を使わずに、バイトのチャンクを受け取って、1行ずつの文字列を出す Transform を [lines.mjs](lines.mjs) に作ってください。第4部で、HTTP のリクエストを自分で読むときに、同じ考え方を使います。

- 書く側はバイト（Buffer）、読む側は「1行 = 1つの文字列」（`readableObjectMode: true`）。改行の文字は含めない
- 行がチャンクをまたいでも、UTF-8 の文字がチャンクの途中で切れても、正しく1行にする
- `\r\n` の改行も扱い、`\r` を残さない
- 最後の行が改行で終わっていなくても、1行として出す
- 1行が `maxLineLength` 文字を超えたら `RangeError` にする。**改行がいつまでも来なくても**、溜まった時点で気付く
- UTF-8 として正しくないバイトがあれば、エラーにする

```sh
$ node --test lines.test.mjs
ℹ pass 9
ℹ fail 0
```

ヒント: Transform の `transform(chunk, encoding, callback)` と `flush(callback)`。`TextDecoder` の `fatal` と `stream` のオプション。

考えてみよう: `maxLineLength` が無いと、改行を送らずにデータを送り続ける相手に対して、何が起きるでしょうか。

## 問題4 大きなログ（.gz も）を少しずつ集計する

第11章の練習問題4では、ログを `readFileSync` で全部読み、配列のメソッドで集計しました。ログが何 GB にもなると、この方法ではメモリが足りません。また、古いログは `access.log.1.gz` のように gzip で圧縮されているのが普通です。

[log-stream.mjs](log-stream.mjs) に、ファイルを少しずつ読みながら集計する `summarizeLogFile(file, { top })` を作ってください。1行の解析には、第11章の模範解答の `parseLine` を使います（import してあります）。

- ファイルの名前が `.gz` で終わっていたら、展開しながら読む
- 返す値: `total`（解析できた行の数）、`invalid`（解析できなかった行の数。空の行は数えない）、`byStatusClass`、`bytesTotal`、`topPaths`（多い順に `top` 個。同じ数なら path の順）、`first`・`last`（一番古い・新しい時刻。無ければ `null`）
- CRLF の行も読める
- 無いファイルなら `ENOENT`（`.gz` でも）、壊れた `.gz` なら rejected

```sh
$ node --test log-stream.test.mjs
ℹ pass 7
ℹ fail 0
```

できたら、第11章の模範解答の `summarize` を、15万行のログで使ってみてください。何が起きるでしょうか。それはなぜでしょうか（ヒント: `Math.min(...times)`）。

## 問題5 EventEmitter で進み具合を知らせる仕事の列

EventEmitter を継承して、仕事（Promise を返す関数）を同時に `concurrency` 個まで動かし、進み具合をイベントで知らせる `JobQueue` を [job-queue.mjs](job-queue.mjs) に作ってください。

- `add(fn, { name })`: 仕事を足し、その結果で fulfilled（失敗なら rejected）になる Promise を返す。`fn` が関数でなければ `TypeError`
- イベント: 始めたら `start`（`{ id, name }`）、成功したら `done`（`{ id, name, result, ms }`）、失敗したら `failed`（`{ id, name, error }`）、全部終わったら `idle`。`id` は 1 から順に振る
- `size`（まだ始めていない数）、`running`（動いている数）
- `pause()` の間は新しい仕事を始めない。`resume()` で再開する
- `onIdle()`: 全部終わるまで待つ。何も無ければすぐに終わる
- `add` した直後に `on('start', ...)` を付けても、その仕事の `start` を聞き逃さない
- `concurrency` が1以上の整数でなければ `RangeError`

```sh
$ node --test job-queue.test.mjs
ℹ pass 10
ℹ fail 0
```

考えてみよう:

1. 仕事の失敗を、`'failed'` ではなく `'error'` で知らせると、どんな問題が起きるか（本文5節）
2. `add` が返す Promise を、使う人が `await` も `catch` もしなかったら、仕事が失敗したときに何が起きるか（第12章5節）。それを防ぐ設計はあるか

## 問題6 フォルダの大きさを数える（du の小さな版）

`~/dev` の中で、どのプロジェクトの `node_modules` が大きいのかを知りたくなることがあります。フォルダの中のファイルの大きさを合計する `dirSize(root, { concurrency })` と、大きさを読みやすくする `formatBytes(bytes)` を、[dir-size.mjs](dir-size.mjs) に作ってください。

- 返す値: `bytes`（ファイルの大きさの合計）、`files`、`dirs`（`root` 自身を含む）、`symlinks`、`errors`（読めなかったものの `{ path, code }`）
- シンボリックリンクは**たどらない**（数だけ数える）。輪になったリンクがあっても終わる
- 読めないフォルダ（`EACCES`）があっても止まらず、`errors` に記録して続ける
- 同時に開くファイル・フォルダの数を `concurrency` 個までに抑える（でも、1つずつではなく並行に処理する）
- `root` が無ければ `ENOENT`、フォルダでなければ `ENOTDIR` で rejected
- `formatBytes`: `0 B`、`1023 B`、`1.5 KiB`、`5.0 MiB` のように、1024 で割って単位を付ける

```sh
$ node --test dir-size.test.mjs
ℹ pass 6
ℹ fail 0
$ node dir-size.mjs ~/dev
```

「読めないフォルダ」のテストは、root ユーザーで実行すると（権限を無視して読めてしまうので）飛ばされます。普通に Mac で実行すれば、6個とも実行されます。

ヒント: `fs.readdir(dir, { withFileTypes: true })` の `isSymbolicLink()`・`isDirectory()`、`fs.lstat`。同時に動かす数の制限は、第12章の `mapLimit` の考え方を、「1回の呼び出し」ごとに使える形にします。

考えてみよう: `concurrency` を 10000 にして、ファイルが何十万もあるフォルダを数えると、何が起きるでしょうか（本文3.3節の `EMFILE`、第13章4節のスレッドプール）。
