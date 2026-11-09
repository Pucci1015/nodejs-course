# 第14章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- |
| 1 | 循環する import を予想する（ES Modules と CommonJS） | [cycle-esm/](cycle-esm/)、[cycle-cjs/](cycle-cjs/) | 2, 3 |
| 2 | semver の判定を自分で作る | [semver.mjs](semver.mjs)、[semver.test.mjs](semver.test.mjs) | 8 |
| 3 | iconv-lite で Shift_JIS の CSV を変換する | [setup-ch14.sh](setup-ch14.sh)、[convert.mjs](convert.mjs)、[check-convert.sh](check-convert.sh) | 4, 7, 9 |
| 4 | tldts でサイトを判定する（第2部 第9章の続き） | [site.mjs](site.mjs)、[site.test.mjs](site.test.mjs) | 5, 7 |
| 5 | 公開するパッケージの package.json を整える | [kana-lib/](kana-lib/)、[check-kana-lib.sh](check-kana-lib.sh) | 5, 6, 12 |
| 6 | 依存関係を調べ、危険に気付く | [setup-ch14.sh](setup-ch14.sh) で作る `~/dev/ch14/deps` | 7, 9, 12 |

問題3・4・6 は npm でパッケージを入れるので、教材のフォルダ（OneDrive）ではなく `~/dev/ch14` で作業します。最初に1回だけ、練習用のフォルダを作ってください。

```sh
$ bash setup-ch14.sh          # ~/dev/ch14 を作る（既にあれば何もしない）
作りました: /Users/ryota/dev/ch14
  deps/README.md
  ...
```

npm のレジストリに接続するので、インターネットにつながっている必要があります。

---

## 問題1 循環する import を予想する

`a` が `b` を import し、`b` が `a` を import する、という**循環**は、大きなプロジェクトでは知らないうちに起きます。[cycle-esm/](cycle-esm/) と [cycle-cjs/](cycle-cjs/) には、同じ形の循環を ES Modules と CommonJS で書いたものがあります。

それぞれのファイルを読んで、**実行する前に**表示される行を予想してください。その後で実行して確かめます。

```sh
$ node cycle-esm/main.mjs
$ node cycle-cjs/main.cjs
```

次の問いに答えてください。

1. ES Modules 版で、`main: 始まり` が最初に表示されないのはなぜか
2. ES Modules 版で、`b.mjs` の中の `getB` は使えるのに、`a` は使えない（`ReferenceError`）のはなぜか。`a.mjs` の `export const a` を `export var a` にしたら、何が表示されるか
3. CommonJS 版で、`b.cjs` が受け取った `a` は空のオブジェクトだった。なぜか。また、最後の `main:` の行では、なぜ正しい値が表示されるのか
4. CommonJS 版の最後に出る警告は、何を教えてくれているのか
5. 循環を無くすには、どう直せばよいか（一般的な方法を1つ）

## 問題2 semver の判定を自分で作る

npm は、`package.json` の範囲（`^1.2.3` など）を満たすバージョンを選ぶのに、`semver` というパッケージを使っています。その中心の部分を、[semver.mjs](semver.mjs) に自分で作ってください。npm の semver パッケージは使いません。

- **`parse(version)`**: `"1.2.3-beta.1+build"` を `{ major: 1, minor: 2, patch: 3, prerelease: ['beta', 1] }` にする。先頭の `v` は許し、`+` 以降（ビルドメタデータ）は捨てる。数字だけの識別子は数にする。正しくなければ `null`（`01.2.3` のような先頭の 0 もだめ）
- **`compare(a, b)`**: `-1`・`0`・`1` を返す。数字は数として比べる。プレリリースの比べ方は semver.org の決まりのとおり（下のヒント）
- **`satisfies(version, range)`**: 本文8節の表の書き方に加えて、`>`・`>=`・`<`・`<=`・`=`、スペースで区切った AND（`>=1.2.3 <1.3.0`）、`||` の OR、ハイフン（`1.2.3 - 2.3.4`）、省略（`^1.2`、`~1`、`>1`、`<=1.2`）に対応する
- **プレリリースの決まり**: プレリリースのバージョン（`1.2.4-beta`）は、範囲の同じ組の中に、**同じ major.minor.patch のプレリリース**が書かれているときだけ満たす（`^1.2.3-beta.1` は `1.2.3-beta.2` を満たすが、`1.2.4-beta` は満たさない）
- **`maxSatisfying(versions, range)`**: 範囲を満たす一番新しいもの。無ければ `null`

```sh
$ node --test semver.test.mjs
ℹ pass 14
ℹ fail 0
```

テストの期待する値は、npm の semver パッケージの結果と同じにしてあります。

ヒント:

- プレリリースの比べ方: プレリリースの無い方が大きい（`1.0.0-rc.1 < 1.0.0`）。`.` で区切った識別子を左から比べ、数字どうしは数として、文字どうしは ASCII の順で比べ、数字は文字より小さい。全部同じなら、識別子の少ない方が小さい（`alpha < alpha.1`）
- 範囲は、まず「比較の組」に直すと考えやすくなります。たとえば `^1.2.3` は `>=1.2.3 <2.0.0-0`、`~1.2` は `>=1.2.0 <1.3.0-0`、`1.x` は `>=1.0.0 <2.0.0-0` です。上の境目が `2.0.0` ではなく `2.0.0-0`（`2.0.0` のどのプレリリースよりも小さい版）なのはなぜか、考えてみてください
- `^` は「一番左の 0 でない数字を変えない」です。`^0.2.3` と `^0.0.3` に注意

## 問題3 iconv-lite で Shift_JIS の CSV を変換する

第2部 第7章で、Node.js だけでは Shift_JIS を**書けない**ことを見ました。そこで予告したとおり、iconv-lite を使って、Windows の Excel と CSV をやり取りする CLI を作ります。

```sh
$ cd ~/dev/ch14/packages
$ cp <この教材>/part03-js-node-basics/ch14-modules-npm/exercises/convert.mjs .
$ npm install iconv-lite
```

`npm install` の後で、`package.json`・`package-lock.json`・`node_modules` を見て、次の問いに答えてください。

1. `package.json` の `dependencies` には何が書かれたか。その範囲は、どのバージョンまでを受け入れるか（本文8節の「0.x は特別」）
2. `node_modules` には、iconv-lite のほかに何が入ったか。それはなぜか（`npm ls --all`、`npm explain パッケージ名`）
3. iconv-lite は ES Modules か CommonJS か（iconv-lite の `package.json` を見る）。`import iconv from 'iconv-lite'` と書けるのはなぜか（本文4.2節）

次に、[convert.mjs](convert.mjs) を完成させてください。

- `node convert.mjs to-utf8 入力 出力`: Shift_JIS の CSV を UTF-8 にする。改行は LF にする。BOM は付けない
- `node convert.mjs to-sjis 入力 出力`: UTF-8 の CSV を Shift_JIS にする（Windows の Excel で開くため）
  - 入力の先頭に BOM があれば取る。改行は CRLF にする
  - Mac で打つと出る `〜`（U+301C）は `～`（U+FF5E）に、`−`（U+2212）は `－`（U+FF0D）に置き換える
  - それでも Shift_JIS にできない文字があれば、**すべて**を「`3行目 1文字目: 𠮷（U+20BB7）は Shift_JIS にできません`」の形で標準エラー出力に書き、終了コード 1 で終わる。出力ファイルは作らない
- 出力先のフォルダが無ければ作る

```sh
$ node convert.mjs to-utf8 data/members-sjis.csv out/members.csv
$ node convert.mjs to-sjis data/order-utf8.csv out/order.csv
3行目 1文字目: 𠮷（U+20BB7）は Shift_JIS にできません
$ echo $?
1
$ bash <この教材>/part03-js-node-basics/ch14-modules-npm/exercises/check-convert.sh ~/dev/ch14/packages
[OK] 1. to-utf8 が成功する（終了コード 0）
...
すべて成功しました
```

ヒント:

- Windows の「Shift_JIS」は、正確には Microsoft が広げた **CP932**（Windows-31J）です。`①` や `髙` は CP932 にしかありません。iconv-lite に渡す名前を確かめてください
- iconv-lite は、表せない文字を**黙って `?` にします**。どう見分ければよいでしょうか
- `𠮷` は、JavaScript の文字列では2つ分（サロゲートペア）です。「1文字目」と数えるには（第11章1節）

最後に、`package-lock.json` を残したまま `node_modules` を消し、`npm ci` で作り直してください。`npm install` との違いを、本文9節の言葉で説明します。

## 問題4 tldts でサイトを判定する

第2部 第9章の練習問題6では、Public Suffix List のごく一部を自分で持って `sameSite` を作りました。そのとき「実際のアプリでは、一覧を更新し続けているライブラリを使う」と書きました。ここでは、そのライブラリ **tldts** を使います。

```sh
$ cd ~/dev/ch14/packages
$ cp <この教材>/part03-js-node-basics/ch14-modules-npm/exercises/site.mjs .
$ npm install tldts
```

[site.mjs](site.mjs) の2つの関数を、tldts を使って完成させてください。

- `registrableDomain(url)`: URL の登録できるドメイン。IP アドレスと `localhost` は、ホスト名そのもの（IPv6 は `[` `]` を外す）。URL として読めなければ `TypeError`
- `sameSite(a, b)`: スキームと登録できるドメインが同じなら `true`

テストは、この `exercises` フォルダから、`~/dev` の `site.mjs` を指定して実行します。

```sh
$ MODULE=~/dev/ch14/packages/site.mjs node --test site.test.mjs
ℹ pass 6
ℹ fail 0
```

`site.mjs` の中の `import ... from 'tldts'` は、テストのファイルの場所ではなく、`site.mjs` のある `~/dev/ch14/packages` から `node_modules` を探します（本文5.2節）。

できたら、次の問いに答えてください。

1. tldts の `getDomain('alice.github.io')` を、オプション無しで呼ぶと何が返るか。テストの「github.io」の項目を通すには何が必要だったか。その違いは、Public Suffix List のどの部分の違いか（tldts の README と、https://publicsuffix.org/list/ を見る）
2. 第2部 第9章の模範解答（`part02-web-basics/ch09-browser/solutions/origin.mjs`）の `sameSite` は、`https://www.city.kawasaki.jp` と `https://www.kawasaki.jp` をどう判定するか。tldts ではどうか。どちらが正しいか
3. tldts のバージョンを上げずに1年使い続けると、どんな問題が起きうるか。それに気付くには、どのコマンドを使うか

## 問題5 公開するパッケージの package.json を整える

[kana-lib/](kana-lib/) は、ひらがな・カタカナ・ローマ字を変換する小さなライブラリです。npm に公開する前の状態ですが、`package.json` に問題があります（実際に公開はしません）。

まず、今の状態を確かめてください。

```sh
$ cd kana-lib
$ npm test                  # 5個のテストがすべて失敗する
$ npm pack --dry-run        # 公開したら、パッケージに入るファイルの一覧（何も作らず、公開もしない）
```

`npm pack --dry-run` の一覧に、入っていてはいけないものが入っていることを確かめてください。

次の要件を満たすように、`package.json` と `src/` の import を直してください。

- `import ... from 'kana-lib'` で `src/index.mjs`、`'kana-lib/romaji'` で `src/romaji.mjs` を読める
- `'kana-lib/package.json'` は読める（バージョンを調べる道具のため）
- それ以外（`src/internal/table.mjs` など）は、パッケージの外から読めない
- CommonJS から `require('kana-lib')` でも使える
- `src/` の中で `internal/table.mjs` を読むときは、相対パスではなく `#table` という名前で読む
- 公開するパッケージに入るのは、`src/` の `.mjs` と、`README.md`・`LICENSE`・`package.json` だけ
- require(esm) が使える Node.js（22.12 以降）でしか動かないことを書く

```sh
$ cd ..
$ bash check-kana-lib.sh
[OK] 1. npm test（自己参照の import・require・exports で隠す）がすべて通る
...
すべて成功しました
```

直す前は、7個すべてが失敗します。

ヒント: `test/kana.test.mjs` は、パッケージの中から自分の名前（`kana-lib`）で import しています。これは**自己参照**と呼ばれ、`package.json` に `exports` があるときだけ使えます。

考えてみよう: パッケージに入れるファイルを決める方法には、入れるものを書く `files`（許可リスト）と、入れないものを書く `.npmignore`（拒否リスト）があります。`.env` のような秘密の情報を守るには、どちらが安全でしょうか。

## 問題6 依存関係を調べ、危険に気付く

`~/dev/ch14/deps` の `package.json` には、わざと問題のある依存パッケージを入れてあります。**`npm install` する前に** `package.json` と `local/hello-postinstall/` の中身を読んでから、インストールしてください。

```sh
$ cd ~/dev/ch14/deps
$ cat package.json local/hello-postinstall/package.json local/hello-postinstall/postinstall.cjs
$ npm install
```

次の問いに、コマンドの出力を根拠にして答えてください。

1. **install スクリプト**: `npm install` の後、フォルダに `POSTINSTALL-RAN.txt` はできたか。npm はどんな警告を出したか。`node_modules` と `POSTINSTALL-RAN.txt` を消して、`npm ci --ignore-scripts` と `npm ci --strict-allow-scripts` でそれぞれ試すと、どうなるか
2. **許可の記録**: `npm install-scripts ls` で何が表示されるか。`npm install-scripts approve hello-postinstall` を実行すると、`package.json` はどう変わるか。チームで開発するとき、この記録を Git に入れる意味は何か
3. **入れ子**: `npm ls --all` を実行する。`ms` が2つの版で入っているのはなぜか。それぞれ `node_modules` のどこにあるか（`npm explain ms`）
4. **ロックファイル**: `package-lock.json` の `node_modules/ms` の項目にある `resolved` と `integrity` は何のためにあるか
5. **脆弱性**: `npm audit` は何を報告するか。`npm audit fix`（`--force` なし）で直らないのはなぜか。どう直すのが安全か
6. **食い違い**: `package.json` の `dependencies` に `"kleur": "^4.1.0"` を手で書き足し、`npm install` をせずに `npm ci` を実行すると、どうなるか。それが CI で役に立つのはなぜか（試した後、書き足した行は消してください）
7. **古さ**: `npm outdated` は何を表示するか。終了コードは何か（`echo $?`）

最後に、自分がこれから npm でパッケージを入れるときに「入れる前に確かめること」を、5つ以上の箇条書きにまとめてください。
