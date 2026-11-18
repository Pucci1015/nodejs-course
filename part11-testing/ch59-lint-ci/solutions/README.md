# 第59章 模範解答

問題文は [../exercises/README.md](../exercises/README.md) です。確かめるときは、`exercises` のフォルダで打ちます。

| 問題 | 解答のファイル | 確かめ方（`exercises` で） |
| --- | --- | --- |
| 1 | [lint-me/lint-me.ts](lint-me/lint-me.ts) | `MODULE=../solutions/lint-me/lint-me.ts node --test lint-me.test.ts` |
| 2 | [config-practice/eslint.config.js](config-practice/eslint.config.js) | `MODULE=../solutions/config-practice/eslint.config.js node --test config-practice.test.ts` |
| 3 | [ci.yml](ci.yml) | `MODULE=../solutions/ci.yml node --test ci.test.ts` |
| 4 | この README | |
| 5 | [rules/prefer-role-query.ts](rules/prefer-role-query.ts) | `MODULE=../solutions/rules/prefer-role-query.ts node --test prefer-role-query.test.ts` |
| 6 | [ci-full.yml](ci-full.yml) | `MODULE=../solutions/ci-full.yml node --test ci-full.test.ts` |
| 7 | [annotate.ts](annotate.ts) | `MODULE=../solutions/annotate.ts node --test annotate.test.ts` |
| 8 | [rules/no-fixed-wait.ts](rules/no-fixed-wait.ts) | `MODULE=../solutions/rules/no-fixed-wait.ts node --test no-fixed-wait.test.ts` |

どの解答も、執筆の環境（Node.js 24.22、ESLint 10.13.0）で、テストがすべて通ることを確かめました。直した所には `// 修正:`、足した所には `// 追加:` のコメントがあります。

---

## 問題1 ESLint の指摘を、ルールを止めずに直す

```sh
$ MODULE=../solutions/lint-me/lint-me.ts node --test lint-me.test.ts
…
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

| 指摘 | 直し方 | なぜ |
| --- | --- | --- |
| `regexp/no-super-linear-backtracking`・`no-unused-capturing-group` | `/^([a-z]+)*-\d+$/` → `/^[a-z]+-\d+$/` | `([a-z]+)*` は `aaaa` を何通りにも分けられ、合わない文字列で時間がかかる（ReDoS）。しかも `*` は0回でもよいので、`-24` にも合ってしまう（テストの `isTag('-24')` が `true` になる）。1回だけの `[a-z]+` で足りる |
| `eqeqeq` | `== null` → `=== null` | `== null` は `undefined` にも合う。型は `number \| null` なので、`=== null` で意味は変わらない |
| `no-unused-vars` | `unused` を消す | 使わない変数は、書きかけか消し忘れ |
| `no-unsafe-return` | `z.array(MemberSchema).parse(JSON.parse(text))` | `JSON.parse` は `any` を返す。そのまま返すと、形の違う値が `Member[]` として出ていく（第7部 第38章）。`MemberSchema` はひな形で書いてあったのに使っていなかった |
| `require-await`・`no-floating-promises` | `fetch(…)` に `await` を付ける | 待たないと、送り終わる前に関数が終わり、失敗が呼んだ側に届かない（テストの `assert.rejects` が失敗する） |

つまずきやすい所:

- `no-floating-promises` を `void fetch(…)` で消すこともできますが、それは「待たなくてよい」と宣言する書き方です。この関数は「送り終わるまで待つ」ので、`await` が正しい直し方です。指摘を消すことではなく、**指摘の理由**を直します。
- `isTag` の正規表現を `/^[a-z]*-\d+$/` にすると、ReDoS は消えますが、`-24` に合ってしまいます。ESLint はそこまでは見ないので、動きはテストで確かめます。

## 問題2 場所ごとに決まりを変える ESLint の設定

```sh
$ MODULE=../solutions/config-practice/eslint.config.js node --test config-practice.test.ts
…
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

設定のオブジェクトを3つ並べます（本文 2.4節）。

| オブジェクト | 役割 |
| --- | --- |
| `{ ignores: ['generated/**'] }` | `files` の無い `ignores` だけのものは、全体から外す |
| `{ files: ['**/*.js'], extends, languageOptions, rules }` | すべての `.js` の決まり |
| `{ files: ['scripts/**'], rules: { 'no-console': 'off' } }` | 後ろに書いたので、前の `'error'` に勝つ |

つまずきやすい所:

- `ignores` を、2つ目のオブジェクト（`files` のあるもの）の中に書いても、このテストは通ります。その書き方は「このオブジェクトの決まりを、`generated/` には当てない」の意味で、`generated/api.js` に当てる設定が1つも無くなるので、結果として lint されません。ただし、後で `files` の広い設定（`**/*` など）を足すと、また lint され始めます。「全体から外す」と決めたものは、`ignores` だけのオブジェクトに書くほうが、意図がはっきりします。
- `scripts/` のオブジェクトを2つ目より**前**に書くと、後ろの `'no-console': 'error'` が勝ち、`scripts/seed.js` に指摘が出ます。
- `globals` を書かないと、`console` が `no-undef`（error）になります。`no-console` を止めた `scripts/seed.js` でも、`no-undef` は残ります。

## 問題3 GitHub Actions のワークフロー

```sh
$ MODULE=../solutions/ci.yml node --test ci.test.ts
…
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

本文 7.2節の見本から、`concurrency` と `npm audit` を除いた形です。

つまずきやすい所:

- `on:` の下の `pull_request:` は、値を書かずに `:` で終わります。YAML では、これは「値が `null` のキー」で、GitHub は「すべてのプルリクエスト」と読みます。
- `node-version: 24` は数、`node-version: '24'` は文字列です。GitHub はどちらでも動きますが、テストは数で比べています。
- インデントにタブを使うと、YAML として読めません。

## 問題4 考えて答える

### 問1 warning と終了コード

```sh
$ npx eslint a.js
…/a.js
  1:5  warning  'a' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
$ echo $?
0
$ npx eslint a.js --max-warnings 0
…
ESLint found too many warnings (maximum: 0).
$ echo $?
1
```

1. **0**（成功）。warning は、終了コードを変えません。
2. **1**。`--max-warnings 0` は「warning が 0 個より多ければ失敗」の意味です。
3. CI では `--max-warnings 0` を付けます。付けないと、warning は CI を止めないので、誰も直さずに増えていき、大事な warning が埋もれます（本文 2.3節）。

### 問2 && と ;

1. `&&` の書き方では、`lint` が失敗した所で止まるので、テストは**動きません**。`;` の書き方では、前の結果にかかわらず次を動かすので、テストは**動きます**。
2. `&&` では 0 以外（`lint` の失敗の終了コード）。`;` では、**最後のコマンド（`npm test`）の終了コード**になるので、テストが通れば 0 です。
3. lint が失敗しているのに、`npm run check` が 0 で終わるので、CI が**緑（成功）**になります。失敗を見逃します。CI は終了コードだけを見ます（本文6節）。

### 問3 ESLint と Prettier がぶつかると

執筆の環境で、`.prettierrc.json` が `{ "singleQuote": true }`、ESLint の設定が `quotes: ['error', 'double']` で確かめました。

```sh
$ npx prettier --write a.js
$ npx eslint a.js
…/a.js
  1:18  error  Strings must use doublequote  quotes
$ npx eslint a.js --fix
$ cat a.js
export const s = "a";
$ npx prettier --check a.js
[warn] a.js
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

1. Prettier が `'` にした文字列を、ESLint が error にします。
2. ESLint が `"` に直した文字列を、Prettier が「整っていない」とします。片方を直すともう片方が失敗し、`npm run check` がいつまでも通りません。
3. `eslint-config-prettier` は、見た目のルールを `off` にする設定です。設定は**後に書いたものほど強い**ので、最後に置くと、前のおすすめの設定が on にした見た目のルールを、確実に off にできます。途中に置くと、後ろの設定がまた on にすることがあります（本文 5.2節）。なお、この問いのように自分の `rules` に書いたルールは、`extends` より強いので、`eslint-config-prettier` でも止まりません。見た目のルールは、自分でも書かないようにします。

### 問4 CI のあれこれ

1. `npm ci` は、`package-lock.json` のとおりの版を入れ、`package.json` と食い違えば失敗します。始める前に `node_modules` を消すので、前の残りに左右されません。`npm install` は、範囲の中で版を選び直し、ロックファイルを書き換えることがあります（第3部 第14章）。CI では「手元と同じものを入れたか」を確かめたいので `npm ci` です。
2. npm がダウンロードしたパッケージを置いておく場所（`~/.npm`）を覚えておきます。`node_modules` ではありません。キーは `package-lock.json` の中身から作られるので、ロックファイルが変わらない間は、次の実行でダウンロードを省けます（`npm ci` は、それでも `node_modules` を毎回作り直します）。
3. `GITHUB_TOKEN` に、リポジトリの設定（Settings → Actions → General の Workflow permissions）の既定の権限が付きます。古いリポジトリや組織の設定によっては、書き込みの権限が付いていることがあり、ワークフローの中で動くもの（依存パッケージの install scripts など）にその権限を使われる恐れがあります。必要な権限だけを書いておけば、設定に左右されません（本文 7.2節）。

## 問題5 `…ByTestId` を見つける ESLint のルール

```sh
$ MODULE=../solutions/rules/prefer-role-query.ts node --test prefer-role-query.test.ts
…
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

`callee` が `Identifier` なら名前そのもの、`MemberExpression` なら `property` を、名前の部品（`target`）として取り出し、正規表現で調べます。`context.report` の `node` を `target` にしたので、`screen.getByTestId(…)` では 8 文字目（`getByTestId` の所）が指摘されます。

つまずきやすい所:

- `Identifier` を見るルール（`Identifier(node) { … }`）にすると、`const getByTestId = 1;` の変数の名前まで指摘してしまいます。**呼び出し**（`CallExpression`）から始めます。
- 名前を `name.endsWith('ByTestId')` で調べても、テストは通ります。正規表現にすると、`getByTestIdOrRole` のような名前を確実に外せて、どの名前を指摘するかが一目で分かります。
- `callee.property.type === 'Identifier'` を確かめないと、`obj['getByTestId']()` のような書き方（`property` が `Literal`）で `name` が無く、型のエラーになります。

## 問題6 PostgreSQL と E2E のジョブを足したワークフロー

```sh
$ MODULE=../solutions/ci-full.yml node --test ci-full.test.ts
…
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

本文 7.3節の2つの部品（`services` と `needs`）を組み合わせた形です。

つまずきやすい所:

- `ports` の `'5433:5432'` は、引用符で囲みます。YAML 1.1 の読み方をする道具では、`'22:22'` のように `:` で区切った数（後ろが 60 未満）が、60進数の1つの数として読まれることがあります。ポートの組は、いつも引用符で囲む、と決めておくと安全です（Docker Compose の説明も同じことを勧めています）。
- `options: >-` は、「次の行から、改行を空白にしてつなげた1つの文字列」の意味です（YAML の折り返し）。`--health-cmd pg_isready` などを、読みやすく行に分けて書けます。
- `if: failure()` が無いと、前の手順が失敗した時点でジョブが止まり、アップロードの手順は動きません。「失敗したときだけ動かす」には、`if: failure()` が要ります。

## 問題7 ESLint の結果を、GitHub の注釈に変える

```sh
$ MODULE=../solutions/annotate.ts node --test annotate.test.ts
…
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

問題1のひな形で動かした結果です（執筆の環境で確かめました。ESLint の文の最後には `.` が付きます）。

```sh
$ node ../solutions/annotate.ts eslint.json
::error file=lint-me/lint-me.ts,line=14,col=15,title=regexp/no-unused-capturing-group::Capturing group number 1 is defined but never used.
::error file=lint-me/lint-me.ts,line=14,col=16,title=regexp/no-super-linear-backtracking::This quantifier can reach itself via the loop '([a-z]+)*'. …
::error file=lint-me/lint-me.ts,line=21,col=18,title=eqeqeq::Expected '===' and instead saw '=='.
::error file=lint-me/lint-me.ts,line=27,col=9,title=@typescript-eslint/no-unused-vars::'unused' is assigned a value but never used.
::error file=lint-me/lint-me.ts,line=28,col=3,title=@typescript-eslint/no-unsafe-return::Unsafe return of a value of type `any`.
::error file=lint-me/lint-me.ts,line=32,col=8,title=@typescript-eslint/require-await::Async function 'sendMember' has no 'await' expression.
::error file=lint-me/lint-me.ts,line=33,col=3,title=@typescript-eslint/no-floating-promises::Promises must be awaited, …
error 7 個、warning 0 個
$ echo $?
1
```

つまずきやすい所:

- `%` を最後に書き換えると、先に足した `%0A` が `%250A` になります。`%` を最初に書き換えます。
- `file` の値に `,` があると、GitHub は `,` を次の項目との区切りと読みます。値の中の `,` と `:` は書き換えます。`::` の後ろの文には区切りが無いので、`,` と `:` はそのままです。
- `path.relative` は、Windows では `\` で区切ります。GitHub はリポジトリの中の場所を `/` で書くので、`split(path.sep).join('/')` で直しておきます（Mac と Linux では何も変わりません）。
- コマンドとして動かす部分は、外から来た JSON を Zod で確かめてから使っています（第7部 第38章）。ESLint の版で JSON の形が変わっても、黙って間違った行を出すのではなく、例外で止まります。

## 問題8 「決まった時間だけ待つ」を見つけるルール

```sh
$ MODULE=../solutions/rules/no-fixed-wait.ts node --test no-fixed-wait.test.ts
…
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

`setTimeout(r, 50)` から外へ、次の順で調べます。

| 調べること | `await new Promise((r) => setTimeout(r, 50))` では |
| --- | --- |
| `getAncestors` の中で、いちばん近い関数 | `(r) => setTimeout(r, 50)` |
| そのすぐ外の部品 | `new Promise(…)`（`NewExpression`） |
| `callee` が `Promise` という名前か | はい |
| 1つ目の引数が、その関数か | はい → 指摘する |

つまずきやすい所:

- `findLast` ではなく `find`（前から探す）にすると、**いちばん外側**の関数が見つかります。`new Promise((resolve) => { emitter.on('ready', () => { setTimeout(resolve, 0); }); })` では、外側の `(resolve) => …` が見つかって指摘してしまいます。いちばん近い関数を見るので、後ろから探します。
- 「`setTimeout` の祖先のどこかに `new Promise` があれば指摘」にすると、同じ理由で、別の関数の中の `setTimeout` まで指摘します。
- `parent.arguments[0] === fn` は、部品が**同じもの**かを比べています（同じ形の別のものではない）。AST の部品はオブジェクトなので、`===` で比べられます。
- `ms` の `data` は文字列なので、`50` ではなく `'50'`、変数なら `'DELAY'` です。引数が無いときの `setTimeout(r)` は、ブラウザも Node.js も 0ms（実際には 1ms 以上）として扱うので、`'0'` にします。

別解: `NewExpression` から始めて、`callee` が `Promise` なら、1つ目の引数の関数の本体を調べる書き方もあります。ただし、本体の中の文をたどって `setTimeout` を探す（さらに別の関数の中には入らない）処理を自分で書くことになるので、`setTimeout` から外へたどるほうが短く書けます。
