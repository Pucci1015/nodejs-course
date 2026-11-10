# 第13章 イベントループ

第12章で「Node.js は待っている間に他のことをする」と書きました。では、JavaScript を実行するスレッドは1つしかないのに、どうやって「他のこと」をしているのでしょうか。その仕組みが**イベントループ**です。
この章では、`then` のコールバックやタイマーがどの順番で呼ばれるのか、裏で誰がファイルを読んでいるのか、そして「サーバ全体が止まる」のはどういうときか、を実験しながら確かめます。Node.js のサーバを書く人が、いちばん知っておくべき仕組みです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第12章（Promise、async/await、AbortSignal） |
| この章のゴール | コールスタック・タスク・マイクロタスクの関係を説明できる / Node.js のイベントループのフェーズと、`nextTick`・`setImmediate` の位置を説明できる / libuv のスレッドプールが何をしているか説明できる / イベントループを止めるコードを見つけ、分割・Worker で直せる / イベントループの遅れを測れる / プロセスがいつ終わるかを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形と、キューの順番・フェーズ・スレッドプール・Worker・遅れの測定・プロセスの終わり方をまとめて確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part03/ch13-event-loop/` で実行します（第11章で第3部のフォルダを `~/dev/part03` にコピーしてあります）。
>
>   ```sh
>   $ cd ~/dev/part03/ch13-event-loop
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 時間の表示は、この教材の作成時に Node.js 26（4コアの Linux）で実行したものです。Apple Silicon の Mac では、計算はもっと速く、コアの数も多いので、数字は変わります。**大事なのは数字そのものではなく、どれが先に終わるか、どれが待たされるか**です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 処理は最後まで実行され、割り込まれない（1節） | 第4部・第5部で「1つのリクエストの重い処理が、全員を待たせる」のを避けるとき |
| マイクロタスクとタスク（2〜3節） | 第15章の Stream や EventEmitter の順番、第8部の React で「画面がいつ更新されるか」を考えるとき |
| スレッドプール（4節） | 第10部でパスワードのハッシュ（`scrypt`）を使うとき |
| Worker と小分け（6節） | 重い集計や画像の処理をサーバに入れるとき（第12部のジョブのキュー） |
| イベントループの遅れ（7節） | 第12部 第64章・第66章の監視と性能の計測 |
| プロセスが終わる条件と `unref`（8節） | 第16章の CLI、第11部のテストが終わらないとき、第12部の正しい止め方 |

---

## 1. スレッドは1つ、処理は最後まで

### 1.1 コールスタック

関数を呼ぶと、その関数は**コールスタック**（呼び出しの積み重ね）に積まれ、`return` すると取り除かれます。JavaScript のスレッドは、コールスタックが空になるまで、今の処理を**最後まで**実行します。途中で別の処理が割り込むことはありません（run-to-completion）。

**手を動かす**: `blocking-loop.mjs` を作り、次のように書いて実行します（完成形は [samples/blocking-loop.mjs](samples/blocking-loop.mjs)）。10ms 後に呼ぶタイマーを予約してから、500ms かかる計算をします。`padStart(4)` は、文字列の左を空白で埋めて4文字にするメソッドです（表示をそろえるため）。

```js
const start = Date.now();
const t = () => `${String(Date.now() - start).padStart(4)}ms`;

setTimeout(() => console.log(t(), 'タイマーが呼ばれた（10ms 後のはず）'), 10);

console.log(t(), '500ms かかる計算を始める');
let count = 0;
while (Date.now() - start < 500) {
  count++;
}
console.log(t(), `計算が終わった（${count} 回まわった）`);
```

```sh
$ node blocking-loop.mjs
   0ms 500ms かかる計算を始める
 500ms 計算が終わった（11020100 回まわった）
 500ms タイマーが呼ばれた（10ms 後のはず）
```

`while` の行は、「500ms たつまで `count++` を繰り返す」という意味です（CPU を使い続ける、重い計算の代わり）。タイマーは 10ms で時間が来ていたのに、計算が終わるまで呼ばれませんでした。

同じことを、コールスタックの深さも含めて確かめるサンプルです（中身は読まなくてよい）。

```sh
$ node samples/stack-demo.mjs
   0ms 10ms 後に呼ぶタイマーを予約する
   2ms 500ms かかる計算を始める
 500ms 計算が終わった（8,964,723 回まわった）
 520ms コールスタックには、およそ 9,636 段まで積める
 521ms 同期のコードが終わった。ここからタイマーの番
 522ms タイマーが呼ばれた（10ms のはずが…）
```

10ms 後に呼ぶはずのタイマーが、522ms 後に呼ばれました。`setTimeout(fn, 10)` は「10ms 後に必ず呼ぶ」ではなく、「**早くても** 10ms 後、スレッドが空いたら呼ぶ」という意味です。

コールスタックの深さには上限があり、再帰が深すぎると `RangeError: Maximum call stack size exceeded` になります（上限は環境によって変わります）。

### 1.2 では、待っている間は誰が？

スレッドが1つなのに、ファイルを読んでいる間に別のリクエストを処理できるのは、**待つこと自体は JavaScript のスレッドがしていない**からです。

```
┌──────────────── Node.js のプロセス ────────────────┐
│                                                      │
│  JavaScript のスレッド（1つ）                         │
│   ┌──────────┐      ┌────────────────────┐          │
│   │コールスタック│ ←── │ イベントループ        │          │
│   └──────────┘      │ 「次に実行するもの」を │          │
│                     │  キューから取り出す    │          │
│                     └────────▲───────────┘          │
│                              │ 終わったら知らせる      │
│   libuv ─────────────────────┴──────────────        │
│   ├ OS の仕組み（Mac は kqueue、Linux は epoll）       │
│   │   ネットワークのソケットを、まとめて見張る         │
│   └ スレッドプール（既定で4本）                        │
│       ファイル、DNS の名前解決、重い crypto、zlib      │
└──────────────────────────────────────────────────────┘
```

- **libuv**（エルユーブイ）は、Node.js の中にある C のライブラリです。OS に「このソケットにデータが来たら教えて」と頼んだり、裏のスレッドでファイルを読んだりします
- 終わったら、libuv がイベントループに「このコールバックを呼んで」と知らせます
- JavaScript のスレッドは、コールスタックが空になるたびに、イベントループから次の仕事を受け取ります

つまり、Node.js は「JavaScript を実行するのは1つのスレッド、**待つのは OS とスレッドプール**」という分業をしています。

## 2. タスクとマイクロタスク

### 2.1 2種類の待ち行列

「次に実行するもの」の待ち行列には、大きく2種類あります。

| 待ち行列 | 入るもの | いつ実行されるか |
| --- | --- | --- |
| **マイクロタスク** | `Promise` の `then`・`catch`・`finally`、`await` の続き、`queueMicrotask` | 今の処理が終わった**直後**。空になるまで全部 |
| **タスク**（マクロタスク） | タイマー（`setTimeout`・`setInterval`）、I/O のコールバック、`setImmediate` | マイクロタスクが空になった後、1つずつ |

**手を動かす**: `order-basic.mjs` を作り、次の5行を書きます（完成形は [samples/order-basic.mjs](samples/order-basic.mjs)）。`queueMicrotask(関数)` は、関数をマイクロタスクの待ち行列に入れる関数です。**実行する前に**、A〜E がどの順番で表示されるかを予想してから、実行してください。

```js
console.log('A 同期');
setTimeout(() => console.log('B setTimeout 0'), 0);
Promise.resolve().then(() => console.log('C then'));
queueMicrotask(() => console.log('D queueMicrotask'));
console.log('E 同期');
```

```sh
$ node order-basic.mjs
A 同期
E 同期
C then
D queueMicrotask
B setTimeout 0
```

同期のコード（A・E）→ マイクロタスク（C・D）→ タスク（B）の順です。`setTimeout` の時間が 0 でも、マイクロタスクより後になります。

もう少し多くの種類を並べたサンプルです（中身は読まなくてよい）。

```sh
$ node samples/queues-demo.mjs
同期のコード 1
同期のコード 2
Promise.then
queueMicrotask
then の中の then
process.nextTick
setTimeout 0
setImmediate
```

- 同期のコードが全部終わってから、マイクロタスクが実行されます
- マイクロタスクの中で足したマイクロタスク（`then の中の then`）も、タイマーより先に実行されます。**マイクロタスクは、空になるまで続けて実行される**からです
- `process.nextTick` は Node.js だけにある仕組みで、3.3節で説明します

### 2.2 マイクロタスクでは「譲った」ことにならない

マイクロタスクが空になるまでタスクに進まない、ということは、マイクロタスクを足し続けると、**タイマーも I/O も永遠に実行されない**ということです。

```js
// してはいけない: タイマーも、届いたリクエストも、ずっと処理されない
function loop() {
  Promise.resolve().then(loop);
}
loop();
```

重い処理の途中で「他の処理に順番を譲りたい」とき、`await Promise.resolve()` では譲れません。タスクの待ち行列に入る `setImmediate` を使います（6.2節、練習問題1・5）。

ブラウザも、同じ「タスクとマイクロタスク」の仕組みで動いています。ブラウザでは、タスクとタスクの間に**画面の描画**が入ります。重い処理で画面が固まるのは、描画の順番が来ないからです。

## 3. Node.js のイベントループのフェーズ

### 3.1 6つのフェーズ

Node.js のイベントループは、タスクの種類ごとにフェーズ（段階）を分けて、次の順にぐるぐる回ります。

```
   ┌───────────────────────────┐
┌─>│ timers                    │ 時間が来た setTimeout・setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │ pending callbacks         │ 前の周に回された、一部の I/O のエラーなど
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │ idle, prepare             │ （内部で使う）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │ poll                      │ I/O の完了を受け取り、コールバックを呼ぶ。
│  │                           │ 何も無ければ、ここで I/O を待つ
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │ check                     │ setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤ close callbacks           │ socket.on('close') など
   └───────────────────────────┘

   どのフェーズでも、コールバックを1つ実行するたびに
   process.nextTick の待ち行列 → マイクロタスク を空にする
```

覚えておくべきことは3つです。

1. **poll** で I/O（ファイル、ネットワーク）の完了を受け取る。やることが無ければ、ここで眠って待つ（CPU を使わない）
2. **check** は poll の直後。だから `setImmediate` は「今の I/O の処理が終わったらすぐ」に呼ばれる
3. コールバックを1つ実行するたびに、**nextTick とマイクロタスクを空にしてから**次へ進む

### 3.2 setTimeout(0) と setImmediate

次のサンプルを、何度か実行してみてください（中身は読まなくてよい）。

```sh
$ node samples/phases-demo.mjs     # 何度か実行してみる
(1) timeout (1) immediate (2) immediate (2) timeout
(1) immediate (1) timeout (2) immediate (2) timeout
```

- **(1) メインのコードから呼んだとき**: どちらが先かは**決まっていません**。`setTimeout(fn, 0)` は実際には 1ms のタイマーです。イベントループが timers のフェーズに来たときに 1ms たっていれば timeout が先、たっていなければ immediate が先です
- **(2) I/O のコールバックの中から呼んだとき**: いつも **immediate が先**です。今は poll のフェーズにいるので、次は check（immediate）、その次の周で timers です

「すぐ後で実行したい」なら、`setTimeout(fn, 0)` より `setImmediate(fn)` の方が意図がはっきりします。

### 3.3 process.nextTick

`process.nextTick(fn)` は、名前に反して「次の周（tick）」ではなく、「**今のコールバックが終わった直後、マイクロタスクよりも先**」に `fn` を呼びます。Promise が Node.js に入る前からある仕組みで、Node.js の内部やライブラリでよく使われています。

ただし、ES モジュール（`.mjs`）の**一番外側**のコードでは、順番が逆になります。

```sh
$ node samples/queues-demo.mjs   # ES モジュール
...
Promise.then
queueMicrotask
then の中の then
process.nextTick         ← マイクロタスクの後

$ node samples/queues-demo.cjs   # CommonJS（第14章）
...
process.nextTick         ← マイクロタスクの前
Promise.then
queueMicrotask
then の中の then
```

ES モジュールの一番外側のコードは、それ自体が Promise の仕組み（マイクロタスク）の中で実行されているため、「今の処理が終わった直後」に、まずマイクロタスクの待ち行列が処理されるからです。タイマーや I/O のコールバックの中では、ES モジュールでも nextTick が先です（練習問題4）。

このように順番が場面で変わるので、**自分のコードでは `process.nextTick` より `queueMicrotask` を使う**のがおすすめです（Node.js のドキュメントも同じことを勧めています）。

## 4. libuv のスレッドプール

### 4.1 何が裏のスレッドで動くか

| 種類 | 例 | 誰が待つか |
| --- | --- | --- |
| ネットワーク | `http`、`fetch`、`net`、データベースへの接続 | **OS**（kqueue・epoll）。スレッドプールは使わない |
| ファイル | `fs.readFile`、`fs/promises` のほぼすべて | スレッドプール |
| DNS の名前解決 | `dns.lookup`（`fetch` や `http.get` が内部で使う） | スレッドプール |
| 重い crypto | `crypto.pbkdf2`、`scrypt`、`randomBytes`（非同期版） | スレッドプール |
| 圧縮 | `zlib` の非同期版 | スレッドプール |

ネットワークの待ちは、何千本あっても OS がまとめて見張れます。ファイルの読み書きは、OS によってはそういう仕組みが無い（あっても使いにくい）ため、libuv が自分のスレッドで、普通の（同期の）読み書きをして待っています。

### 4.2 スレッドプールの大きさ

スレッドプールは、既定で **4本**です。環境変数 `UV_THREADPOOL_SIZE` で変えられます（最大 1024）。

次のサンプルは、時間のかかるハッシュの計算（`crypto.pbkdf2`、第10部で使うパスワードのハッシュの一種）を8回同時に頼みます（中身は読まなくてよい）。

```sh
$ node samples/threadpool-demo.mjs
CPU のコア数: 4、UV_THREADPOOL_SIZE: （未設定 = 4）
pbkdf2 を 8 回、非同期で同時に実行します
    1ms 8 個を頼み終わった（まだ1つも終わっていない）
  153ms 1 番目が終わった
  191ms 2 番目が終わった
  196ms 4 番目が終わった
  255ms 3 番目が終わった
  299ms 5 番目が終わった
  334ms 6 番目が終わった
  363ms 7 番目が終わった
  400ms 8 番目が終わった
  400ms すべて終わった。50ms ごとのタイマーは 7 回動いた（空いていれば約 7 回）

$ UV_THREADPOOL_SIZE=2 node samples/threadpool-demo.mjs | tail -1      # 環境変数を付けて実行し、最後の1行だけ表示
  586ms すべて終わった。50ms ごとのタイマーは 11 回動いた（空いていれば約 11 回）

$ node samples/threadpool-demo.mjs sync | tail -1
 1236ms すべて終わった。50ms ごとのタイマーは 0 回動いた（空いていれば約 24 回）
```

- 8個を頼んでも、同時に動くのは4個まで。残りは、スレッドが空くのを待ちます
- 非同期版の間は、メインのスレッドが空いているので、タイマーが予定どおり動きます
- 同期版（`pbkdf2Sync`）は、メインのスレッドで1つずつ計算するので、その間タイマーは**1回も**動きません

スレッドプールの大きさは、プロセスの起動時（最初にスレッドプールを使う前）に決まります。プログラムの途中で `process.env.UV_THREADPOOL_SIZE` を変えても、効かないことがあります。起動するときに環境変数で渡してください。

### 4.3 スレッドプールが埋まると

スレッドプールは、ファイル・DNS・crypto で**共有**です。重い crypto でスレッドが全部埋まると、関係の無いファイルの読み込みや名前解決まで待たされます。練習問題7で、実際に確かめます。

## 5. イベントループを止める

### 5.1 1つの重いリクエストが、全員を待たせる

**手を動かす**: `block-server.mjs` を作り、次のように書きます（完成形は [samples/block-server.mjs](samples/block-server.mjs)）。`/slow` は3秒**計算する**、`/wait` は3秒**待つ**だけ、それ以外はすぐに返すサーバです。

```js
import http from 'node:http';

function busy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // 何もしないで回り続ける（重い計算の代わり）
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/slow') {
    busy(3000);
    res.end('slow: 3秒計算した\n');
    return;
  }
  if (req.url === '/wait') {
    setTimeout(() => res.end('wait: 3秒待った\n'), 3000);
    return;
  }
  res.end('fast\n');
});

server.listen(9133, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9133/ で待っています（Ctrl+C で止める）');
});
```

ターミナルを2つ使います。ターミナル1でサーバを起動し、ターミナル2で `/slow` を送った直後に `/fast` を送ります。

```sh
# ターミナル1（~/dev/part03/ch13-event-loop で）
$ node block-server.mjs

# ターミナル2
$ curl -s http://127.0.0.1:9133/slow &
$ curl -s -w '%{time_total}秒\n' http://127.0.0.1:9133/fast
fast
2.804790秒
slow: 3秒計算した
```

- コマンドの最後の `&` は、「そのコマンドを裏で動かし、終わるのを待たずに次のコマンドを打てるようにする」という意味です。`[1] 12345` や `[1]  + done ...` のような行も表示されますが、裏で動かしたコマンドの番号と、それが終わったという知らせです。
- `-w '%{time_total}秒\n'` は、curl が「全体でかかった時間」を最後に表示するオプションです（第2部 第7章）。

`/fast` はすぐに返すはずなのに、約3秒待たされました。`/slow` の計算が終わるまで、サーバのスレッドが空かないからです。次に `/slow` を `/wait` に変えて、同じことをしてみてください。

```sh
$ curl -s http://127.0.0.1:9133/wait &
$ curl -s -w '%{time_total}秒\n' http://127.0.0.1:9133/fast
fast
0.001042秒
```

今度は `/fast` がすぐに返りました。`/wait` は**待っている**だけで、その間スレッドは空いているからです。

- **待つ**処理（タイマー、ファイル、ネットワーク）は、他のリクエストを待たせない
- **計算する**処理（CPU を使い続ける）は、その間、他のすべてのリクエストを待たせる

終わったら、ターミナル1で Ctrl+C を押してサーバを止めます。同じことを1つのプログラムで確かめるサンプルもあります（`node samples/blocking-demo.mjs`。中身は読まなくてよい）。

Flask を開発用サーバ（スレッドあり）や gunicorn のワーカーを複数立てて動かしていれば、1つのリクエストが重くても、別のスレッドやプロセスが他のリクエストに応えます。Node.js は1つのスレッドで全員に応えるので、**1つのリクエストの重い計算が、全員の待ち時間になります**。

### 5.2 イベントループを止めるもの

| 種類 | 例 | 直し方 |
| --- | --- | --- |
| 重い計算 | 画像の処理、大量のデータの集計、素数を数える | Worker（6.1節）、小分け（6.2節）、別のサービスに任せる |
| 同期の I/O | リクエストの処理の中で `fs.readFileSync`、`execSync` | 非同期版を使う。起動時に1回だけ読む設定ファイルなら同期でもよい |
| 大きすぎるデータ | 100MB の `JSON.parse`・`JSON.stringify`、巨大な配列の `sort` | 大きさを制限する、ストリームで少しずつ処理する（第15章） |
| 同期の crypto | `pbkdf2Sync`、`scryptSync`、`bcrypt` の同期版 | 非同期版を使う |
| 正規表現 | ある入力でバックトラックが爆発する正規表現（ReDoS） | 正規表現を直す、入力の長さを制限する（練習問題6） |
| 終わらないループ | `while (!done) {}` で何かを待つ | ループで待たず、イベントやタイマーを使う |

特に気を付けたいのは、**利用者が送ってきたデータの大きさや中身によって、処理時間が大きく変わる**ものです。悪意のある人が、わざと重くなるデータを送ってサーバを止める攻撃（DoS、サービス妨害）に使われます。

## 6. 止めないための方法

### 6.1 worker_threads: 別のスレッドで計算する

`node:worker_threads` を使うと、**別のスレッドで、別の JavaScript の実行環境**を動かせます。メインのスレッドとは、メッセージで値をやり取りします。

```js
// 呼ぶ側
import { Worker } from 'node:worker_threads';

const worker = new Worker(new URL('./primes-worker.mjs', import.meta.url), { workerData: { from: 1, to: 3_000_000 } });
worker.once('message', (count) => console.log(count));
worker.once('error', (err) => console.error(err));
```

```js
// primes-worker.mjs（Worker の中）
import { parentPort, workerData } from 'node:worker_threads';
import { countPrimes } from './primes.mjs';

parentPort.postMessage(countPrimes(workerData.from, workerData.to));
```

`new URL('./primes-worker.mjs', import.meta.url)` は、「このファイルと同じフォルダの `primes-worker.mjs`」という意味です。Worker を使った完成形が、次のサンプルです（中身は読まなくてよい。練習問題2で、同じ形の関数を自分で書きます）。

```sh
$ node samples/worker-demo.mjs
メインのスレッドで計算: 結果 216,816、676ms、その間にタイマーは 0 回動いた（空いていれば約 67 回）
Worker で計算        : 結果 216,816、706ms、その間にタイマーは 67 回動いた（空いていれば約 70 回）
Worker 4つで分けて計算: 結果 216,816、278ms、その間にタイマーは 27 回動いた（空いていれば約 27 回）
```

- Worker で計算しても、計算そのものは速くなりません。速くなるのは、**メインのスレッドが空いている**ことです
- 範囲を分けて複数の Worker で同時に計算すれば、CPU のコアの数まで速くなります
- Worker を起動するには数十 ms と、数 MB のメモリがかかります。リクエストのたびに起動せず、**起動しておいた Worker を使い回す**（Worker プール）のが一般的です。`piscina` などのパッケージ（第14章）があります
- Worker とメインのスレッドは、変数を共有しません。`postMessage` で送った値は**コピー**されます（第11章の `structuredClone` と同じ仕組み）

Python では、GIL（グローバルインタプリタロック）のため、スレッドで CPU の計算を並列にしても速くならず、`multiprocessing` でプロセスを分けるのが定番でした（Python 3.13 からは GIL を外したビルドも選べます）。Node.js の Worker は、それぞれが独立した実行環境なので、スレッドでも並列に計算できます。

### 6.2 小分けにして、合間に譲る

計算を細かく分けて、合間に `setImmediate` でイベントループに順番を譲る方法もあります。

```js
const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

for (let i = 0; i < items.length; i++) {
  process(items[i]);
  if (i % 1000 === 0) await yieldToEventLoop(); // ここで、溜まったリクエストやタイマーが処理される
}
```

**手を動かす**: `yield-loop.mjs` を作り、次のように書いて実行します（完成形は [samples/yield-loop.mjs](samples/yield-loop.mjs)）。500ms の計算を 50ms ずつ10回に分け、その合間に順番を譲ります。100ms ごとのタイマーが、計算の途中でも動くかを見ます。

```js
const start = Date.now();
const t = () => `${String(Date.now() - start).padStart(4)}ms`;

function busy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // 重い計算の代わり
  }
}

const nextTask = () => new Promise((resolve) => setImmediate(resolve));

const timer = setInterval(() => console.log(t(), 'タイマー（100ms ごと）'), 100);

for (let i = 0; i < 10; i++) {
  busy(50);
  await nextTask();
}
console.log(t(), '計算が終わった');
clearInterval(timer);
```

```sh
$ node yield-loop.mjs
 100ms タイマー（100ms ごと）
 202ms タイマー（100ms ごと）
 302ms タイマー（100ms ごと）
 402ms タイマー（100ms ごと）
 502ms タイマー（100ms ごと）
 502ms 計算が終わった
```

計算の途中でも、タイマーが予定どおり動きました。`await nextTask();` を `await Promise.resolve();` に変えて実行すると、タイマーは1回も表示されません（2.2節）。`clearInterval(timer)` は、`setInterval` のタイマーを止める関数です。

Worker より簡単で、データのコピーもいりません。ただし、全体にかかる時間は少し長くなり、その間メインのスレッドの CPU を使っていることに変わりはありません。練習問題1で関数にし、練習問題5で、件数ではなく時間で区切る版を作ります。

### 6.3 そもそも、Node.js でやらない

画像や動画の変換、機械学習のように、ずっと CPU を使う仕事は、Node.js のサーバの中でやらないのも選択肢です。

- 別のプロセスに任せる（`child_process` で専用のプログラムを動かす。第15章）
- ジョブのキューに入れて、別のサーバ（ワーカー）に処理させる（第12部）
- その仕事が得意な言語やサービスを使う

Node.js が得意なのは「たくさんの I/O を待つ」ことで、苦手なのは「1つの重い計算」です。

## 7. イベントループの遅れを測る

サーバが止まっているかどうかは、「タイマーが予定より何 ms 遅れて呼ばれたか」で測れます。Node.js には、そのための `perf_hooks.monitorEventLoopDelay` があります。

次のサンプルで、わざと止めたときの遅れを測ります（中身は読まなくてよい）。

```sh
$ node samples/loop-delay-demo.mjs
何もしない 1秒
  遅れ: 平均    0.2ms / 99パーセンタイル    1.4ms / 最大    1.7ms
100ms ごとに 30ms 止める
  遅れ: 平均    4.0ms / 99パーセンタイル   30.3ms / 最大   30.7ms
1回だけ 300ms 止める
  遅れ: 平均   15.9ms / 99パーセンタイル  299.3ms / 最大  299.3ms
```

**平均だけを見てはいけない**ことが分かります。「1回だけ 300ms 止める」の平均は 15.9ms ですが、その 300ms の間に来たリクエストは、全部 300ms 待たされています。サーバの遅さは、99パーセンタイル（遅い方から1%の値）や最大で見るのが一般的です。

本番のサーバでは、この値をログや監視の仕組み（第12部）に送り、遅れが大きくなったら知らせるようにします。練習問題9で、簡単な見張りを自分で作ります。

どこで止まっているかを調べるには、CPU プロファイル（どの関数にどれだけ時間がかかったかの記録）を取ります。`node --cpu-prof server.mjs` で実行すると、終了時に `.cpuprofile` ファイルができ、Chrome の DevTools の Performance パネルに読み込んで見られます。第1部 第4章の、DevTools でデバッグする方法（`--inspect`）からも取れます。

## 8. プロセスはいつ終わるのか

Node.js のプロセスは、**イベントループに待つものが無くなったら**終わります。「待つもの」とは、まだ動いていないタイマー、開いているソケット（`listen` 中のサーバを含む）、実行中のファイル操作や子プロセスなどです。

**手を動かす**: `unref-demo.mjs` を作り、次の3行を書いて実行します（完成形は [samples/unref-demo.mjs](samples/unref-demo.mjs)）。

```js
const watcher = setInterval(() => console.log('見張り中'), 300);
watcher.unref();
setTimeout(() => console.log('1秒の仕事が終わった'), 1000);
```

```sh
$ node unref-demo.mjs
見張り中
見張り中
見張り中
1秒の仕事が終わった
```

1秒の仕事が終わると、`setInterval` が残っていてもプロセスが終わりました。次に、`watcher.unref();` の行を消して実行してみてください。今度は「見張り中」がいつまでも表示され、プロセスが終わりません（Ctrl+C で止めます）。`setInterval` のタイマーが「待つもの」として残っているからです。

いくつかの場面をまとめたサンプルです（中身は読まなくてよい）。

```sh
$ node samples/exit-demo.mjs 2
 1002ms 定期的な処理
 2003ms 定期的な処理
 2501ms 2.5秒の仕事が終わった
 2501ms exit イベント（終了コード 0）

$ node samples/exit-demo.mjs 3
    0ms 解決されない Promise を await する
Warning: Detected unsettled top-level await at file:///.../exit-demo.mjs:30
    await new Promise(() => {});
    ^
    1ms exit イベント（終了コード 13）
```

- **`unref()`** したタイマーやソケットは、プロセスを引き止めません。ログを定期的に送る、見張る、といった「それだけのためにプロセスを生かしておきたくない」処理に使います（`ref()` で元に戻せます）
- **Promise はプロセスを引き止めません**。Promise は「結果の入れ物」で、待っているのはタイマーやソケットの方だからです。誰も resolve しない Promise を一番外側で `await` すると、Node.js は「もう何も起きない」と判断して終了コード 13 で終わります
- `listen` 中のサーバは、`server.close()` するまでプロセスを引き止めます

「処理が終わったのに、プロセスが終わらない」ときは、閉じ忘れたタイマー、サーバ、データベースへの接続などが残っています。

## 9. Flask（WSGI）との比較

| | Flask（gunicorn などで動かす） | Node.js |
| --- | --- | --- |
| 同時に来たリクエスト | スレッドやプロセスを複数用意し、1つのリクエストに1つを割り当てる | 1つのスレッドで、待ち時間の合間に順番に処理する |
| 待ち時間のある処理（DB・HTTP） | そのスレッドは待っている間、何もしない（ほかのスレッドが他のリクエストを処理する） | 待っている間に、ほかのリクエストを処理する |
| 1つの重い計算 | そのスレッド（ワーカー）だけが遅くなる | **サーバ全体が止まる** |
| 同時に1万の接続 | 1万のスレッドは重いので難しい | 得意（待つのは OS） |
| 共有の変数 | スレッドの間で競合する。ロックが必要なことがある | 同期のコードの途中で割り込まれない。ただし `await` の所では割り込まれる（第2部 第10章の練習問題8） |
| CPU のコアを全部使う | ワーカーのプロセスを複数立てる | プロセスを複数立てる（第12部）、または Worker |

Python にも `asyncio` を使う ASGI のフレームワーク（FastAPI など）があり、こちらは Node.js と同じく「1つのスレッドでイベントループを回す」方式です。`async def` の中で重い計算や同期の I/O をすると全体が止まる、という注意点もまったく同じです。

## まとめ

- JavaScript のスレッドは1つ。今の処理は最後まで実行され、その間はタイマーも I/O のコールバックも動かない。
- 待つのは OS（ネットワーク）と libuv のスレッドプール（ファイル・DNS・重い crypto）。終わったらイベントループに知らせる。
- マイクロタスク（Promise）は、今の処理の直後に空になるまで実行される。タスク（タイマー・I/O・`setImmediate`）は、その後に1つずつ。
- Node.js のイベントループは timers → poll → check … と回る。I/O のコールバックの中からなら、`setImmediate` はいつもタイマーより先。
- スレッドプールは既定で4本で、ファイル・DNS・crypto で共有している。埋まると関係の無い処理も待たされる。
- 重い計算や同期の I/O は、サーバ全体を止める。Worker に移す、小分けにして `setImmediate` で譲る、別の仕組みに任せる。
- 止まっているかは、イベントループの遅れで測る。平均ではなく、99パーセンタイルや最大を見る。
- プロセスは、待つもの（タイマー・ソケットなど）が無くなったら終わる。Promise は引き止めない。`unref()` で引き止めないようにできる。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用3問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js「The Node.js Event Loop」: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- Node.js「Don't Block the Event Loop (or the Worker Pool)」: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
- Node.js「Worker threads」: https://nodejs.org/api/worker_threads.html
- Node.js「perf_hooks.monitorEventLoopDelay」: https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions
- Node.js「UV_THREADPOOL_SIZE」: https://nodejs.org/api/cli.html#uv_threadpool_sizesize
- libuv「Design overview」: https://docs.libuv.org/en/v1.x/design.html
- MDN「JavaScript の実行モデル」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Event_loop
- MDN「queueMicrotask() によるマイクロタスクの使用」: https://developer.mozilla.org/ja/docs/Web/API/HTML_DOM_API/Microtask_guide

前の章: [第12章 非同期処理](../ch12-async/README.md) ／ 次の章: [第14章 モジュールとパッケージ管理](../ch14-modules-npm/README.md)
