# 第14章 モジュールとパッケージ管理

ここまでのサンプルでは `import fs from 'node:fs/promises'` や `export function ...` を、深く考えずに書いてきました。この章では、JavaScript のファイルどうしがどうつながるのか（**モジュール**）と、他の人が作ったコードをどう取り込むのか（**パッケージ管理**、npm）を学びます。
Node.js には、古い CommonJS と新しい ES Modules の2つのモジュールの仕組みがあり、今でも両方が使われています。また、npm で入れたパッケージは、あなたの Mac の中で、あなたの権限で動きます。仕組みを知らずに使うと、「なぜか import できない」「昨日は動いたのに」「入れただけで何かが実行された」に悩まされます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第11〜13章、第1部 第2章（mise と Node.js）、第1部 第1章（`~/dev` を作業用に使う理由） |
| この章のゴール | ES Modules と CommonJS の違いを説明し、混ぜて使える / モジュールの名前がどのファイルになるかを説明できる / `package.json` の主な項目（`type`・`exports`・`imports`・`scripts`・`dependencies`・`files`・`engines`）を書ける / semver の範囲を読める / ロックファイルと `npm ci` の役割を説明できる / 依存パッケージの危険を知り、調べられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`try/`・`my-app/`）と、ES Modules・CommonJS・その混ぜ方・モジュールの解決・npm scripts を確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part03/ch14-modules-npm/` で実行します（第11章で第3部のフォルダを `~/dev/part03` にコピーしてあります）。
>
>   ```sh
>   $ cd ~/dev/part03/ch14-modules-npm
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/try/` と `samples/my-app/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - サンプルを動かすときに `cd samples/esm` のように別のフォルダへ移ったら、終わった後で `cd ~/dev/part03/ch14-modules-npm` で戻ってください。
> - 7節と練習問題の一部では、`npm install` でインターネットからパッケージを入れます。入る場所は `~/dev/part03` の中なので、教材のフォルダは汚れません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `import`・`export`（2節） | これから書くすべてのファイル。第4部でサーバを複数のファイルに分けるとき |
| CommonJS と、その混ぜ方（3〜4節） | 古いパッケージや記事を読むとき。第5部で Express（CommonJS のパッケージ）を import するとき |
| `package.json` と `npm install`（6〜7節） | 第5部の Express、第6部のデータベースのドライバ、第8部の React など、パッケージを使うすべての場面 |
| ロックファイルと `npm ci`（9節） | 第11部の CI、第12部の本番へのデプロイ |
| npm scripts（10節） | 第5部以降の `npm start`・`npm test`・`npm run dev` |
| 依存パッケージの危険（12節） | 第10部（安全）、第11部（Dependabot と `npm audit`） |

> npm の表示は、この教材の作成時の Node.js 26.13・npm 11.20 のものです。npm は Node.js より速く変わるので、表示や既定の動きが違うときは、`npm help <コマンド>` と公式のドキュメント（参考資料）で確かめてください。

---

## 1. なぜモジュールに分けるのか

1つのファイルに何千行も書くと、どこで何が定義されているか分からなくなり、名前もぶつかります。**モジュール**は「1つのファイル = 1つのまとまり」で、次の性質を持ちます。

- ファイルの中で宣言した変数や関数は、そのファイルの中だけで見える（ファイルごとのスコープ）
- 外に見せたいものだけを **export** し、使う側は **import** する
- 何度 import しても、ファイルは**1回だけ**評価され、結果が使い回される

Python のモジュール（`import os`、`from flask import Flask`）とほぼ同じ考え方です。違いは、Python では「ファイルの中の名前は、`_` で始めない限りすべて外から見える」のに対し、JavaScript では「`export` したものだけが見える」ことです。

## 2. ES Modules

**ES Modules**（ESM）は、JavaScript の言語の仕様（ECMAScript）で決められたモジュールの仕組みです。ブラウザでも Node.js でも同じ書き方で動きます。この教材のコードは、すべて ES Modules で書いています。

### 2.1 export と import

```js
// counter.mjs
export let count = 0;                 // 名前付きの export
export function increment() { count++; }
const VERSION = '1.0.0';
export { VERSION };                   // まとめて export
export default function describe() {  // default export（1つのモジュールに1つ）
  return `count は ${count}`;
}
```

```js
// main.mjs
import describe, { count, increment, VERSION } from './counter.mjs';
import * as counter from './counter.mjs';   // 名前空間 import（すべてをオブジェクトとして受け取る）
```

**手を動かす**: `greet.mjs` と `use-greet.mjs` の2つのファイルを作ります（完成形は [samples/try/](samples/try/)）。

```js
// greet.mjs
export const DEFAULT_NAME = 'alice';

export function greet(name = DEFAULT_NAME) {
  return `こんにちは、${name}さん`;
}

export default function shout(text) {
  return `${text}！`;
}
```

```js
// use-greet.mjs
import shout, { greet, DEFAULT_NAME } from './greet.mjs';

console.log(greet());
console.log(shout(greet('bob')));
console.log('既定の名前:', DEFAULT_NAME);
```

```sh
$ node use-greet.mjs
こんにちは、aliceさん
こんにちは、bobさん！
既定の名前: alice
```

`{ }` の中は名前付きの export を、`{ }` の外（`shout`）は default export を受け取ります。`use-greet.mjs` の `import` を `import { greet, nothing } from './greet.mjs';` に変えて実行すると、「`greet.mjs` は `nothing` を export していない」という `SyntaxError` になります。export していない名前は使えないことを確かめたら、元に戻してください。

もっと多くの書き方を確かめるサンプルです（中身は読まなくてよい）。

```sh
$ cd samples/esm
$ node main.mjs
  [counter.mjs] 評価された（何回 import されても、これは1回だけ）
1. import した値: { count: 0, VERSION: '1.0.0' }
2. increment() を2回呼んだ後の count: 2 / 2 / count は 2
3. 代入しようとすると: TypeError - Assignment to constant variable.
4. resetCount() の後: 0
5. import.meta.url     : …/samples/esm/main.mjs
   import.meta.filename: …/samples/esm/main.mjs
   import.meta.dirname : …/samples/esm
6. 動的に読み込んだ node:path の export の数: 18
```

ここから分かる ES Modules の性質です。

- **ライブバインディング**: import した `count` は、値のコピーではなく、元のモジュールの変数を覗く「窓」です。`increment()` で元の `count` が変わると、import した側の `count` も変わります（2）
- **読み取り専用**: import した名前には代入できません（3）。変えたいなら、元のモジュールに関数を用意します
- **`import` は先に処理される**: `import` の文は、ファイルのどこに書いても、ファイルの中のコードを実行する**前に**すべて処理されます（`counter.mjs` の表示が、`main.mjs` の最初の `console.log` より先に出ています）
- **拡張子は省略できない**: `'./counter'` ではなく `'./counter.mjs'` と書きます。ブラウザの ES Modules と同じく、名前は URL のように扱われるからです

### 2.2 import.meta と、ファイルの場所

ES Modules には `__dirname` や `__filename` がありません。代わりに `import.meta` を使います（5）。

| 書き方 | 中身 | 使える Node.js |
| --- | --- | --- |
| `import.meta.url` | `file:///Users/.../main.mjs`（URL） | すべて |
| `import.meta.filename` | `/Users/.../main.mjs`（パス） | 20.11 以降 |
| `import.meta.dirname` | `/Users/.../samples/esm`（フォルダのパス） | 20.11 以降 |

第2部で決めたとおり、パスが欲しいときは `new URL(..., import.meta.url).pathname` ではなく、`import.meta.dirname` か `fileURLToPath` を使います（日本語のフォルダ名がパーセントエンコードされるため）。

### 2.3 動的 import とトップレベル await

`import()`（関数のように呼ぶ import）は、**実行中に**、必要になってからモジュールを読み込み、Promise を返します（6）。名前を変数で決めたいとき、めったに使わない重いモジュールを後で読みたいときに使います。

ES Modules では、関数の外でも `await` を書けます（**トップレベル await**）。ただし、トップレベル await を使うモジュールを import した側は、その完了を待つことになります。

## 3. CommonJS

**CommonJS**（CJS）は、ES Modules が言語に入る前から Node.js が使ってきた仕組みです。古いパッケージや、古い書き方の記事では、こちらをよく見ます。

```js
// counter.cjs
let count = 0;
module.exports = { count, increment() { count++; }, getCount() { return count; } };

// main.cjs
const counter = require('./counter.cjs');
```

**手を動かす**: 2.1節の `greet.mjs` を、CommonJS で書き直します。`greet.cjs` と `use-greet.cjs` を作ってください（完成形は [samples/try/](samples/try/)）。

```js
// greet.cjs
const DEFAULT_NAME = 'alice';

function greet(name = DEFAULT_NAME) {
  return `こんにちは、${name}さん`;
}

function shout(text) {
  return `${text}！`;
}

module.exports = { DEFAULT_NAME, greet, shout };
```

```js
// use-greet.cjs
const { greet, shout } = require('./greet.cjs');

console.log(greet());
console.log(shout(greet('bob')));
console.log('__dirname:', __dirname);
```

```sh
$ node use-greet.cjs
こんにちは、aliceさん
こんにちは、bobさん！
__dirname: /Users/alice/dev/part03/ch14-modules-npm
```

`export` の代わりに最後の `module.exports = { ... }` で外に見せ、`import` の代わりに `require(...)` で受け取ります。`__dirname`（このファイルのあるフォルダ）は、CommonJS では最初から使えます。

もっと多くの性質を確かめるサンプルです（中身は読まなくてよい）。

```sh
$ cd samples/cjs
$ node main.cjs
  [counter.cjs] 評価された
1. 2回 require したものは同じオブジェクト: true
2. increment() を2回呼んだ後: counter.count = 0 / getCount() = 2
3. require('node:path') の export の数: 17
4. このファイルを包んでいる関数の引数の数: 5
   __filename: …/samples/cjs/main.cjs
   __dirname : …/samples/cjs
5. require.cache に入っているファイル: [ '…/samples/cjs/main.cjs', '…/samples/cjs/counter.cjs' ]
```

- **`require` はただの関数**です。`if` の中でも呼べ、呼んだ時点で同期的にファイルを読んで実行します
- `module.exports` に入れたものが、`require` の戻り値になります。`count` は**その時点の値がコピー**されるので、後で変わっても `counter.count` は 0 のままです（2）。ES Modules のライブバインディングとの大きな違いです
- Node.js は、CommonJS のファイルを `(function (exports, require, module, __filename, __dirname) { ... })` という関数で包んでから実行します（4）。`__dirname` などが使えるのは、この引数だからです
- 1回読んだモジュールは `require.cache` に入り、2回目からは同じオブジェクトが返ります（1、5）

| | ES Modules | CommonJS |
| --- | --- | --- |
| 書き方 | `import` / `export` | `require()` / `module.exports` |
| 読み込み | 先にすべて読んでから実行。非同期でもよい | `require` を呼んだときに同期で |
| export した値 | ライブバインディング | その時点の値（オブジェクトなら参照） |
| 拡張子の省略 | できない | できる（`.js`・`.json`・`.node` を探す） |
| トップレベル await | 使える | 使えない |
| `this`（一番外側） | `undefined` | `module.exports` |
| 厳格モード（strict mode） | いつも | `'use strict'` と書いたときだけ |
| ブラウザ | 動く | 動かない（バンドラが必要。第8部） |

新しく書くコードは ES Modules にします。CommonJS は「読めればよい」ものです。

## 4. ES Modules と CommonJS を混ぜる

### 4.1 どちらとして扱うか

Node.js は、ファイルがどちらの形式かを、次の順で決めます。

| ファイル | 扱い |
| --- | --- |
| `.mjs` | いつも ES Modules |
| `.cjs` | いつも CommonJS |
| `.js` | 一番近い `package.json` の `"type"` が `"module"` なら ES Modules、`"commonjs"` か書いていなければ CommonJS |

`"type"` が無いとき、Node.js 22.7 以降は、`.js` の中身に `import` や `export` があれば ES Modules として読み直します（構文の検出）。ただし、一度失敗してから読み直すので少し遅く、警告が出ることもあります。`"type"` はいつも書くようにしてください。

執筆時点の npm（11.x）の `npm init -y` は、`"type": "commonjs"` を書き込みます。ES Modules で書くなら、`"type": "module"` に直すのを忘れないでください。

### 4.2 ES Modules から CommonJS を読む

**手を動かす**: ES Modules から、3節の `greet.cjs` を import してみます。`mix.mjs` を作って実行してください（完成形は [samples/try/mix.mjs](samples/try/mix.mjs)）。

```js
// mix.mjs
import greetCjs from './greet.cjs';
import { greet } from './greet.cjs';

console.log(greetCjs);
console.log(greet('carol'));
```

```sh
$ node mix.mjs
{
  DEFAULT_NAME: 'alice',
  greet: [Function: greet],
  shout: [Function: shout]
}
こんにちは、carolさん
```

default（`greetCjs`）には `module.exports` のオブジェクトがそのまま入り、名前付き（`{ greet }`）でも取り出せました。

次のサンプルで、取り出せない場合も確かめます（中身は読まなくてよい）。

```sh
$ cd samples/interop
$ node from-esm.mjs
1. default（module.exports そのもの）: { add: [Function (anonymous)], PI: 3.14, secret: 'computed' }
2. 名前付きで import した add(1, 2): 3 / PI: 3.14
3. 名前付きで取れる名前: [ 'PI', 'add', 'default', 'module.exports' ]
4. secret は default から取る: computed
5. createRequire で JSON を読む: { message: 'require で読んだ JSON' }
```

- `import x from './legacy.cjs'` の `x`（default）は、`module.exports` そのものです。これはいつでも使えます
- 名前付きの import（`{ add }`）ができるのは、Node.js が**ファイルを実行せずに**ソースを読み、`exports.add = ...` のような形を見つけられた名前だけです（3）。`Object.assign(exports, ...)` のように、実行してみないと分からない名前は取れません（4）
- ES Modules の中で `require` が必要なら、`createRequire(import.meta.url)` で作れます（5）

### 4.3 CommonJS から ES Modules を読む

```sh
$ node from-cjs.cjs
1. require した ES Modules: [Module: null prototype] {
  __esModule: true,
  default: { kind: 'default export のオブジェクト' },
  greet: [Function: greet]
}
   名前付きの export: こんにちは、aliceさん
   default export   : { kind: 'default export のオブジェクト' }
2. トップレベル await を使うものを require すると: ERR_REQUIRE_ASYNC_MODULE
3. 動的 import なら読める: true
```

長い間、CommonJS から ES Modules は `import()`（動的 import）でしか読めませんでした。`require` は同期で、ES Modules は非同期に読み込めるように作られていたからです。Node.js 20.19・22.12 以降では、**トップレベル await を使っていない** ES Modules なら `require` で読めるようになりました（**require(esm)**。最初は実験的な機能として警告が出ていました）。

これにより、「パッケージを ES Modules だけで公開すると、CommonJS の利用者が困る」という長年の問題が、ほぼ解決しました。

## 5. モジュールの名前が、どのファイルになるか

`import x from '名前'` の「名前」（**指定子**、specifier）は、3種類に分かれます。

| 種類 | 例 | どこを探すか |
| --- | --- | --- |
| 相対・絶対 | `'./a.mjs'`、`'../lib/b.mjs'`、`'/abs/c.mjs'` | そのファイルからの相対パス |
| 組み込み | `'node:fs'`、`'node:path'` | Node.js の中 |
| パッケージ名（bare specifier） | `'iconv-lite'`、`'tldts'`、`'kana-lib/romaji'` | `node_modules` |

### 5.1 node: を付ける理由

`'fs'` と書いても組み込みの `fs` が読まれますが、`'node:fs'` と書けば「npm のパッケージではなく組み込みのもの」と一目で分かります。npm に同じ名前の（悪意のある）パッケージがあっても取り違えません。新しい組み込みモジュール（`node:test`、`node:sqlite` など）は `node:` 付きでしか読めません。

### 5.2 node_modules を探す

パッケージ名は、import したファイルのフォルダから**上に向かって**、`node_modules/パッケージ名` を探します。

```
~/dev/part03/ch14-modules-npm/my-app/src/app.mjs で import 'ms' と書くと:
  ~/dev/part03/ch14-modules-npm/my-app/src/node_modules/ms   ← 無い
  ~/dev/part03/ch14-modules-npm/my-app/node_modules/ms       ← あった！
  （無ければ ~/dev/part03/ch14-modules-npm/node_modules/ms、~/dev/part03/node_modules/ms … と / まで）
```

（`my-app` は、7節の「手を動かす」で作るフォルダです。）

Python の `pip install` がパッケージを「その Python 環境（venv）」に入れるのに対し、npm は「**そのプロジェクトのフォルダ**」の `node_modules` に入れます。venv を作って有効にする、という手順が要らない代わりに、プロジェクトごとに `node_modules` ができます。

### 5.3 package.json の exports

パッケージのフォルダが見つかったら、Node.js はその `package.json` の **`exports`** を見て、どのファイルを読むかを決めます。

```json
{
  "name": "tiny-lib",
  "type": "module",
  "exports": {
    ".": {
      "import": "./index.mjs",
      "require": "./index.cjs"
    },
    "./utils": "./lib/utils.mjs",
    "./package.json": "./package.json"
  }
}
```

```sh
$ cd samples/resolve
$ node app.mjs
1. import した tiny-lib     : ES Modules 版（exports の "import" の条件で選ばれた）
   require した tiny-lib    : CommonJS 版（exports の "require" の条件で選ばれた）
2. tiny-lib/utils の shout  : HELLO!
3. #config の appName       : resolve-demo
4. それぞれの名前が指すファイル（import.meta.resolve）:
   tiny-lib               → …/samples/resolve/node_modules/tiny-lib/index.mjs
   tiny-lib/utils         → …/samples/resolve/node_modules/tiny-lib/lib/utils.mjs
   tiny-lib/package.json  → …/samples/resolve/node_modules/tiny-lib/package.json
   #config                → …/samples/resolve/src/config.mjs
   node:fs                → node:fs
   ./app.mjs              → …/samples/resolve/app.mjs
5. exports に無いものは、ファイルがあっても読めない:
   tiny-lib/lib/internal.mjs  → ERR_PACKAGE_PATH_NOT_EXPORTED
   tiny-lib/index.mjs         → ERR_PACKAGE_PATH_NOT_EXPORTED
   no-such-lib                → ERR_MODULE_NOT_FOUND
```

- `"."` はパッケージ名だけで import したとき、`"./utils"` は `tiny-lib/utils` で import したときに読むファイルです
- `"import"`・`"require"` のような**条件**で、読み込み方によってファイルを変えられます（ほかに `"node"`、`"browser"`、`"default"` など）
- **`exports` に書いていないファイルは、外から読めません**（5）。パッケージの作者は「ここまでが公開の入り口で、中の構成は自由に変えてよい」と決められます

`exports` が無い古いパッケージでは、`"main"` に書いたファイルが入り口になり、中のファイルも自由に読めます。

`import.meta.resolve(名前)` を使うと、その名前がどのファイルになるかを、読み込まずに調べられます（4）。「なぜか違うファイルが読まれる」ときの調べ方として覚えておいてください。

> `samples/resolve/node_modules/tiny-lib` は、説明のために**手で書いた**パッケージです。npm install したものではありません。普通は `node_modules` を Git に入れませんが、教材のリポジトリでは、この2つ（`samples/resolve/node_modules` と `samples/scripts-demo/node_modules`）だけは `.gitignore` の例外にして、Git に入れています。

### 5.4 package.json の imports

`"imports"` は、**自分のパッケージの中だけで使う別名**です。名前は `#` で始めます。

```json
"imports": { "#config": "./src/config.mjs" }
```

`import { appName } from '#config'` と書けば、どのフォルダのファイルからでも同じ名前で読めます（3）。`'../../../src/config.mjs'` のような長い相対パスを書かずに済み、ファイルを動かしても `package.json` を直すだけで済みます。

## 6. package.json

`package.json` は、プロジェクト（パッケージ）の説明書です。Python の `pyproject.toml`（や `requirements.txt`）にあたります。

```json
{
  "name": "ch14-packages",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.mjs",
    "test": "node --test"
  },
  "dependencies": {
    "iconv-lite": "^0.7.3"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  },
  "engines": {
    "node": ">=24"
  }
}
```

| 項目 | 意味 |
| --- | --- |
| `name`・`version` | パッケージの名前とバージョン。公開しないアプリでも書いておく |
| `private` | `true` なら、間違えて `npm publish` しても公開されない。アプリには必ず付ける |
| `type` | `.js` を ES Modules にするか（4.1節） |
| `scripts` | `npm run 名前` で実行するコマンド（10節） |
| `dependencies` | 動かすのに必要なパッケージ |
| `devDependencies` | 開発のときだけ必要なパッケージ（テスト、リンター、ビルドの道具）。`npm install --save-dev` で入れる |
| `exports`・`imports` | 外に見せる入り口、内部の別名（5節） |
| `files` | `npm publish` するときにパッケージに入れるファイル（練習問題9） |
| `engines` | 動く Node.js のバージョン。npm は合わないと警告を出す |
| `bin` | `npm install -g` や `npm link` で使えるコマンドにするファイル（第16章） |

## 7. npm install と node_modules

### 7.1 何が起きるか

**手を動かす**: 小さなアプリ `my-app` を作り、時間の書き方を変換するパッケージ **ms** を入れて使います（完成形は [samples/my-app/](samples/my-app/)）。

1. フォルダを作って移り、`package.json` を作ります。

   ```sh
   $ mkdir my-app
   $ cd my-app
   ```

   VS Code で `my-app/package.json` を作り、次のように書きます（6節の表のうち、最低限のもの）。

   ```json
   {
     "name": "my-app",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "start": "node app.mjs"
     }
   }
   ```

2. ms をインストールします。

   ```sh
   $ npm install ms
   added 1 package, and audited 2 packages in 1s

   found 0 vulnerabilities
   ```

   `package.json` を開き直すと、`"dependencies": { "ms": "^2.1.3" }` が足されています。`package-lock.json` と `node_modules/ms` もできました（`ls` で確かめる）。

3. `app.mjs` を作り、ms を import して使います。

   ```js
   import ms from 'ms';

   console.log('2日は', ms('2 days'), 'ミリ秒');
   console.log('60000ミリ秒は', ms(60_000));
   ```

4. `scripts` の `start` で実行します（10節）。

   ```sh
   $ npm start

   > my-app@1.0.0 start
   > node app.mjs

   2日は 172800000 ミリ秒
   60000ミリ秒は 1m
   ```

終わったら `cd ..` で `ch14-modules-npm` に戻ります。`npm install` のとき、裏では次のことが起きています。

1. **レジストリ**（`https://registry.npmjs.org/`）に、`iconv-lite` のバージョンの一覧を問い合わせる
2. `package.json` の範囲（8節の semver）を満たす一番新しいバージョンを選ぶ。そのパッケージが依存するパッケージも、同じように選ぶ
3. 圧縮されたファイル（tarball）をダウンロードし、ハッシュ（`integrity`）を確かめて、`node_modules` に展開する
4. `package.json` の `dependencies` に追記し、選んだバージョンをすべて `package-lock.json` に書く

ms は他のパッケージに依存しないので「added 1 package」でした。依存するパッケージがあるものを入れると、頼んだより多く入ります。たとえば練習問題5の iconv-lite は「added 2 packages」で、iconv-lite が依存している `safer-buffer` も入ります。

### 7.2 node_modules の形

npm は、依存の依存も、できるだけ `node_modules` の**一番上**に平らに並べます（hoisting、巻き上げ）。同じパッケージの違うバージョンが必要になったときだけ、`node_modules/debug/node_modules/ms` のように入れ子にします（練習問題7）。

`node_modules` は、`package.json` と `package-lock.json` があればいつでも作り直せます。Git に入れず（`.gitignore` に書く）、OneDrive などの同期フォルダにも置きません（何万ものファイルができることがあり、同期が追いつかなくなるため）。この教材で npm を使う練習を `~/dev` の下でするのは、そのためでもあります。

## 8. semver: バージョンの番号の決まり

npm のパッケージは、**semver**（セマンティック バージョニング）でバージョンを付ける決まりです。

```
  1 . 4 . 2 - beta.1
  │   │   │    └ プレリリース（正式版の前の版）
  │   │   └ patch: バグを直した（使い方は変わらない）
  │   └ minor: 機能を足した（今までの使い方はそのまま使える）
  └ major: 使い方が変わった（今までのコードが動かなくなるかもしれない）
```

`package.json` の `dependencies` には、バージョンそのものではなく、**受け入れるバージョンの範囲**を書きます。

| 書き方 | 意味 | `1.4.2` の場合に受け入れるもの |
| --- | --- | --- |
| `1.4.2` | ちょうどその版 | `1.4.2` だけ |
| `^1.4.2` | major を変えない（npm install の既定） | `1.4.2` 以上 `2.0.0` 未満 |
| `~1.4.2` | minor を変えない | `1.4.2` 以上 `1.5.0` 未満 |
| `>=1.4.2 <1.6.0` | 範囲を直接書く | |
| `1.x`、`1` | major が 1 なら何でも | `1.0.0` 以上 `2.0.0` 未満 |
| `*` | 何でも | |

注意が2つあります。

- **0.x は特別**です。`0.y.z` は「まだ開発中で、minor が変わると使い方が変わるかもしれない」という意味なので、`^0.7.3` は `0.7.3` 以上 **`0.8.0` 未満**、`^0.0.3` は `0.0.3` だけになります（一番左の 0 でない数字を変えない）
- **プレリリースは、明示しない限り入らない**: `^1.2.3` は `1.3.0-beta` を受け入れません。不安定かもしれない版が、勝手に入らないようにするためです

semver は「作者がそう約束する」決まりで、守られる保証はありません。patch の更新でも動かなくなることはあります。だからこそ、次のロックファイルが必要です。

## 9. ロックファイルと npm ci

`package.json` の `^1.4.2` は範囲なので、今日 `npm install` すると `1.4.2`、来月なら `1.7.0` が入るかもしれません。自分の Mac と、同僚の Mac と、本番のサーバで、違うバージョンが入ってしまいます。

**`package-lock.json`**（ロックファイル）は、実際に入れたバージョンを、依存の依存まで**すべて**記録します。

```json
"node_modules/ms": {
  "version": "2.0.0",
  "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
  "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
  "license": "MIT"
}
```

| コマンド | 動き | いつ使うか |
| --- | --- | --- |
| `npm install` | `package.json` を満たすようにインストールし、必要ならロックファイルを**更新する** | パッケージを足す・消す・更新するとき |
| `npm ci` | ロックファイルの**とおりに**インストールする。`node_modules` を消してから入れ直す。`package.json` と食い違っていたら**エラーで止まる** | CI（第11部）、本番、他人のプロジェクトを動かすとき |

- `package-lock.json` は **Git に入れます**。これが無いと、「同じコード」でも入るものが変わります
- `integrity` のハッシュで、ダウンロードしたものが記録と同じかを確かめます。途中で中身を差し替えられても気付けます
- 更新したいときは、`npm outdated` で新しい版を調べ、`npm update`（範囲の中で更新）か `npm install パッケージ@版`（範囲を変える）を使い、テストしてからロックファイルごとコミットします

Python では、`pip freeze > requirements.txt` で同じようなことをしますが、依存の依存の扱いや、ハッシュの確認は道具（pip-tools、Poetry、uv など）によって違います。npm は、この仕組みが最初から入っています。

## 10. npm scripts と npx

### 10.1 npm run

`package.json` の `scripts` に書いたコマンドは、`npm run 名前` で実行できます。

7.1節の `my-app` の `npm start` も、`scripts` の `start` を実行していました。次のサンプルで、`scripts` のいろいろな使い方を確かめます（中身は読まなくてよい）。

```sh
$ cd samples/scripts-demo
$ npm run build
> scripts-demo@0.3.0 prebuild
> echo '[prebuild] build の前に自動で実行される'
[prebuild] build の前に自動で実行される
> scripts-demo@0.3.0 build
...
$ npm run args -- --name alice -v      # -- の後ろは、スクリプトにそのまま渡される
process.argv.slice(2): [ '--name', 'alice', '-v' ]
$ npm run path
…/samples/scripts-demo/node_modules/.bin
…/samples/node_modules/.bin
…/ch14-modules-npm/node_modules/.bin
```

- `pre名前`・`post名前` のスクリプトは、前後に自動で実行されます
- 実行中は、`node_modules/.bin`（とその上のフォルダの `.bin`）が `PATH` の先頭に足されます。プロジェクトに入れた道具（`eslint` など）を、グローバルにインストールしなくても名前だけで呼べるのはこのためです
- `npm_package_name`・`npm_lifecycle_event` などの環境変数が渡されます（`npm run hello`）
- `start`・`test` などいくつかの名前は、`npm start`・`npm test` のように `run` を省略できます
- スクリプトが失敗すると（終了コードが 0 以外）、npm も失敗の終了コードで終わります（`npm run fail`）

### 10.2 npx

**`npx 名前`** は、`node_modules/.bin` にあるコマンドを実行します。無ければ、レジストリから**ダウンロードして**実行します（`npm exec` と同じ）。一度きりの道具を試すのに便利ですが、名前を打ち間違えると、**似た名前の知らないパッケージ**をダウンロードして実行してしまうかもしれません。初めて使う道具は、名前とページを確かめてから実行してください。npx は、ダウンロードする前に確認を求めます。

## 11. グローバルインストールと sudo

`npm install -g パッケージ` は、プロジェクトではなく、Node.js 全体（グローバル）にパッケージを入れ、コマンドとして使えるようにします。

第1部（第1章8.3節、第2章）で書いたとおり、**`sudo npm install -g` はしてはいけません**。

- `sudo` で実行すると、パッケージの install スクリプト（12.2節）が**管理者の権限で**動きます。Mac のどこでも書き換えられます
- できたファイルの持ち主が root になり、後で `sudo` 無しでは更新も削除もできなくなります

mise で入れた Node.js は、自分のホームフォルダの下（`~/.local/share/mise/installs/node/...`）にあるので、そもそも `sudo` は要りません。「Permission denied」が出たら、`sudo` を付けるのではなく、`which node` で Homebrew や公式のインストーラの Node.js を使っていないか確かめてください。

ただし、mise で入れた Node.js のグローバルは**バージョンごと**です。Node.js のバージョンを上げると、グローバルに入れたものは見えなくなります。グローバルに入れるのは本当に全体で使う道具だけにし、プロジェクトで使う道具は `devDependencies` に入れて `npm run` か `npx` で呼ぶのが基本です。自分で作ったコマンドを試すには `npm link` を使います（第16章）。

## 12. 依存パッケージの危険

npm のパッケージは、誰でも公開できます。そして、あなたが入れたパッケージは、**あなたの Mac の中で、あなたと同じ権限で**動きます。`~/.ssh` の鍵も、`.env` のトークンも読めます。

### 12.1 何が起きうるか

| 起きること | 例 |
| --- | --- |
| 脆弱性（バグ） | 入力によってプロトタイプ汚染（第11章）が起きる、ReDoS（第13章）でサーバが止まる |
| 名前のすり替え（typosquatting） | `cross-env` のつもりで `crossenv` を入れる。有名なパッケージに似た名前で、悪意のあるコードを公開する |
| 乗っ取り | 有名なパッケージの作者のアカウントが乗っ取られ、悪意のある版が公開される |
| install スクリプト | `npm install` しただけで、パッケージの `preinstall`・`postinstall` のコマンドが実行される |

### 12.2 install スクリプト

パッケージの `package.json` に `"postinstall": "node setup.js"` のような scripts があると、`npm install` の途中で実行されます。本来は、C で書かれた部品をビルドするといった正当な用途のための仕組みですが、悪意のあるパッケージにとっては「インストールさせるだけで実行できる」入り口になります。

執筆時点の npm（11.20）では、install スクリプトを持つパッケージを見つけると警告を出し、`package.json` の `allowScripts` で、どのパッケージに実行を許すかを記録できます（`npm install-scripts ls`・`approve`・`deny`）。`--strict-allow-scripts` を付けると、許していないものがあればインストールを止めます。`--ignore-scripts`（または `.npmrc` に `ignore-scripts=true`）なら、すべての install スクリプトを実行しません。これらの機能や既定の動きは npm のバージョンで変わってきているので、使う前に `npm help install` で確かめてください。練習問題7で実際に試します。

### 12.3 守り方

- **入れる前に調べる**: npm のページで、週ごとのダウンロード数、最後の更新、リポジトリ、作者、依存の数を見る。名前のつづりを確かめる
- **入れすぎない**: 数行で書けるものにパッケージを使わない。依存は依存を連れてくる（`npm ls --all` で数えてみる）
- **ロックファイルを Git に入れ、差分を見る**: 知らないパッケージが増えていないか
- **`npm audit`** で、既知の脆弱性を調べる。`npm audit fix` は範囲の中で直せるものを直す。`--force` は major を上げることがあるので、テストしてから
- **CI と本番では `npm ci`** を使う（ロックファイルにないものを入れない）
- **秘密の情報を、パッケージやリポジトリに入れない**（練習問題9の `.env`）

第10部で、依存パッケージの安全をもう一度扱います。

## 13. Python（pip・venv）との対応

| やりたいこと | Python | Node.js（npm） |
| --- | --- | --- |
| プロジェクトの説明書 | `pyproject.toml` | `package.json` |
| パッケージを入れる場所 | venv（`.venv/lib/python3.x/site-packages`） | プロジェクトの `node_modules` |
| 環境を有効にする | `source .venv/bin/activate` | 不要（フォルダを上に探す） |
| 入れる | `pip install requests` | `npm install iconv-lite` |
| 開発用だけ | `pip install -e '.[dev]'`、`[project.optional-dependencies]` など | `npm install --save-dev eslint` |
| 実際のバージョンを固定 | `requirements.txt`（`pip freeze`）、`poetry.lock`、`uv.lock` | `package-lock.json` |
| 固定どおりに入れる | `pip install -r requirements.txt`、`uv sync` など | `npm ci` |
| コマンドを実行 | `python -m pytest` | `npm test`、`npx eslint` |
| 同じパッケージの2つの版 | 1つの環境に1つの版だけ | 入れ子にして、両方を入れられる |
| 公開先 | PyPI | npm レジストリ |

## まとめ

- 新しいコードは ES Modules で書く。`import`/`export`、拡張子は省略しない、export した値はライブバインディング。パスは `import.meta.dirname` で。
- CommonJS（`require`/`module.exports`）は古いパッケージで見る。ES Modules から import でき、Node.js 20.19・22.12 以降は CommonJS からも（トップレベル await の無い）ES Modules を require できる。
- `.mjs`・`.cjs` は拡張子で、`.js` は `package.json` の `"type"` で形式が決まる。`"type"` はいつも書く。
- パッケージ名は `node_modules` を上に向かって探し、`exports` で入り口が決まる。`exports` に無いファイルは読めない。内部の別名は `imports`（`#名前`）。
- `dependencies` には semver の範囲を書く。`^` は major を変えない。0.x とプレリリースは特別。
- `package-lock.json` を Git に入れ、CI や本番では `npm ci` で、記録どおりに入れる。
- パッケージは自分の権限で動く。入れる前に調べ、入れすぎず、`npm audit` し、install スクリプトに気を付ける。`sudo npm install -g` はしない。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用3問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js「Modules: ECMAScript modules」: https://nodejs.org/api/esm.html
- Node.js「Modules: CommonJS modules」（require(esm) を含む）: https://nodejs.org/api/modules.html
- Node.js「Modules: Packages」（`type`・`exports`・`imports`）: https://nodejs.org/api/packages.html
- MDN「JavaScript モジュール」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Modules
- npm Docs「package.json」: https://docs.npmjs.com/cli/configuring-npm/package-json
- npm Docs「package-lock.json」: https://docs.npmjs.com/cli/configuring-npm/package-lock-json
- npm Docs「npm ci」: https://docs.npmjs.com/cli/commands/npm-ci
- npm Docs「scripts」: https://docs.npmjs.com/cli/using-npm/scripts
- npm Docs「npm audit」: https://docs.npmjs.com/cli/commands/npm-audit
- Semantic Versioning 2.0.0（日本語）: https://semver.org/lang/ja/
- npm の semver の範囲の書き方（node-semver）: https://github.com/npm/node-semver#ranges

前の章: [第13章 イベントループ](../ch13-event-loop/README.md) ／ 次の章: [第15章 Node.js の標準 API](../ch15-node-api/README.md)
