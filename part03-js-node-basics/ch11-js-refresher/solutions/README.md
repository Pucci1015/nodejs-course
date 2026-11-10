# 第11章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [counter.mjs](counter.mjs) | 問題1: `start` と `step` を指定できるカウンタ |
| [tasks.mjs](tasks.mjs) | 問題2: タスクの集計 |
| [receipt.mjs](receipt.mjs) | 問題3: コピーし忘れを直したレシート |
| [stopwatch.mjs](stopwatch.mjs) | 問題5: `this` の問題を直したストップウォッチ |
| [log-summary.mjs](log-summary.mjs) | 問題6: アクセスログの集計（`node log-summary.mjs ログ` でも動く） |
| [deep.mjs](deep.mjs) | 問題7: `deepEqual` と `setIn` |
| [functions.mjs](functions.mjs) | 問題8: `once`・`memoize`・`debounce`・`pipe` |
| [lru.mjs](lru.mjs) | 問題9: `LRUCache` |

模範解答のテストは、`~/dev/part03/ch11-js-refresher/exercises` で次のように実行できます。`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

```sh
$ MODULE=../solutions/counter.mjs node --test counter.test.mjs
$ MODULE=../solutions/tasks.mjs node --test tasks.test.mjs
$ MODULE=../solutions/receipt.mjs node --test receipt.test.mjs
$ MODULE=../solutions/stopwatch.mjs node --test stopwatch.test.mjs
$ MODULE=../solutions/log-summary.mjs node --test log-summary.test.mjs
$ MODULE=../solutions/deep.mjs node --test deep.test.mjs
$ MODULE=../solutions/functions.mjs node --test functions.test.mjs
$ MODULE=../solutions/lru.mjs node --test lru.test.mjs
```

---

## 問題1 カウンタに機能を足す

```js
export function makeCounter(start = 0, step = 1) {
  let count = start; // 外からは見えない。返した関数だけが読み書きできる
  return {
    increment: () => {
      count = count + step;
      return count;
    },
    decrement: () => {
      count = count - step;
      return count;
    },
    reset: () => {
      count = start;
      return count;
    },
    get: () => count,
  };
}
```

- `count` は `makeCounter` の中の変数なので、返したオブジェクトに `c.count = 100` と書いても、それは**別の**プロパティを足しただけです。4つの関数が見ている `count` は変わりません。
- `reset` は `start` を覚えている必要があります。`start` も `makeCounter` の引数（変数）なので、4つの関数はこれも覚えています。

## 問題2 配列のメソッドでタスクを集計する

```js
export function undoneTitles(tasks) {
  return tasks.filter((t) => !t.done).map((t) => t.title);
}

export function totalMinutes(tasks, onlyDone = false) {
  const targets = onlyDone ? tasks.filter((t) => t.done) : tasks;
  return targets.reduce((sum, t) => sum + t.minutes, 0);
}

export function countByTag(tasks) {
  const counts = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1; // まだ無ければ 0 として足す
    }
  }
  return counts;
}

export function sortByMinutes(tasks) {
  return tasks.toSorted((a, b) => a.minutes - b.minutes || a.id - b.id);
}
```

- `totalMinutes` の `条件 ? A : B` は、条件が真なら A、偽なら B になる式です（三項演算子）。`if` で書いても構いません。
- `reduce` の2つ目の引数 `0` を忘れると、空の配列で `TypeError` になり、そうでなくても最初の要素（オブジェクト）が `sum` になってしまいます。
- `countByTag` は `reduce` でも書けますが、2重の `for...of` の方が読みやすいと考えました。`Object.groupBy` はタグが1つのときにしか使えません（タグが2つあるタスクを両方に数えられない）。
- `sortByMinutes` で `sort` を使うと、テスト「渡した配列の順番は変えない」が失敗します。

## 問題3 コピーし忘れのバグを直す

[receipt.mjs](receipt.mjs) を見てください。直したのは次の2行です。

```js
  // 直した1: 新しいオブジェクトを作る
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  ...
  // 直した2: toSorted は新しい配列を返す
  const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name, 'ja'));
```

1. `const options = DEFAULT_OPTIONS` は、オブジェクトをコピーせず、**同じオブジェクトを指す名前**を作っただけです（8.1節）。続く `Object.assign(options, overrides)` が `DEFAULT_OPTIONS` そのものに `taxRate: 0.08` と `totalLabel: 'お会計'` を書き込むので、3枚目からは既定の設定が「軽減税率・お会計」になってしまいます。スプレッドで新しいオブジェクトを作れば、`DEFAULT_OPTIONS` は変わりません。`{ ...DEFAULT_OPTIONS, ...overrides }` は、後に書いた `overrides` のキーが前のものを上書きします。
2. `items.sort(...)` は、呼んだ側の `items` を並べ替えます（7.2節）。1枚目を作った後、`items` が `[ノート, ペン]` の順になったので、2枚目の `[items[0]]` が「ペン」ではなく「ノート」になりました。

直す前のファイルでテストを動かすと、5個のうち3個が失敗します（`MODULE=./buggy-receipt.mjs node --test receipt.test.mjs`）。

> 中に配列やオブジェクトがある設定（例: `{ tax: { rate: 0.1 } }`）では、スプレッドは浅いコピーなので、中のオブジェクトは共有されたままです（8.2節）。そのときは `structuredClone` を使うか、中まで作り直します（問題7の `setIn`）。

## 問題4 結果を予想して、理由を説明する

```
$ node predict.mjs
 1: [ 1, 10, 3 ]
 2: [ 1, NaN, NaN ]
 3: [ 1, 3 ]
 4: [object Object]
 5: false
 6: TypeError: Cannot read properties of undefined (reading 'name')
 7: hi undefined
 8: [ 1, 2 ]
 9: default
10: undefined
11: [ 1, 'なし' ]
12: abc
13: 3
14: { constructor: 'function Object() { [native code] }1', map: 2 }
15: 3
```

| | 理由 | 本文 |
| --- | --- | --- |
| 1 | 比較関数が無いと、文字列として比べる。`'10'` は `'3'` より前（`'1'` < `'3'`） | 7.2節 |
| 2 | 下で詳しく | |
| 3 | 下で詳しく | 3.3節 |
| 4 | `+` は、どちらかがオブジェクトなら文字列に変換してつなげる。`[]` は `''`、`{}` は `'[object Object]'` | 1.4節 |
| 5 | `===` は同じオブジェクトかを比べる。`structuredClone` は新しいオブジェクトを作る | 8.1節 |
| 6 | 分割代入で取り出したメソッドを、関数として呼んだので `this` は `undefined` | 4.1節 |
| 7 | アロー関数は自分の `this` を持たない。モジュールの一番外の `this` は `undefined` なので `this?.name` は `undefined` | 4.2節 |
| 8 | 浅いコピーなので、`b.list` と `a.list` は同じ配列。`push` は共有している配列を変える。その後の `b.list = [9]` は `b` のプロパティを付け替えるだけで、`a.list` には影響しない | 8.2節 |
| 9 | `0 \|\| null` は、`0` が falsy なので `null`。`null ?? 'default'` は `'default'` | 6.3節 |
| 10 | `y` はブロックの中の `let` なので、ブロックの外には無い。無い変数への `typeof` は、例外ではなく `'undefined'` を返す（ただし TDZ の変数への `typeof` は `ReferenceError`） | 2節 |
| 11 | `#secret in obj` は、「そのオブジェクトがこのクラスの `#secret` を持っているか」を調べる書き方。ふつうの `secret` プロパティとは別物 | 5.2節 |
| 12 | 初期値を省くと、1つ目の要素が初期値になり、2つ目から足していく | 7.1節 |
| 13 | `reduce` で最大値は `3`。`[].length` は `0`。（空の配列に初期値なしで `reduce` すると `TypeError` になる点に注意） | 7.1節 |
| 14 | 下で詳しく | 5.1節 |
| 15 | `👍` は UTF-16 で2つの符号単位なので `length` は 2、`[...'👍']` は1文字なので 1。合わせて 3 | 1.6節 |

**2番**: `map` はコールバックを `(要素, 位置, 配列)` の3つの引数で呼びます。`parseInt` の2つ目の引数は**基数**（何進数として読むか）です。

| 呼び出し | 結果 | 理由 |
| --- | --- | --- |
| `parseInt(1, 0)` | `1` | 基数 0 は「指定なし」として扱われ、10進数 |
| `parseInt(2, 1)` | `NaN` | 1進数は無い（基数は 2〜36） |
| `parseInt(3, 2)` | `NaN` | 2進数に `3` という数字は無い |

関数を `map` にそのまま渡すときは、その関数が2つ目・3つ目の引数を受け取って違う動きをしないかに注意します。`[1, 2, 3].map((s) => parseInt(s, 10))` か `.map(Number)` と書きます。

**3番**: `let` のループの変数は、繰り返しごとに「新しい変数を作り、前の繰り返しの最後の値をコピーする」という動きをします。

1. 1回目: 新しい `i` = 0 で始まる。関数を push（この `i` を覚える）。`i++` で、**この回の** `i` が 1 になる
2. 更新式の `i++`: 2回目の新しい `i` を作り、1 をコピーしてから 2 にする。`i < 4` なので続ける
3. 2回目: 関数を push。`i++` でこの回の `i` が 3
4. 更新式で 4 になり、終わる

1回目の関数は「1回目の `i`」（最後は 1）を、2回目の関数は「2回目の `i`」（最後は 3）を覚えているので、`[1, 3]` です。関数が覚えているのは、**作られたときの値ではなく、変数そのもの**です。`var` で書くと、全員が同じ1つの `i`（最後は 4）を見るので `[4, 4]` になります。

**14番**: `counts` は `{}` で作ったので、プロトタイプは `Object.prototype` です。`counts['constructor']` を読むと、自分には無いのでプロトタイプをたどり、`Object` という**関数**が見つかります。`?? 0` は `null`・`undefined` のときだけ働くので、関数に `+ 1` されて文字列になりました。キーが利用者の入力（単語やタグ）のときに起きるバグです。

直し方:

1. **`Map` を使う**（いちばんおすすめ）: `counts.set(word, (counts.get(word) ?? 0) + 1)`。`Map` はプロトタイプのプロパティと混ざらない
2. **プロトタイプの無いオブジェクトを使う**: `const counts = Object.create(null)`。`Object.hasOwn(counts, word)` で自分のキーだけを調べる方法もある

> 利用者の入力をキーにしてオブジェクトに書き込むと、`__proto__` というキーでプロトタイプそのものを書き換えられてしまう問題（**プロトタイプ汚染**）もあります（第10部 第55章）。

## 問題5 this のバグを直す

### 1. 3つの問題

| メソッド | 呼ばれ方 | そのときの `this` | 起きること |
| --- | --- | --- | --- |
| `tick` | `setInterval(this.tick, 100)` で、関数だけが渡される | Node.js のタイマーのオブジェクト（`Timeout`）。Node.js の `setInterval` は、コールバックの `this` をタイマーにして呼ぶ | `timer.elapsed`（無いので `undefined`）に 100 を足して `NaN` を入れる。**エラーにならず**、`sw.elapsed` が 0 のまま増えない |
| `lap`、`stop` | `keyboard.on('l', this.lap)` | `EventEmitter`（`keyboard`）。EventEmitter は、リスナーの `this` を emitter にして呼ぶ | `keyboard.laps` が無いので `TypeError` |
| `summary` の中の `function` | `map` がコールバックとして呼ぶ | `undefined` | `this.label` で `TypeError` |

```
$ node -e "import('./buggy-stopwatch.mjs').then(({ Stopwatch }) => { const s = new Stopwatch('x'); s.start(); setTimeout(() => { console.log('elapsed', s.elapsed, 'timer.elapsed', s.timer.elapsed); s.stop(); }, 350); })"
elapsed 0 timer.elapsed NaN
```

`tick` のバグは、例外が出ないので気付きにくい種類です。ブラウザの `setInterval` では、`this` は `window`（strict モードでは `undefined`）になるので、環境によっても動きが変わります。**`this` を使う関数を、関数だけで渡さない**ことが大事です。

> テストでは、`t.mock.timers` の偽のタイマーが `this` を `undefined` にして呼ぶので、`TypeError` で失敗します。本物と偽物で失敗の仕方が違いますが、どちらにしても「`this` がストップウォッチではない」ことが原因です。

### 2. 直し方

[stopwatch.mjs](stopwatch.mjs) では、3か所ともアロー関数で包みました（`// 修正:` の行）。

### 3. 直し方の比較

| 直し方 | 例 | 長所 | 短所 |
| --- | --- | --- | --- |
| 渡すときにアロー関数で包む | `setInterval(() => this.tick(), 100)` | 何をしているかが、呼ぶ場所で見える。引数も自由に変えられる | 毎回新しい関数ができるので、`removeListener` で外すには、包んだ関数を変数に入れておく必要がある |
| `bind` | `keyboard.on('l', this.lap.bind(this))` | 短い | アロー関数と同じく、毎回新しい関数になる |
| クラスのフィールドにアロー関数 | `lap = () => { this.laps.push(this.elapsed); };` | どこに渡しても `this` が固定される。同じ関数なので `removeListener` しやすい | インスタンスごとに関数が作られる（プロトタイプで共有されない）。継承した子のクラスで `super.lap()` が使えない |

## 問題6 配列のメソッドでアクセスログを集計する

[log-summary.mjs](log-summary.mjs) を見てください。ファイルを渡すと、そのまま集計できます。

```
$ node log-summary.mjs ../exercises/access.log     # solutions フォルダで
{
  total: 80,
  byStatusClass: { '2xx': 43, '3xx': 13, '5xx': 7, '4xx': 17 },
  byMethod: { GET: 67, POST: 12, DELETE: 1 },
  byHour: { '10': 14, '11': 18, '12': 15, '13': 16, '09': 17 },
  topPaths: [
    { path: '/tasks', count: 18 },
    { path: '/static/app.js', count: 12 },
    { path: '/', count: 11 }
  ],
  uniqueIps: 6,
  bytesTotal: 373903,
  serverErrorRate: 0.088,
  first: 2026-11-04T00:03:15.000Z,
  last: 2026-11-04T04:56:47.000Z
}
```

第1部 第1章の `awk '{print $9}' access.log | sort | uniq -c` の結果（200 が38、201 が4、204 が1 → 2xx が43 など）と一致します。

ポイント:

- 正規表現の**名前付きのグループ**（`(?<status>\d{3})`）を使うと、`match.groups.status` で取り出せて、何番目のグループかを数えなくて済みます。
- 時刻は `+0900` を `+09:00` に直して、ISO 8601 の形の文字列から `Date` を作っています。`new Date(2026, 10, 4, 9, 3, 15)` のように数で作ると、**Mac のタイムゾーン**で解釈されてしまい、他のタイムゾーンの Mac やサーバで結果が変わります（月が 0 始まりなのも間違いやすい点です）。
- 「キーごとに数える」処理を `countBy` という小さな関数にまとめ、4回使い回しています。
- `toSorted` を使うので、途中で作った配列も、引数の配列も書き換えません。

### 問い

**1.** オブジェクトのキーは、**整数として読めるキー（`'10'` など）が先に小さい順**、その後に**その他の文字列のキーが入れた順**に並ぶ、と決められています。`'09'` は先頭が `0` なので「整数のキー」ではなく、文字列のキーとして最後に並びました。テストの `assert.deepEqual` はキーの順番を見ないので通りますが、表示や `Object.entries` の順番が大事なときは困ります。順番が大事な集計には `Map`（入れた順を必ず保つ）を使うか、結果を配列にして `toSorted` で並べます。

**2.**

- 長所: 「配列から1つの値を作る」ことが形で分かる。途中の変数を外に作らないので、他の処理と混ざらない。`countBy` のように関数にして使い回しやすい
- 短所: 慣れないと読みにくい。`acc` を毎回新しいオブジェクトにすると（`{ ...acc, [k]: n }`）、要素の数の2乗に比例する時間がかかる（模範解答のように `acc` を書き換えて返すのが普通）。途中で `break` できない

単純な合計なら `reduce`、複雑な処理なら `for...of` のほうが読みやすいことも多いので、読みやすさで選びます。

## 問題7 深い比較と、イミュータブルな更新

[deep.mjs](deep.mjs) を見てください。

- `deepEqual` は、最初に `a === b`（同じものなら等しい）と `NaN` を片付け、片方でもオブジェクトでなければ `false` にします。次に `Object.getPrototypeOf` を比べるので、配列とオブジェクト、別のクラスのインスタンスは等しくありません。
- 循環に対応するため、「今比べている途中の組」を `seen`（`Map`）に記録します。同じ組がもう一度出てきたら、その組は「今調べている最中」なので、そこでは `true` として先へ進みます。どこかに違いがあれば、その場所で `false` になります。
- `setIn` は再帰で、通り道の段だけを `[...base]` か `{ ...base }` で浅くコピーし、1つのキーだけを差し替えます。下の段が変わらなかった（`Object.is` で同じ）なら、この段もコピーせずにそのまま返します。

### 問い

**1.** 変わった部分だけが新しいオブジェクトになり、変わらない部分は同じオブジェクトのままなので、「この部分は変わったか」を**深く比べずに `===` だけで判定できます**。たとえば `next.tasks === state.tasks` なら、タスクの一覧は1つも変わっていないと分かります。React（第8部 第42章）は、この `===` の比較で「描き直すかどうか」を決めています。オブジェクトを書き換えてしまうと（`state.tasks[0].done = true`）、参照は同じなので「変わっていない」と判断され、画面が更新されません。全体を `structuredClone` してから変えると、今度はすべてが「変わった」ことになり、無駄な描き直しが起きます。

**2.** `assert.deepStrictEqual(0, -0)` は**失敗**します（`Object.is` で比べるため）。このほかにも、`deepStrictEqual` は `Symbol` のキー、`Error` の `message`、ボックス化された値（`new Number(1)`）なども比べます。テストで使う比較の規則が、自分のコードの比較の規則と同じとは限らないので、境目の値（`-0`、`NaN`、`undefined` のキー）は確かめておきます。

## 問題8 クロージャで関数の部品を作る

[functions.mjs](functions.mjs) を見てください。

- `once` は「呼んだか」（`done`）と「結果」（`result`）を別の変数で持ちます。`result === undefined` で判定すると、`undefined` を返す関数が毎回呼ばれてしまいます。`done = true` を `fn` の呼び出しの**後**に書くので、例外が出たときは `done` が変わりません。
- `memoize` は `Map` の「入れた順を覚えている」性質を使い、使ったものを `delete` してから `set` し直して最後尾へ移します。先頭が、いちばん長く使われていないものです（問題9と同じ考え方）。
- `debounce` は、呼ばれるたびに前の `setTimeout` を `clearTimeout` で取り消して予約し直します。最後の `this` と引数を `pending` に覚えておき、`flush` と `cancel` からも使います。テストでは、`t.mock.timers` で時間を進めています（本当に300ミリ秒待たずにテストできる）。
- `pipe` は、作るときに関数かどうかを確かめます。呼ぶときに確かめると、間違いに気付くのが遅れます。

### 問い

**1.** 返す関数をアロー関数にすると、その中の `this` は `once` を呼んだときの外側の `this`（モジュールの一番外なら `undefined`）に固定されます。`obj.hello = once(function () { ... this.name ... })` のようにメソッドとして使われたとき、**呼ばれたときの `this`**（`obj`）を受け取って `fn.apply(this, args)` で渡すには、自分の `this` を持つ `function` で書く必要があります。

**2.** `args[0]` だけをキーにすると、`add(1, 2)` と `add(1, 3)` が同じキーになり、2回目に間違った結果（3）を返します。`JSON.stringify` でも、次のようなものは区別できません。

| 引数 | `JSON.stringify` |
| --- | --- |
| `[undefined]` と `[null]` | どちらも `[null]` |
| `[NaN]` と `[null]` | どちらも `[null]` |
| `[new Date(0)]` と `['1970-01-01T00:00:00.000Z']` | どちらも同じ文字列 |
| `[{ a: 1, b: 2 }]` と `[{ b: 2, a: 1 }]` | 違う文字列になる（同じものなのに、別のキーになる） |

引数の種類が決まっているなら、`key` の関数を自分で書くのが確実です。

## 問題9 LRU キャッシュのクラスを作る

[lru.mjs](lru.mjs) を見てください。

- 中身は `#map`（`Map`）で持ちます。`get` や `set` のたびに、そのキーを `delete` してから `set` し直すと、`Map` の最後尾に移ります。先頭が「いちばん長く使われていないもの」になるので、容量を超えたら `this.#map.entries().next().value` で先頭を取り出して捨てます。
- `has` は `#map.has` を使います。`get(key) !== undefined` で判定すると、値が `undefined` のときに間違えます。
- `*[Symbol.iterator]()` は**ジェネレータ**（`function*`）で、`for...of` やスプレッド（`[...cache]`）が使えるようになります。Python の `__iter__` と `yield` にあたります。
- 容量の検査では、`Number.isInteger('2')` が `false`（文字列を数に変換しない）であることを利用しています。グローバルの `isInteger` のような関数は無く、`isNaN('abc')` のような古い関数は文字列を変換してしまうので、`Number.isXxx` を使います。

### 問い

`Map` の `delete`・`set`・`has`・`get` は、要素の数に関係なく、ほぼ一定の時間で終わります（ハッシュ表）。そのため `get` で「使ったことにする」処理も一定の時間です。配列で作ると、キーを探すのに `findIndex`（全体をなめる）、移動に `splice`（後ろを詰める）が必要になり、どちらも要素の数に比例した時間がかかります。キャッシュは大きくなるほど配列では遅くなります。
