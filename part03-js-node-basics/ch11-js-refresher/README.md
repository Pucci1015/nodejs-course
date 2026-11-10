# 第11章 JavaScript 再入門

JavaScript の基本（変数、関数、if、for、配列、オブジェクト）は知っている前提で、**「なんとなく書けるが、なぜそう動くのか説明できない」部分**を学び直します。
型と比較、スコープとクロージャ、`this`、プロトタイプとクラス、分割代入、配列のメソッド、参照とコピー、エラー処理です。どれも、Node.js のサーバや React のコードを読むときに毎日出てきます。Python と動きが違うところは、並べて説明します。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | JavaScript の基本の文法、第1部（ターミナル、VS Code、Node.js のデバッグ） |
| この章のゴール | 型の変換と比較の規則を説明できる / スコープとクロージャを使って状態を隠せる / `this` が何になるかを、呼び方から判断できる / クラスとプロトタイプの関係が分かる / 配列のメソッドでデータを集計できる / 参照・浅いコピー・深いコピーを区別できる / エラーを正しく投げて受け取れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形と、型・スコープ・`this`・配列・コピーをまとめて確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第3部の実習は `~/dev/part03/` で行います（教材のフォルダは見本として残しておくため）。第3部の章は、前の章の模範解答やデータを使うことがあるので、**部のフォルダを丸ごと**コピーします。この章の最初に1回だけ行います。
>
>   ```sh
>   $ mkdir -p ~/dev
>   $ cp -R （ここに Finder から part03-js-node-basics フォルダをドラッグ） ~/dev/part03
>   $ cd ~/dev/part03/ch11-js-refresher
>   ```
>
>   `mkdir -p ~/dev` は `~/dev` フォルダを作ります（もうあれば何もしません）。`cp -R コピー元 コピー先` は、フォルダを中身ごとコピーします。コピー先の `~/dev/part03` がまだ無いときは、その名前で作られます。**2回目は打たないでください**（既にあると、`~/dev/part03` の**中に**もう1つコピーされてしまいます）。
> - この章のコマンドは、すべて `~/dev/part03/ch11-js-refresher/` で実行します。
> - 「**手を動かす**」の所は、REPL に打つか、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - この章の出力は、Node.js 26（作成時点の Active LTS）で確かめたものです。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `===`、truthy と falsy（1節） | すべてのコード。第4部でリクエストの値を確かめるとき |
| クロージャ（3節） | 第4部 第18章のミドルウェア、第5部の Express の設定、第8部の React の `useState` |
| `this` と `bind`（4節） | イベントやコールバックにメソッドを渡すとき（第15章の EventEmitter、第8部） |
| クラスと `#private`（5節） | 第4部の `HttpError`、第5部のサービスの層 |
| 分割代入・スプレッド・`??`（6節） | 第4部・第5部で設定やリクエストのボディを扱うとき。第8部の state の更新 |
| 配列のメソッド（7節） | 一覧を絞り込む・並べる・集計するすべての場面（第5部 第25章の API など） |
| 参照とコピー（8節） | 第8部の React の state（コピーし忘れると画面が更新されない） |
| エラーと `cause`（9節） | 第4部の `HttpError`、第5部のエラーハンドリング |

---

## 1. 値と型

### 1.1 Node.js で試す方法

この章では、小さなコードを何度も試します。方法は3つあります。

```sh
$ node                                  # REPL（対話モード）。.exit か Ctrl + D で終わる
> 0.1 + 0.2
0.30000000000000004
$ node -p "typeof null"                 # 式を1つ評価して表示する
object
$ node samples/types-demo.mjs           # ファイルを実行する
```

**手を動かす**: `node` だけを打って REPL を起動し、次の3行を1行ずつ打ってみてください。打った式の値が、次の行に表示されます。

```
> 1 + 2
3
> 'abc'.length
3
> typeof 'abc'
'string'
```

`const x = 1` のような宣言の行の後には `undefined` と表示されます。「この行そのものには値が無い」という意味なので、気にしなくて構いません。終わるときは `.exit` を打つか、`Ctrl + D` を押します。この章では、REPL で何度も試します。

REPL は Python の `python3` の対話モードと同じ使い方ができます。`.mjs` のファイルは **ES Modules**（第14章）として読み込まれ、自動的に **strict モード**（間違いやすい書き方をエラーにするモード）になります。この教材のコードは、すべて strict モードを前提にしています。

### 1.2 型の種類

JavaScript の値は、**プリミティブ**（それ以上分けられない値）と**オブジェクト**に分かれます。

| 種類 | 例 | `typeof` |
| --- | --- | --- |
| 数値 | `42`、`3.14`、`NaN`、`Infinity` | `'number'` |
| 長い整数 | `42n` | `'bigint'` |
| 文字列 | `'あ'`、`` `テンプレート ${x}` `` | `'string'` |
| 真偽値 | `true`、`false` | `'boolean'` |
| 値が無い | `undefined`（まだ値が入っていない）、`null`（「無い」ことを表す値） | `'undefined'`、`'object'`（!） |
| シンボル | `Symbol('id')` | `'symbol'` |
| オブジェクト | `{}`、`[]`、`new Date()`、関数、クラス | `'object'`（関数とクラスは `'function'`） |

**手を動かす**: REPL で `typeof 42`、`typeof null`、`typeof []`、`Array.isArray([])` を打って、表と同じになるか確かめてください。

`samples/types-demo.mjs`（**中身は読まなくてよい**）を実行すると、Python と違うところがまとめて表示されます。

```sh
$ node samples/types-demo.mjs
== typeof ==
...
typeof null                          → "object"
typeof []                            → "object"
Array.isArray([])                    → true
```

`typeof null` が `'object'` なのは、最初の実装の誤りが互換性のために残ったものです。`null` かどうかは `value === null`、配列かどうかは `Array.isArray(value)` で調べます。

### 1.3 数値はすべて浮動小数点数

Python には `int` と `float` がありますが、JavaScript の `number` は**64ビットの浮動小数点数だけ**です。

**手を動かす**: 下の左側の式を REPL に1つずつ打って、右側と同じ結果になるか確かめてください。

```
0.1 + 0.2                            → 0.30000000000000004
Number.MAX_SAFE_INTEGER              → 9007199254740991
2 ** 53 + 1                          → 9007199254740992
2n ** 53n + 1n                       → 9007199254740993
-7 % 3                               → -1
1 / 0                                → Infinity
Number('12px')                       → NaN
parseInt('12px', 10)                 → 12
NaN === NaN                          → false
```

- `0.1 + 0.2` が `0.3` にならないのは Python の `float` と同じです。**お金は円などの最小の単位の整数で持つ**のが基本です。
- 整数を正確に表せるのは `±(2⁵³ − 1)` までです。それを超える ID（データベースの 64 ビットの ID や、X（旧 Twitter）の投稿の ID など）は、文字列か `BigInt` で扱います。
- `%` は「割り算の余り」で、結果の符号は左側と同じです（Python は右側と同じ）。
- 0 で割ってもエラーにならず `Infinity` になります。数値にできない文字列は `NaN`（Not a Number）になります。`NaN` は自分自身とも等しくないので、`Number.isNaN()` で調べます。

### 1.4 `==` と `===`

`==` は、型が違うと**型を変換してから**比べます。その規則は複雑で、直感に反します。

```
0 == ''                              → true
0 == '0'                             → true
'' == '0'                            → false
null == undefined                    → true
```

**手を動かす**: REPL で上の4つを打ち、続けて `0 === ''` と `null === undefined` も打ってみてください（どちらも `false`）。

`0 == ''` と `0 == '0'` が両方 true なのに、`'' == '0'` は false です。**比較は常に `===`（型も含めて等しい）を使います**。ESLint の `eqeqeq` ルール（第1部 第4章）でも、`==` を見つけられます。

### 1.5 真偽値に変換されるとき（truthy と falsy）

`if (value)` のように真偽値が必要な場所では、値が自動で変換されます。**偽になる値（falsy）は次の8つだけ**で、それ以外はすべて真（truthy）です。

`false`、`0`、`-0`、`0n`、`''`、`null`、`undefined`、`NaN`

**手を動かす**: `Boolean(値)` は、値を真偽値に変換した結果を返します。REPL で `Boolean(0)`、`Boolean('')`、`Boolean('0')`、`Boolean([])` を打ってみてください（`false`、`false`、`true`、`true`）。

Python と違い、**空の配列 `[]` と空のオブジェクト `{}` は真**です。配列が空かどうかは `list.length === 0` で調べます。また、`0` や `''` が正しい値になりうる場面で `if (value)` と書くと、それらを「値が無い」と誤って扱います（6.3節の `??`）。

### 1.6 文字列は UTF-16

JavaScript の文字列は **UTF-16 の符号単位**の並びです（第2部 第7章の文字コードの話）。

```
s = '𩸽（ほっけ）と🍣'
s.length                             → 10
[...s].length                        → 8
s.slice(0, 1)                        → "\ud867"
new TextEncoder().encode(s).length   → 26
```

`𩸽` や絵文字は UTF-16 では2つの符号単位（**サロゲートペア**）で表すので、`length` は見た目の文字数より多くなり、`slice` で半分に切れてしまいます。文字数を数えるときは `[...s]`（文字列を1文字ずつに分ける）を使います。HTTP の `Content-Length` に必要な**バイト数**は、さらに別の値です（第2部 第6章）。

> 家族の絵文字（👨‍👩‍👧）のように、複数の文字を組み合わせて1つに見えるものは、`[...s]` でも複数に分かれます。見た目の1文字（書記素）で数えるには `Intl.Segmenter` を使います。

## 2. 変数とスコープ

### 2.1 `const`・`let`・`var`

| 宣言 | 再代入 | スコープ | 使いどころ |
| --- | --- | --- | --- |
| `const` | できない | ブロック（`{ }` の中） | **基本はこれ** |
| `let` | できる | ブロック | ループの変数など、値を変える必要があるとき |
| `var` | できる | 関数全体 | 使わない（古いコードを読むときのために知っておく） |

**スコープ**は、変数が見える範囲のことです。`const` と `let` は、宣言した `{ }` の中でだけ見えます。

`const` は「変数に別の値を入れ直せない」だけで、**オブジェクトの中身は変えられます**（8節）。

### 2.2 宣言の前には使えない（TDZ）

```
== 2. 宣言より前に使うと（TDZ）==
ReferenceError: Cannot access 'later' before initialization
関数宣言は巻き上げられる
```

`let` と `const` の変数は、宣言の行を実行するまで使えません（**TDZ**: Temporal Dead Zone）。一方、`function name() {}` の形の**関数宣言**は、ファイルやブロックの先頭に**巻き上げ**（hoisting）られるので、宣言より前の行から呼べます。

## 3. 関数とクロージャ

### 3.1 関数の書き方

```js
function add(a, b) { return a + b; }       // 関数宣言（巻き上げられる。this を持つ）
const add2 = function (a, b) { return a + b; };  // 関数式
const add3 = (a, b) => a + b;              // アロー関数（this を持たない。4節）
```

関数は値なので、変数に入れたり、引数で渡したり、戻り値で返したりできます（Python と同じ）。

### 3.2 クロージャ

関数は、**作られた場所のスコープの変数を覚えています**。これを**クロージャ**と呼びます。

**手を動かす**: `counter.mjs` を作り、次のように書いて実行します（完成形は [samples/counter.mjs](samples/counter.mjs)）。

```js
function makeCounter() {
  let count = 0; // makeCounter が終わっても、返した関数が使い続ける
  return {
    increment: () => {
      count = count + 1;
      return count;
    },
    get: () => count,
  };
}

const a = makeCounter();
const b = makeCounter();
a.increment();
a.increment();
b.increment();
console.log(`a: ${a.get()}、b: ${b.get()}`); // それぞれ別の count を持つ
console.log(`count は外から見えない: ${a.count}`);
```

```sh
$ node counter.mjs
a: 2、b: 1
count は外から見えない: undefined
```

`makeCounter` は、`increment` と `get` の2つの関数を入れたオブジェクトを返します。2つの関数は、どちらも `makeCounter` の中の `count` を覚えています。

`makeCounter()` を呼ぶたびに新しい `count` が作られ、返した関数だけがそれを読み書きできます。**外から直接触れない状態を作る**方法として、クラスの `#private`（5節）と並んでよく使われます。React の `useState`（第8部）や、Express のミドルウェアの設定（第5部）も、この仕組みの上に作られています。

### 3.3 ループとクロージャ

**手を動かす**: REPL に次の2行を打ちます。どちらも「`i` を返す関数」を3つ作って、後でまとめて呼んでいます。

```
> const fs1 = []; for (var i = 0; i < 3; i++) { fs1.push(() => i); } fs1.map((f) => f())
[ 3, 3, 3 ]
> const fs2 = []; for (let j = 0; j < 3; j++) { fs2.push(() => j); } fs2.map((f) => f())
[ 0, 1, 2 ]
```

`var` の `i` は関数全体で1つしかないので、ループが終わった後に関数を呼ぶと、すべて最後の値 `3` を見ます。`let` は**繰り返しのたびに新しい変数**を作るので、それぞれの関数が別の値を覚えます。古いコードの「ボタンを押すと、すべて最後の番号になる」というバグの原因は、たいていこれです。

### 3.4 Python と違うところ

- 内側の関数で外側の変数に代入するとき、Python の `nonlocal` のような宣言は要りません。
- **既定の引数は、呼ぶたびに作られます**。Python の `def f(items=[])` は同じリストを使い回す有名な落とし穴ですが、JavaScript の `function f(items = [])` は毎回新しい配列になります。

```
== 6. 既定の引数は、呼ぶたびに作られる ==
[ 'a' ] [ 'b' ]
```

## 4. this

### 4.1 this は「どう呼んだか」で決まる

Python のメソッドは `self` を引数で受け取るので、何が `self` かは明らかです。JavaScript の `this` は、**関数を定義した場所ではなく、呼んだときの形**で決まります。

| 呼び方 | `this` |
| --- | --- |
| `obj.method()` | `obj` |
| `const f = obj.method; f()` | `undefined`（strict モード） |
| `fn.call(x)`、`fn.apply(x)`、`fn.bind(x)()` | `x` |
| `new Fn()` | 新しく作られたオブジェクト |
| アロー関数 | **自分の `this` を持たない**。外側の `this` を使う |

**手を動かす**: REPL で次を打ってみてください。

```
> const timer = { seconds: 1, tick() { return `タイマー: ${this.seconds}秒`; } }
> timer.tick()
'タイマー: 1秒'
> const f = timer.tick
> f()
'タイマー: undefined秒'
> f.call(timer)
'タイマー: 1秒'
```

`timer.tick()` と呼ぶと `this` は `timer` ですが、取り出した `f` を `f()` と呼ぶと、`this` は `timer` ではなくなります。REPL は strict モードではないので `undefined秒` と表示されましたが、`.mjs` のファイルの中（strict モード）では `this` が `undefined` になり、`TypeError` になります。`samples/this-demo.mjs`（**中身は読まなくてよい**）で確かめられます。

```sh
$ node samples/this-demo.mjs
== 1. obj.method() と呼べば、this は obj ==
タイマー: 1秒

== 2. メソッドを取り出して呼ぶと、this が失われる ==
TypeError: Cannot read properties of undefined (reading 'seconds')

== 3. コールバックに渡すときも同じ ==
TypeError: Cannot read properties of undefined (reading 'seconds')
bind で this を固定する: タイマー: 2秒
アロー関数で包む:      タイマー: 3秒
```

`setTimeout(timer.tick, 1000)` や `button.addEventListener('click', obj.handle)` のように、**メソッドを関数として渡すと `this` が失われます**。渡すのは「関数だけ」で、「どのオブジェクトのものか」は伝わらないからです。`bind` するか、`() => timer.tick()` のようにアロー関数で包みます。

### 4.2 アロー関数と this

```
function: [ 'alice（undefined）', 'bob（undefined）' ]
arrow:    [ 'alice（A チーム）', 'bob（A チーム）' ]
```

メソッドの中で `map` などに `function` を渡すと、その中の `this` は `undefined` になります。アロー関数は自分の `this` を持たず、外側（メソッド）の `this` をそのまま使うので、期待どおりに動きます。**コールバックにはアロー関数を使う**のが基本です。

逆に、**オブジェクトのメソッドをアロー関数で書くと**、`this` はオブジェクトになりません（`samples/this-demo.mjs` の5）。メソッドは `name() { ... }` の形で書きます。

## 5. オブジェクトとクラス

### 5.1 プロトタイプ

JavaScript のオブジェクトは、**プロトタイプ**という別のオブジェクトへのつながりを持っています。プロパティを読むとき、自分に無ければプロトタイプを、それにも無ければそのプロトタイプを…とたどって探します（**プロトタイプチェーン**）。

```
ポチが鳴いた
Object.hasOwn(dog, 'speak') = false
Object.getPrototypeOf(dog) === animal → true
```

`[1, 2].map(...)` の `map` も、配列自身ではなく `Array.prototype` にあります。すべての配列が、同じ1つの `map` を共有しています。

### 5.2 クラス

`class` は、プロトタイプを使った書き方を、他の言語のクラスに近い形で書けるようにしたものです。

**手を動かす**: `account.mjs` を作り、次のように書いて実行します（完成形は [samples/account.mjs](samples/account.mjs)）。

```js
class Account {
  #balance = 0; // # で始まるフィールドは、クラスの外から読めない

  constructor(owner) {
    this.owner = owner; // Python の self.owner = owner
  }

  deposit(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RangeError(`入金額は正の整数にしてください: ${amount}`);
    }
    this.#balance += amount;
    return this; // this を返すと、account.deposit(1).deposit(2) とつなげて呼べる
  }

  get balance() {
    return this.#balance; // account.balance と、() を付けずに読める
  }

  toString() {
    return `${this.owner} の口座（残高 ${this.#balance} 円）`;
  }
}

const account = new Account('alice');
account.deposit(1000).deposit(500);
console.log(String(account));
console.log(`account.balance = ${account.balance}`);
console.log(`account['#balance'] = ${account['#balance']}（別のプロパティ扱い）`);
try {
  account.deposit(-1);
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
```

```sh
$ node account.mjs
alice の口座（残高 1500 円）
account.balance = 1500
account['#balance'] = undefined（別のプロパティ扱い）
RangeError: 入金額は正の整数にしてください: -1
```

| 書いたもの | 意味 | Python で言うと |
| --- | --- | --- |
| `constructor(owner)` | `new Account('alice')` のときに呼ばれる | `__init__` |
| `this.owner = owner` | 作ったオブジェクトにプロパティを付ける | `self.owner = owner` |
| `#balance` | クラスの外から読めないフィールド | `_balance`（ただし Python は「約束」だけ） |
| `get balance()` | ゲッター。`account.balance` と、`()` なしで読める | `@property` |
| `toString()` | `String(account)` やテンプレートリテラルで呼ばれる | `__str__` |
| `throw new RangeError(...)` | エラーを投げる（9節） | `raise ValueError(...)` |

`try { ... } catch (err) { ... }` は、`try` の中でエラーが投げられたら `catch` に進む書き方です（9節）。

Python の `_balance` は「触らないでね」という約束ですが、JavaScript の `#balance` は**本当に外から読めません**。クラスの外で `account.#balance` と書くと、実行する前に構文のエラーになります。

### 5.3 継承

```js
class SavingsAccount extends Account {
  constructor(owner, rate) {
    super(owner);            // 親の constructor を先に呼ぶ（呼ぶ前に this は使えない）
    this.rate = rate;
  }
  toString() {
    return `${super.toString()}、利率 ${this.rate * 100}%`;
  }
}
```

親の `#balance` は、子のクラスからも見えません（Python の `__balance` の名前の変換よりも厳しい）。子からは、親が用意したゲッターやメソッドを通して使います。

> 継承を何段も重ねると、どのメソッドがどこで定義されているかが分かりにくくなります。JavaScript では、クラスの継承より、**関数とオブジェクトを組み合わせる**書き方もよく使われます（React はクラスではなく関数でコンポーネントを書きます）。

## 6. 分割代入・スプレッド・`?.`・`??`

### 6.1 分割代入

```js
const [first, , third] = tasks;                           // 配列: 2つ目を飛ばす
const { title, done: isDone, priority = '普通' } = first;  // オブジェクト: 名前を変える・既定の値
const { id, ...rest } = tasks[1];                         // 残りをまとめる
function show({ title, done = false }) { ... }            // 引数でも使える
```

Python の `a, b = pair` や `first, *rest = items` に近い書き方です。オブジェクトはキーの名前で取り出すので、順番は関係ありません。

### 6.2 スプレッド

```js
const updated = { ...first, done: true };   // first をコピーし、done だけ変える
const merged = [...a, ...b];                // 配列をつなげる
Math.max(...numbers);                       // 配列を引数に展開する（Python の *args）
```

**元のオブジェクトを変えずに、一部を変えた新しいオブジェクトを作る**書き方は、React（第8部）で毎日使います。ただし、コピーは**浅い**ことに注意します（8節）。

### 6.3 `?.` と `??`

```
config.db?.host = undefined
port || 3000 = 3000
port ?? 3000 = 0
```

**手を動かす**: REPL で `const port = 0` と打ってから、`port || 3000` と `port ?? 3000` を打ち比べてください。

- `a?.b` は、`a` が `null` か `undefined` なら、エラーにせず `undefined` を返します。`a?.()`（関数があれば呼ぶ）、`a?.[key]` もあります。
- `a ?? b` は、`a` が **`null` か `undefined` のときだけ** `b` を使います。`a || b` は `a` が falsy（`0` や `''` も）なら `b` を使うので、ポート番号の `0` や空文字列が正しい値のときに誤ります。**既定の値には `??` を使います**。

## 7. 配列のメソッドと反復

### 7.1 よく使うメソッド

| メソッド | 返すもの | Python で言うと |
| --- | --- | --- |
| `map(f)` | 各要素を変換した新しい配列 | `[f(x) for x in xs]` |
| `filter(f)` | 条件に合う要素の新しい配列 | `[x for x in xs if f(x)]` |
| `reduce(f, 初期値)` | 1つの値にまとめる | `functools.reduce` |
| `find(f)` / `findIndex(f)` | 最初に合う要素 / その位置（無ければ `undefined` / `-1`） | `next((x for x in xs if f(x)), None)` |
| `some(f)` / `every(f)` | 1つでも合うか / すべて合うか | `any(...)` / `all(...)` |
| `flatMap(f)` | 変換して1段平らにする | 二重のリスト内包表記 |
| `includes(x)` | 含むか | `x in xs` |
| `toSorted(f)` / `toReversed()` | 並べ替えた**新しい**配列 | `sorted(xs, key=...)` |
| `Object.groupBy(xs, f)` | キーごとに分けたオブジェクト | `itertools.groupby`（並べ替え不要） |

**手を動かす**: `tasks-summary.mjs` を作り、次のように書いて実行します（完成形は [samples/tasks-summary.mjs](samples/tasks-summary.mjs)）。

```js
const tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'], minutes: 10 },
  { id: 2, title: '第11章を読む', done: true, tags: ['勉強'], minutes: 90 },
  { id: 3, title: '練習問題を解く', done: false, tags: ['勉強', 'Node.js'], minutes: 120 },
  { id: 4, title: 'パンを買う', done: true, tags: ['買い物'], minutes: 5 },
];

// filter で「未完了」だけにして、map でタイトルだけにする
const todoTitles = tasks.filter((t) => !t.done).map((t) => t.title);
console.log('未完了:', todoTitles);

// reduce で、minutes を足し合わせる（0 から始める）
const total = tasks.reduce((sum, t) => sum + t.minutes, 0);
console.log(`合計 ${total} 分`);

// find で、最初に条件に合うものを1つ
const long = tasks.find((t) => t.minutes > 60);
console.log(`60分を超える最初のタスク: ${long.title}`);

// toSorted で、短い順に並べた新しい配列（tasks は変わらない）
const byMinutes = tasks.toSorted((a, b) => a.minutes - b.minutes);
console.log('短い順:', byMinutes.map((t) => t.title));
```

```sh
$ node tasks-summary.mjs
未完了: [ '牛乳を買う', '練習問題を解く' ]
合計 225 分
60分を超える最初のタスク: 第11章を読む
短い順: [ 'パンを買う', '牛乳を買う', '第11章を読む', '練習問題を解く' ]
```

`(t) => !t.done` は「`t` を受け取って `!t.done` を返す」アロー関数です（3.1節）。`filter` はこの関数が真を返した要素だけを集めます。`reduce((sum, t) => sum + t.minutes, 0)` は、`sum` を 0 から始めて、要素ごとに `sum + t.minutes` を次の `sum` にします。

ほかのメソッド（`some`、`flatMap`、`Object.groupBy` など）は、`samples/array-demo.mjs`（**中身は読まなくてよい**）で動きを確かめられます。

`map` と `filter` をつなげて書くと、「何をしているか」が `for` 文よりも読み取りやすくなります。ただし、1つの式に詰め込みすぎると読みにくくなるので、途中の結果に名前を付けることもためらわないでください。

### 7.2 sort の2つの落とし穴

```
toSorted()           : [ 1, 10, 100, 25, 9 ]
toSorted((a,b)=>a-b) : [ 1, 9, 10, 25, 100 ]
nums（元のまま）     : [ 10, 9, 1, 100, 25 ]
sort の後の nums     : [ 100, 25, 10, 9, 1 ]
```

**手を動かす**: REPL で `const nums = [10, 9, 1, 100, 25]` と打ち、`nums.toSorted()`、`nums.toSorted((a, b) => a - b)`、`nums` の順に打ってみてください。

1. **比較関数を渡さないと、文字列として並べます**。数値は `(a, b) => a - b` を渡します（負なら a が前、正なら b が前）。複数の条件は `a.minutes - b.minutes || a.id - b.id` のように `||` でつなげます。
2. **`sort` は元の配列を書き換えます**（`reverse`、`splice` も）。元を残したいときは `toSorted`（`toReversed`、`toSpliced`）を使います。関数の引数で受け取った配列を `sort` すると、呼んだ側の配列まで並び変わってしまいます。

日本語の文字列は `a.localeCompare(b, 'ja')` で並べると、辞書に近い順になります。

### 7.3 反復の方法

| 書き方 | 使いどころ |
| --- | --- |
| `for (const x of xs)` | 値を順に。`break`・`continue`・`await`（第12章）が使える |
| `for (const [i, x] of xs.entries())` | 位置と値（Python の `enumerate`） |
| `xs.forEach((x) => ...)` | 途中でやめられない。`await` と組み合わせると期待どおりに動かない（第12章） |
| `for (const key in obj)` | オブジェクトのキー。プロトタイプのものまで含むので、代わりに `Object.keys` / `Object.entries` を使う |

キーと値の組を扱うなら、オブジェクトより **`Map`** が向いていることがあります。`Map` は文字列以外（オブジェクトなど）もキーにでき、入れた順番を保ち、`size` で数を数えられます。重複の無い集まりには **`Set`** を使います（Python の `dict` と `set` に対応）。

## 8. 参照とコピー

### 8.1 オブジェクトは参照で受け渡される

**手を動かす**: REPL で次を打ちます。

```
> const original = { title: '牛乳を買う' }
> const alias = original
> alias.title = '豆乳を買う'
> original.title
'豆乳を買う'
```

`alias` を変えたのに、`original` も変わりました。`alias = original` は、オブジェクトをコピーしたのではなく、**同じオブジェクトを指す名前**をもう1つ作っただけだからです。

オブジェクト（配列も）を変数に入れたり、関数に渡したりしても、コピーは作られません。**同じオブジェクトを指す参照**が増えるだけです。これは Python のリストや辞書と同じです。

`===` は「同じオブジェクトか」を比べるので、中身が同じでも別のオブジェクトなら `false` です。

```
{ a: 1 } === { a: 1 } → false
```

### 8.2 浅いコピーと深いコピー

| 方法 | コピーの深さ | 注意 |
| --- | --- | --- |
| `{ ...obj }`、`[...arr]`、`Object.assign` | **浅い**（1段目だけ） | 中のオブジェクトや配列は共有される |
| `JSON.parse(JSON.stringify(obj))` | 深い | `Date` が文字列になる。`undefined`・関数は消え、`NaN` は `null` になる |
| `structuredClone(obj)` | 深い | `Date`・`Map`・`Set` もコピーできる。関数やクラスのインスタンスのメソッドはコピーできない |

**手を動かす**: REPL で次を打ちます。

```
> const task = { title: '牛乳', tags: ['買い物'] }
> const shallow = { ...task }
> shallow.tags.push('急ぎ')
> task.tags
[ '買い物', '急ぎ' ]
> const deep = structuredClone(task)
> deep.tags.push('あとで')
> task.tags
[ '買い物', '急ぎ' ]
```

スプレッドで作った `shallow` は、`tags` の配列を `task` と共有しているので、`push` すると `task` も変わります。`structuredClone` で作った `deep` は、配列までコピーしているので、`task` は変わりません。`samples/copy-demo.mjs`（**中身は読まなくてよい**）では、JSON のコピーとの違いも確かめられます。

```
original.tags  = ["買い物","浅いコピーで追加"]（中の配列は共有している）
typeof viaJson.due = string（Date が文字列になる）
deep.due instanceof Date = true
関数はコピーできない: DataCloneError
```

「元のデータを変えずに一部を変えた新しいデータを作る」（**イミュータブル**な更新）は、React の state で必須になります。浅いコピーで中の配列を `push` すると、元のデータも変わってしまい、画面が更新されないバグになります（第8部 第42章）。

`Object.freeze` すると、そのオブジェクトは変更できなくなります（ただし freeze も浅い）。

## 9. エラー処理

### 9.1 投げる・受け取る

```js
try {
  JSON.parse(text);
} catch (err) {            // Python の except Exception as err
  console.error(err.message);
} finally {
  // 成功しても失敗しても実行する
}
```

**手を動かす**: REPL で次を打ちます。壊れた JSON を読もうとして投げられたエラーを、`catch` で受け取っています。

```
> try { JSON.parse('{x}'); } catch (err) { console.log(err.name, '/', err.message); }
SyntaxError / Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

- 投げるのは、**`Error`（またはそれを継承したクラス）のインスタンス**にします。`throw 'エラー'` のように文字列を投げると、どこで起きたかの記録（**スタックトレース**）が残りません。
- 組み込みのエラーのクラス: `TypeError`（型が違う、`undefined` のプロパティを読んだ）、`RangeError`（範囲外）、`SyntaxError`（JSON の解析など）、`ReferenceError`（無い変数）。
- `catch` には**すべての**エラーが来ます。Python の `except ValueError:` のように種類で分けることはできないので、必要なら `if (err instanceof NotFoundError)` で分け、関係の無いエラーは `throw err` で投げ直します。**エラーを握りつぶす（`catch {}` で何もしない）のは、いちばん見つけにくいバグの原因**です。

### 9.2 独自のエラーと cause

```js
class NotFoundError extends Error {
  constructor(what, options) {
    super(`${what} が見つかりません`, options);
    this.name = 'NotFoundError';
  }
}
throw new NotFoundError('設定ファイル', { cause });   // 元のエラーをつなげる
```

```
NotFoundError: 設定ファイル が見つかりません
  原因: SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)
```

**`cause`** に元のエラーを入れておくと、「何をしようとして失敗したか」（設定ファイルを読む）と「なぜ失敗したか」（JSON が壊れていた）の両方が残ります（Python の `raise ... from err`）。Node.js は、`cause` もまとめてスタックトレースに表示します。

非同期の処理のエラー（Promise の reject）は、第12章で扱います。

## 10. Python との対応表

| Python | JavaScript | 注意 |
| --- | --- | --- |
| `None` | `null` / `undefined` | 2つある。「値が無い」を表すなら `null`、未設定は `undefined` |
| `True` / `False` | `true` / `false` | |
| `and` / `or` / `not` | `&&` / `\|\|` / `!` | `\|\|` は「最初の truthy な値」を返す |
| `len(xs)` | `xs.length` | 文字列はサロゲートペアに注意（1.6節） |
| `f"{x}"` | `` `${x}` `` | |
| `x in d` | `key in obj`、`Object.hasOwn(obj, key)`、`map.has(key)` | `in` はプロトタイプのものも見る |
| `d.get(k, 既定)` | `obj[k] ?? 既定` | |
| `[f(x) for x in xs if g(x)]` | `xs.filter(g).map(f)` | |
| `sorted(xs, key=k)` | `xs.toSorted((a, b) => k(a) - k(b))` | 比較関数を渡す |
| `a, *rest = xs` | `const [a, ...rest] = xs` | |
| `def f(*args, **kwargs)` | `function f(...args)`、`function f({ a, b })` | キーワード引数は無いので、オブジェクトで渡す |
| `lambda x: x * 2` | `(x) => x * 2` | |
| `nonlocal` | 不要 | |
| `self` | `this` | 呼び方で決まる（4節） |
| `__init__` / `__str__` | `constructor` / `toString` | |
| `@property` | `get name() {}` | |
| `_private` | `#private` | 本当に外から読めない |
| `raise ... from err` | `throw new Error(msg, { cause: err })` | |
| `copy.copy` / `copy.deepcopy` | `{ ...obj }` / `structuredClone(obj)` | |
| `dict` / `set` | `Object`・`Map` / `Set` | |

## まとめ

- 比較は `===`。数値は浮動小数点数だけで、`2⁵³` を超える整数は正確でない。falsy は8つで、`[]` と `{}` は真。
- `const` を基本にし、変数はブロックスコープ。`var` は使わない。
- 関数は作られた場所の変数を覚えている（クロージャ）。状態を隠すのに使える。
- `this` は呼び方で決まる。メソッドを関数として渡すと失われるので、`bind` かアロー関数で包む。コールバックはアロー関数、メソッドは `name() {}`。
- クラスはプロトタイプの上に作られている。`#private` は本当に外から読めない。
- 分割代入とスプレッドで、元を変えずに新しいオブジェクトを作る。既定の値は `??`。
- 配列のメソッドで集計する。`sort` は元を書き換え、比較関数が無いと文字列として並べる。
- オブジェクトは参照で渡される。スプレッドは浅いコピー、`structuredClone` は深いコピー。
- エラーは `Error` を投げ、`cause` で原因をつなげる。握りつぶさない。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本 → 応用 → 発展の順）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「JavaScript ガイド」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide
- MDN「等価性の比較と同一性」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Equality_comparisons_and_sameness
- MDN「クロージャ」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures
- MDN「this」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/this
- MDN「継承とプロトタイプチェーン」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
- MDN「structuredClone()」: https://developer.mozilla.org/ja/docs/Web/API/Window/structuredClone
- ECMAScript の仕様（毎年6月ごろに新しい版が出ます）: https://tc39.es/ecma262/

前: [第3部の目次](../README.md) ／ 次の章: [第12章 非同期処理](../ch12-async/README.md)
