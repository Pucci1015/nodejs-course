# 第14章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル・フォルダ | 内容 |
| --- | --- |
| [semver.mjs](semver.mjs) | 問題2: `parse`・`compare`・`satisfies`・`maxSatisfying` |
| [convert.mjs](convert.mjs) | 問題3: iconv-lite で Shift_JIS（CP932）と UTF-8 を変換する CLI |
| [site.mjs](site.mjs) | 問題4: tldts でサイトを判定する |
| [kana-lib/](kana-lib/) | 問題5: `package.json` を整えた kana-lib |

確かめ方です。`convert.mjs` と `site.mjs` は、パッケージを入れた `~/dev/ch14/packages` にコピーしてから実行します（この solutions フォルダには `node_modules` が無いため）。

```sh
$ cd ../exercises
$ MODULE=../solutions/semver.mjs node --test semver.test.mjs
$ cp ../solutions/convert.mjs ../solutions/site.mjs ~/dev/ch14/packages/   # 自分の解答を上書きするので注意
$ bash check-convert.sh ~/dev/ch14/packages
$ MODULE=~/dev/ch14/packages/site.mjs node --test site.test.mjs
$ bash check-kana-lib.sh ../solutions/kana-lib
```

---

## 問題1 循環する import を予想する

```
$ node cycle-esm/main.mjs
b: 評価中。getB は function
a: 評価中。b = B の値 / getA() = ReferenceError: Cannot access 'a' before initialization
main: 始まり
main: A の値 B の値

$ node cycle-cjs/main.cjs
main: 始まり
b: 評価中。a のキー [] / a.getB は undefined
a: 評価中。b.b = B の値 / b.getA() = undefined
main: A の値 B の値
(node:4678) Warning: Accessing non-existent property 'getB' of module exports inside circular dependency
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4678) Warning: Accessing non-existent property 'a' of module exports inside circular dependency
```

1. ES Modules では、`import` の文がファイルのどこにあっても、ファイルの中のコードより**先に**、import するモジュールをすべて評価します。`main.mjs` は `a.mjs` を、`a.mjs` は `b.mjs` を import するので、評価の順は「`b.mjs` → `a.mjs` → `main.mjs`」です。`main.mjs` の `console.log('main: 始まり')` は最後です。（`b.mjs` は `a.mjs` を import していますが、`a.mjs` は既に「評価中」なので、もう一度は評価しません。）
2. ES Modules は、評価する前に、すべてのモジュールの export の「名前」を結び付けておきます（ライブバインディング）。`b.mjs` が評価される時点で、`a.mjs` はまだ1行も実行されていません。
   - `function getB() {}` は**関数の宣言**なので、巻き上げ（第11章2節）で、評価の前から使えます
   - `const a` は、宣言の行が実行されるまで TDZ（第11章2節）なので、`ReferenceError` になります
   - `export var a` にすると、`var` は巻き上げで `undefined` になっているので、エラーにならずに **`getA() = undefined`** と表示されます。エラーよりも気付きにくいので、かえって危険です
3. CommonJS の `require` は、呼んだ時点で同期的にファイルを実行します。`a.cjs` の1行目で `b.cjs` を require し、`b.cjs` の1行目で `a.cjs` を require すると、`a.cjs` は**実行の途中**（まだ1行目）なので、その時点の `module.exports`、つまり**空のオブジェクト**が返ります。ただし、返されたのは「後で中身が入るオブジェクトそのもの」なので、`a.cjs` の実行が終わった後（`main:` の行）では、`a.a` も `a.getB` も入っています。
4. 「循環している途中で、まだ入っていないプロパティを読んだ」という警告です。Node.js が、ありがちなバグを教えてくれています。
5. 一般的な直し方は、**お互いが使っている部分を、3つ目のモジュールに切り出す**ことです（`a` と `b` の両方が `c` を import し、`a` と `b` はお互いを import しない）。どうしても循環が残るときは、トップレベルで値を使わず、関数の中で（呼ばれたときに）使うようにします。

## 問題2 semver の判定を自分で作る

[semver.mjs](semver.mjs) を見てください。考え方は、ファイルの先頭のコメントのとおり、「範囲を比較の組に直してから判定する」です。

```
"^1.2.3 || >=2.0.0-beta <3"
  → [ [ ['>=', '1.2.3'], ['<', '2.0.0-0'] ],         ← 1つ目の組
      [ ['>=', '2.0.0-beta'], ['<', '3.0.0-0'] ] ]   ← 2つ目の組（どちらかを満たせばよい）
```

つまずきやすい所です。

- **数字を文字として比べない**: `'10' < '9'` は `true` です（文字の比較）。`Number` にしてから比べます
- **`^` の 0**: `^0.2.3` は `<0.3.0-0`、`^0.0.3` は `<0.0.4-0` です。「一番左の 0 でない数字」で場合分けします。`^0.x` のように minor が省略されたときは `<1.0.0-0` です
- **上の境目が `-0` なのはなぜか**: `<2.0.0` と書くと、`2.0.0-beta` は `2.0.0` より小さいので、範囲に入ってしまいます。`2.0.0-0` は、`2.0.0` のどのプレリリースよりも小さい版なので、`<2.0.0-0` で「2.0.0 の系列は、プレリリースも含めて入れない」という意味になります
- **プレリリースの決まり**: 範囲を直すときに自分で足した `-0` の境目は、「範囲を書いた人がプレリリースを書いた」ことにはなりません。模範解答では、自分で足した比較に3つ目の要素 `true` を付けて見分けています。これを忘れると、`^1.2.3` が `1.3.0-beta` を受け入れてしまいます
- **省略のある比較**: `>1` は「1.x より大きい」、つまり `>=2.0.0-0` です。`<=1.2` は「1.2.x 以下」、つまり `<1.3.0-0` です。表にして整理すると間違えにくくなります
- **`" >= 1.2.3"` のような空白**: 演算子とバージョンの間の空白を先に消してから、空白で区切ります

模範解答は、作成時に npm の semver パッケージ（7.8）と、約2000通りの組み合わせで同じ結果になることを確かめました。それでも、本物の semver には、`includePrerelease` などのオプション、`1.2.3 - *` のような書き方、`coerce` など、ここで作らなかった機能がたくさんあります。**自分で作れることと、自分で作ったものを使うべきかは別**です。実際のアプリでは、たくさんの人が使い、テストされている semver パッケージを使います。

## 問題3 iconv-lite で Shift_JIS の CSV を変換する

### インストールの問い

1. `"iconv-lite": "^0.7.3"` のように書かれます（作成時の最新）。0.x なので、受け入れるのは `0.7.3` 以上 **`0.8.0` 未満**です。0.8.0 は「使い方が変わったかもしれない版」として扱われ、自動では入りません。
2. **safer-buffer** が入ります。iconv-lite の `package.json` の `dependencies` に `"safer-buffer": ">= 2.1.2 < 3.0.0"` と書かれているからです（`npm explain safer-buffer` で「iconv-lite から依存されている」と表示されます）。
3. iconv-lite の `package.json` には `"type"` が無く、`"main": "./lib/index.js"` なので **CommonJS** です。ES Modules から CommonJS を import すると、default は `module.exports` そのものになるので、`import iconv from 'iconv-lite'` と書いて `iconv.encode` などを使えます（本文4.2節）。

### convert.mjs

[convert.mjs](convert.mjs) を見てください。ポイントです。

- **`'cp932'` を使う**: `'shift_jis'` でも、作成時の iconv-lite では `①` や `髙` を変換できましたが、Windows の Excel が使うのは CP932 なので、名前でもそれをはっきりさせています
- **表せない文字の見つけ方**: iconv-lite は、表せない文字を `?`（0x3F）にします。元の CSV に本物の `?` があるかもしれないので、「出力に `?` があるか」では見分けられません。模範解答は、**1文字ずつ「変換して、戻して、同じになるか」**を確かめています
- **文字の数え方**: `line.length` や `line[i]` は UTF-16 の単位なので、`𠮷` が2つに数えられます。`Array.from(line)` は文字（コードポイント）ごとに分けるので、「1文字目」と正しく数えられます（第11章1節）
- **改行**: いったん `\r\n` を `\n` にそろえてから `\r\n` にします。そうしないと、元が CRLF のファイルが `\r\r\n` になります
- **失敗したら書かない**: 全部を変換し終えてから書きます。途中で失敗したときに、半分だけのファイルが残らないようにするためです（書き込みの途中で失敗したときの対策は第15章で扱います）

`〜` の問題は、Mac（Unicode の WAVE DASH、U+301C）と Windows（CP932 の 0x8160 を FULLWIDTH TILDE、U+FF5E として扱う）で、**同じ見た目の文字に違う番号が付いている**ことから起きます。日本語の CSV をやり取りするシステムで、昔から何度も問題になってきました。

### npm ci

`npm ci` は、`node_modules` を消してから、`package-lock.json` に書かれた版を、そのまま入れます。`package.json` の範囲から新しい版を選び直すことはありません。`npm install` は、ロックファイルがあればそれを使いますが、`package.json` と合わなければロックファイルを書き換えます。「誰がいつ実行しても同じものが入る」のは `npm ci` の方です。

## 問題4 tldts でサイトを判定する

[site.mjs](site.mjs) を見てください。

1. オプション無しの `getDomain('alice.github.io')` は **`'github.io'`** を返します。Public Suffix List には、ICANN（ドメインを管理する団体）が決めた接尾辞（`com`、`co.jp` など）の部分と、会社などが自分で登録した **PRIVATE** の部分（`github.io`、`s3.amazonaws.com`、`blogspot.com` など）があり、tldts は既定では ICANN の部分だけを使います。ブラウザは PRIVATE の部分も使って Cookie やサイトを判断するので、ブラウザと同じ判定にするには **`allowPrivateDomains: true`** が必要です。
2. 第2部の `origin.mjs` は、`kawasaki.jp` の決まりを知らないので、どちらも登録できるドメインを `kawasaki.jp` と判断し、**同じサイト**と答えます。tldts は、`*.kawasaki.jp`（その下はすべて公開の接尾辞）と、例外の `!city.kawasaki.jp` を知っているので、`www.city.kawasaki.jp` は `city.kawasaki.jp`、`www.kawasaki.jp` は `www.kawasaki.jp` を登録できるドメインとし、**別のサイト**と答えます。tldts が正しいです。
3. Public Suffix List は今も更新されています。古い版の tldts は、新しく追加された接尾辞（新しいホスティングサービスなど）を知らないので、**別の人のサイトを同じサイトと判断**し、Cookie やアクセスの制御で穴になります。`npm outdated` で新しい版があるかを調べ、更新します。GitHub の Dependabot のような、更新を知らせてくれる仕組み（第11部）も使えます。

## 問題5 公開するパッケージの package.json を整える

[kana-lib/package.json](kana-lib/package.json) を見てください。

```json
"exports": {
  ".": "./src/index.mjs",
  "./romaji": "./src/romaji.mjs",
  "./package.json": "./package.json"
},
"imports": {
  "#table": "./src/internal/table.mjs"
},
"files": ["src/**/*.mjs"],
"engines": { "node": ">=22.12.0" },
```

- **`exports`** で、外から読める入り口を3つに限りました。これで `kana-lib/src/internal/table.mjs` は `ERR_PACKAGE_PATH_NOT_EXPORTED` になり、自己参照（`import 'kana-lib'`）も使えるようになります
- **`require('kana-lib')`** は、`exports` に `"require"` の条件を書かなくても動きます。`src/index.mjs` はトップレベル await を使っていないので、require(esm) で読めるからです。そのため `engines` で 22.12 以上に限っています（20.19 以降の 20.x でも動きますが、ここでは簡単にしています）
- **`imports`** の `#table` を、`src/index.mjs` と `src/romaji.mjs` で使います（`// 修正:` のコメント）
- **`files`** は、パッケージに入れるものの**許可リスト**です。`README.md`・`LICENSE`・`package.json` は、書かなくてもいつも入ります。`"src/"` と書くと `src/README.md` まで入ってしまうので、`"src/**/*.mjs"` にしています
- 元の `"main"` は消しました。`exports` があれば、Node.js は `main` を見ません（`exports` を知らない古い道具のために残すこともあります）

直す前の `npm pack --dry-run` には、`.env`・`notes/memo.md`・`test/kana.test.mjs` が入っていました。npm は、`.env` を**自動では除いてくれません**（`.git` や `node_modules` などは除きます）。`npm publish` していたら、トークンが世界中に公開されていました。

「考えてみよう」の答え: **`files`（許可リスト）の方が安全**です。`.npmignore`（拒否リスト）では、新しく作ったファイル（`.env.local`、`secret.json` など）を書き忘れると、そのまま公開されます。許可リストなら、書き忘れたファイルは「入らない」側に倒れます。公開する前に、いつも `npm pack --dry-run` で中身を確かめる習慣も付けてください。

## 問題6 依存関係を調べ、危険に気付く

作成時（npm 11.20）の結果です。npm の表示は変わることがあります。

**1. install スクリプト**

`npm install` の後、`POSTINSTALL-RAN.txt` が**できました**。つまり、`hello-postinstall` の `postinstall` は実行されました。npm は次の警告を出しました。

```
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   hello-postinstall@1.0.0 (postinstall: node postinstall.cjs)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
```

- `npm ci --ignore-scripts`: インストールは成功し、`POSTINSTALL-RAN.txt` は**できません**
- `npm ci --strict-allow-scripts`: 許可していない install スクリプトがあるので、`ESTRICTALLOWSCRIPTS` のエラーで**インストールが止まります**

つまり、執筆時点の npm の既定は「警告はするが、実行する」です。悪意のあるパッケージなら、警告が出た時点で、もう実行されています。

**2. 許可の記録**

`npm install-scripts ls` は、まだ許可も拒否もしていない install スクリプトを一覧にします。`approve` すると、`package.json` に次のような項目が足されます（キーの書き方は、パッケージの入手元によって変わります）。

```json
"allowScripts": {
  "file:../local/hello-postinstall": true
}
```

これを Git に入れると、「このプロジェクトでは、どのパッケージの install スクリプトを、誰が確かめて許したか」がチームで共有され、レビューの対象になります。CI で `--strict-allow-scripts` を使えば、誰かが知らないうちに install スクリプトのあるパッケージを足したときに、CI が止まって気付けます。

**3. 入れ子**

```
ch14-deps@1.0.0
├─┬ debug@4.4.3
│ └── ms@2.1.3
├── hello-postinstall@1.0.0 -> ./local/hello-postinstall
├── minimist@1.2.5
└── ms@2.0.0
```

自分の `package.json` は `ms@2.0.0` を、`debug@4` は `ms@^2.1.3` を求めています。1つの版では両方を満たせないので、npm は一番上の `node_modules/ms` に 2.0.0 を置き、`debug` 専用に `node_modules/debug/node_modules/ms` に 2.1.3 を置きます。`debug` の中の `require('ms')` は、`debug` のフォルダから上に探すので（本文5.2節）、先に自分の `node_modules` の 2.1.3 を見つけます。Python の venv では、1つの環境に同じパッケージの版は1つしか入れられないので、こうはできません。

**4. resolved と integrity**

`resolved` は、どこからダウンロードしたか（tarball の URL）、`integrity` は、その中身の SHA-512 のハッシュです。`npm ci` は、ダウンロードしたものが `integrity` と一致するかを確かめます。レジストリや通信の途中で中身が差し替えられても、ハッシュが合わないので気付けます。

**5. 脆弱性**

`npm audit` は、`minimist 1.0.0 - 1.2.5` に **critical**（最も深刻）な**プロトタイプ汚染**の脆弱性があると報告します。`npm audit fix` は、`package.json` の範囲の中でしか版を変えません。`"minimist": "1.2.5"` と版を1つに固定しているので、範囲の中に直った版がなく、直せません（`--force` なら範囲の外の 1.2.8 を入れますが、それが major の更新だと、使い方が変わっているかもしれません）。安全な直し方は、直った版を調べて（`npm view minimist versions`、変更履歴）、`npm install minimist@^1.2.8` のように自分で範囲を変え、テストしてからロックファイルごとコミットすることです。

**6. 食い違い**

```
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Missing: kleur@4.1.5 from lock file
```

`npm ci` は、ロックファイルを書き換えずに**止まります**。CI でこうなれば、「`package.json` を変えたのにロックファイルをコミットし忘れた」ことにすぐ気付けます。もし CI で `npm install` を使っていたら、CI がその場で新しい版を選んでしまい、手元とは違うものでテストすることになります。

**7. 古さ**

```
Package   Current  Wanted  Latest  Location               Depended by
minimist    1.2.5   1.2.5   1.2.8  node_modules/minimist  deps
ms          2.0.0   2.0.0   2.1.3  node_modules/ms        deps
```

`Current` は今入っている版、`Wanted` は `package.json` の範囲の中で一番新しい版、`Latest` はレジストリの最新です。古いものがあると、終了コードは **1** になります（CI で「古いものがあれば知らせる」に使えます）。

**入れる前に確かめること**（例）

- 名前のつづりが正しいか（似た名前の別のパッケージではないか）
- npm のページとリポジトリが、本当にその作者・組織のものか
- 週ごとのダウンロード数、最後の更新日、未解決の issue
- 依存の数（`npm view パッケージ dependencies`）。入れると何個増えるか
- install スクリプトがあるか（`npm view パッケージ scripts`）。あれば、何をしているか
- ライセンスが、自分の使い方で問題ないか
- 本当にパッケージが必要か（数行で書けないか、Node.js の標準の機能で足りないか）
