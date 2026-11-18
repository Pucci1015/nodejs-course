# 第59章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part11/ch59-lint-ci/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | 書くもの | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | コード | ESLint の指摘を、ルールを止めずに直す | [lint-me/lint-me.ts](lint-me/lint-me.ts)、[lint-me.test.ts](lint-me.test.ts) | 2・3 |
| 2 | 基本 | 設定 | 場所ごとに決まりを変える ESLint の設定 | [config-practice/eslint.config.js](config-practice/eslint.config.js)、[config-practice.test.ts](config-practice.test.ts) | 2.3・2.4 |
| 3 | 基本 | 設定 | GitHub Actions のワークフロー | [ci.yml](ci.yml)、[ci.test.ts](ci.test.ts) | 7.1・7.2 |
| 4 | 基本 | 答え | 考えて答える | [predict.md](predict.md) | 2・5・6・7 |
| 5 | 応用 | コード | `…ByTestId` を見つける ESLint のルール | [rules/prefer-role-query.ts](rules/prefer-role-query.ts)、[prefer-role-query.test.ts](prefer-role-query.test.ts) | 4 |
| 6 | 応用 | 設定 | PostgreSQL と E2E のジョブを足したワークフロー | [ci-full.yml](ci-full.yml)、[ci-full.test.ts](ci-full.test.ts) | 7.3 |
| 7 | 応用 | コード | ESLint の結果を、GitHub の注釈に変える | [annotate.ts](annotate.ts)、[annotate.test.ts](annotate.test.ts) | 9 |
| 8 | 発展 | コード | 「決まった時間だけ待つ」を見つけるルール | [rules/no-fixed-wait.ts](rules/no-fixed-wait.ts)、[no-fixed-wait.test.ts](no-fixed-wait.test.ts) | 4、第58章 7節 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

- どの問題も、`node --test ○○.test.ts` で、すべて通れば完成です（問題4を除く）。テストのファイルは書き換えません。
- 模範解答は `MODULE=../solutions/… node --test ○○.test.ts` で試せます（第56章と同じ）。
- 直す前（ひな形のまま）に失敗する数は、問題1が 6 個のうち 5 個、問題2が 4 個のうち 3 個、問題3が 5 個のうち 4 個、問題5が 11 個のうち 6 個、問題6が 8 個すべて、問題7が 6 個すべて、問題8が 11 個のうち 5 個です。
- 問題3・6のワークフローは、テストが YAML として読んで形を確かめるだけで、GitHub で動かすわけではありません。自分のリポジトリで動かしてみるのは、成果物（[../../project-task-quality/README.md](../../project-task-quality/README.md)）で行います。

---

## 基本

### 問題1 ESLint の指摘を、ルールを止めずに直す

[lint-me/lint-me.ts](lint-me/lint-me.ts) には、ESLint の指摘が7個あります。まず、指摘を見てください。

```sh
$ cd lint-me
$ npx eslint lint-me.ts
…/lint-me/lint-me.ts
  14:15  error  Capturing group number 1 is defined but never used  regexp/no-unused-capturing-group
  14:16  error  This quantifier can reach itself via the loop '([a-z]+)*'. … This is going to cause exponential backtracking resulting in exponential worst-case runtime behavior  regexp/no-super-linear-backtracking
  21:18  error  Expected '===' and instead saw '=='  eqeqeq
  27:9   error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars
  28:3   error  Unsafe return of a value of type `any`  @typescript-eslint/no-unsafe-return
  32:8   error  Async function 'sendMember' has no 'await' expression  @typescript-eslint/require-await
  33:3   error  Promises must be awaited, … @typescript-eslint/no-floating-promises

✖ 7 problems (7 errors, 0 warnings)
$ cd ..
```

要件:

- 指摘を0個にする。`eslint-disable` のコメントは使わない。ESLint の設定（`lint-me/eslint.config.js`）は書き換えない
- 関数の動きは次のとおりにする

| 関数 | 動き |
| --- | --- |
| `isTag(text)` | `node-24` のような「小文字が1文字以上、`-`、数字が1文字以上」なら `true`。`-24`・`node`・`Node-24` は `false`。合わない長い文字列（`a` を 28 個並べて `!`）でも、すぐ（100ms 未満で）答える |
| `ageLabel(member)` | `age` が `null` なら「年齢なし」。`0` なら「0 歳」 |
| `parseMembers(text)` | JSON を読み、`MemberSchema` の配列として確かめて返す。形が合わなければ例外 |
| `sendMember(member)` | 送り終わるまで待つ。`fetch` の失敗は、呼んだ側に届く（`await mod.sendMember(…)` が例外になる） |

```sh
$ node --test lint-me.test.ts
```

ヒント: 本文 2.2節（`any` を Zod で確かめる、`await` を付ける）、2.3節（`eqeqeq`）、3節（`(?:…)` と、分け方が1通りに決まる書き方）。正規表現は、`([a-z]+)*` のくり返しが要るかを考えてみてください。「1文字以上の小文字」は `[a-z]+` だけで書けます。

### 問題2 場所ごとに決まりを変える ESLint の設定

[config-practice/](config-practice/) は、JavaScript の小さなプロジェクトです。[config-practice/eslint.config.js](config-practice/eslint.config.js) を、次の決まりになるように書いてください。lint される側のファイル（`src/`・`scripts/`・`generated/`）は書き換えません。

| 決まり | |
| --- | --- |
| すべての `.js` | JavaScript のおすすめのルール（`js.configs.recommended`）を使う |
| すべての `.js` | `eqeqeq` と `no-console` は error、`prefer-const` は warn |
| すべての `.js` | `console` を、読むだけのグローバル変数として教える（`no-undef` にならないように） |
| `scripts/` の中 | `no-console` を止める |
| `generated/` の中 | lint しない |

テストは、あなたの設定で lint して、ファイルごとに出た指摘（ルールの名前と重さ）を比べます。

| ファイル | 出るはずの指摘（重さは 2 = error、1 = warn） |
| --- | --- |
| `src/app.js` | `eqeqeq:2`、`no-console:2`、`prefer-const:1` |
| `src/unused.js` | `no-unused-vars:2` |
| `scripts/seed.js` | なし |
| `generated/api.js` | lint されない |

```sh
$ node --test config-practice.test.ts
$ cd config-practice && npx eslint .     # 指摘を自分の目で見るとき
```

ヒント: 本文 2.4節の `layers` とほぼ同じ形です。`defineConfig(…)` に、オブジェクトを3つ並べます。

### 問題3 GitHub Actions のワークフロー

[ci.yml](ci.yml) に、次のワークフローを書いてください。

| 項目 | 決まり |
| --- | --- |
| 名前 | `CI` |
| 動くとき | `main` への push と、プルリクエスト |
| `GITHUB_TOKEN` の権限 | `contents: read` だけ |
| ジョブ | 名前は `check`。`ubuntu-latest` で動かし、10 分で打ち切る |
| 手順 | `actions/checkout@v5` → `actions/setup-node@v5`（Node.js 24、npm のキャッシュ）→ `npm ci --ignore-scripts` → `npm run check` |

```sh
$ node --test ci.test.ts
```

ヒント: 本文 7.2節の `samples/github/workflows/ci.yml` から、`concurrency` と `npm audit` の手順を除いた形です。YAML のインデントはスペース2個で、タブは使えません（7.1節）。

### 問題4 考えて答える

[predict.md](predict.md) の問いに答えてください。終了コードは、`echo $?` で確かめられます。

---

## 応用

### 問題5 `…ByTestId` を見つける ESLint のルール

第58章で、テストでは「役割と名前で探す（`getByRole`）」を使い、`data-testid` で探すのは最後の手段にしました。[rules/prefer-role-query.ts](rules/prefer-role-query.ts) に、`…ByTestId` で探している所を指摘するルールを書いてください。

要件:

- 関数を**呼び出している**所で、名前が `getByTestId`・`queryByTestId`・`findByTestId` と、それぞれの `All` 付き（`getAllByTestId` など）のものを指摘する
- `getByTestId(…)` のような直接の呼び出しも、`screen.getByTestId(…)`・`page.getByTestId(…)`・`within(list).getAllByTestId(…)` のような `.` の後ろの呼び出しも指摘する
- 指摘は `messageId: 'preferRole'`、`data: { name: 関数の名前 }`。場所（`node`）は関数の名前の部分（`screen.getByTestId` なら `getByTestId` の所。8 文字目から）
- 呼び出していないもの（`const getByTestId = 1;`）や、名前が違うもの（`getByTestIdOrRole`）は指摘しない

```sh
$ node --test prefer-role-query.test.ts
```

ヒント: 本文 4.2節の `no-focused-tests` と同じく `CallExpression` を見ます。`callee` は、直接の呼び出しなら `Identifier`、`.` の後ろなら `MemberExpression`（その `property` が名前）です（4.2節の後の表）。名前は、正規表現 `/^(?:get|query|find)(?:All)?ByTestId$/` で調べられます。

### 問題6 PostgreSQL と E2E のジョブを足したワークフロー

問題3の `ci.yml` の中身を [ci-full.yml](ci-full.yml) にコピーしてから、次のものを足してください。

| 足すもの | 決まり |
| --- | --- |
| `concurrency` | `group: ci-${{ github.ref }}`、`cancel-in-progress: true` |
| `check` のサービス | 名前は `postgres`。イメージ `postgres:18`、環境変数 `POSTGRES_USER: app`・`POSTGRES_PASSWORD: dev-only-password`・`POSTGRES_DB: taskapi`、ポート `'5433:5432'`、`options` に `--health-cmd pg_isready` を含める |
| `check` の環境変数 | `DATABASE_URL: postgres://app:dev-only-password@127.0.0.1:5433/taskapi`（ジョブの `env`） |
| ジョブ `e2e` | `check` が通ってから動く。`ubuntu-latest`、15 分で打ち切る |
| `e2e` の手順 | checkout → setup-node（`check` と同じ）→ `npm ci --ignore-scripts` → `npx playwright install --with-deps chromium` → `npx playwright test` → 失敗したときだけ `actions/upload-artifact@v4`（`name: playwright-results`、`path: test-results`、`retention-days: 7`） |

```sh
$ node --test ci-full.test.ts
```

ヒント: 本文 7.3節。パスワードは練習用の `dev-only-password` なのでそのまま書いていますが、本物の秘密の値はワークフローに書かず、GitHub の Secrets に入れます（本文 7.3節の注意）。

### 問題7 ESLint の結果を、GitHub の注釈に変える

本文9節の「注釈の行」（`::error file=…,line=…,col=…,title=…::文`）を、ESLint の JSON の結果から作るコマンドを、[annotate.ts](annotate.ts) に書いてください。コマンドとして動かす部分（`import.meta.main` の所）と、JSON を確かめる Zod のスキーマは書いてあります。書くのは2つの関数です。

| 関数 | 決まり |
| --- | --- |
| `toAnnotations(results, cwd)` | 指摘1つを1行にする。severity が 2 なら `::error`、1 なら `::warning`。`file` は `cwd` から数えた場所で、区切りは `/`。`title` はルールの名前（`ruleId` が `null` なら `ESLint`）。指摘の無いファイルは何も出さない |
| （書き換え） | `::` の後ろの文では、`%` → `%25`、`\r` → `%0D`、`\n` → `%0A`。`file` と `title` の値では、さらに `:` → `%3A`、`,` → `%2C` |
| `summarize(results)` | `{ errors, warnings }`（severity 2 と 1 の数） |

```sh
$ node --test annotate.test.ts
```

できたら、問題1のひな形で試してみます（`lint-me` は直す前の形に戻しておくか、別の所にコピーして試します）。

```sh
$ cd lint-me
$ npx eslint lint-me.ts --format json --output-file ../eslint.json
$ cd ..
$ node annotate.ts eslint.json
::error file=lint-me/lint-me.ts,line=14,col=15,title=regexp/no-unused-capturing-group::Capturing group number 1 is defined but never used.
…
error 7 個、warning 0 個
$ echo $?
1
$ rm eslint.json
```

ヒント: 場所は `path.relative(cwd, filePath)`（第3部 第15章）。書き換えは `replaceAll`。`%` を**最初に**書き換えないと、後で足した `%0A` の `%` まで書き換えてしまいます。

---

## 発展

### 問題8 「決まった時間だけ待つ」を見つけるルール

第58章 7節で、テストの中で決まった時間だけ待つ（`await new Promise((r) => setTimeout(r, 50))`）と、遅いマシンではときどき失敗し、速いマシンでは無駄に遅くなる、と学びました。[rules/no-fixed-wait.ts](rules/no-fixed-wait.ts) に、それを見つけるルールを書いてください。

要件:

| 指摘するもの | messageId | 場所（`node`） |
| --- | --- | --- |
| `new Promise(関数)` の、その関数の中で**直接**呼んだ `setTimeout(…)` | `sleep`（`data: { ms }`。`ms` は2つ目の引数のソースの文字列。無ければ `'0'`） | `new Promise(…)` の部品（`await new Promise…` なら 7 文字目から） |
| `○○.waitForTimeout(…)`（Playwright） | `waitForTimeout` | 呼び出しの部品 |

指摘しないもの:

- Promise の外の `setTimeout(done, 100)`（タイマーそのものを試すテストなど）
- `new Promise` の関数の中の、**さらに別の関数の中**の `setTimeout`（`emitter.on('ready', () => { setTimeout(resolve, 0); })` は、いつ呼ばれるか分からない）
- `new Thing((resolve) => setTimeout(resolve, 50))` のように、`Promise` ではない `new`

```sh
$ node --test no-fixed-wait.test.ts
```

ヒント: `setTimeout` の `CallExpression` を見つけたら、`context.sourceCode.getAncestors(node)` で囲む部品をたどり、**いちばん近い**関数（`ArrowFunctionExpression` か `FunctionExpression`）を探します（配列は外から順なので、後ろから探す `findLast` が使えます）。その関数のすぐ外が `NewExpression` で、`callee` が `Promise` という名前の `Identifier`、1つ目の引数がその関数なら、指摘します。`ms` は `context.sourceCode.getText(引数)`（本文 4.2節の後の表）。
