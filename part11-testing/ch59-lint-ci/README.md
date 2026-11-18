# 第59章 静的解析と CI

テストは、動かして確かめます。この章では、**動かさずに**コードを読んで間違いを見つける道具（**静的解析**: 型の確かめ・ESLint・Prettier・`npm audit`）を使いこなし、それをテストと一緒に、GitHub に push するたびに自動で動かす **CI**（継続的インテグレーション）を作ります。ESLint の設定を1行ずつ読み、ルールを足し、自分でルールを作り、GitHub Actions のワークフローを書きます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第56〜58章、第1部 第3章（Git・GitHub・プルリクエスト）・第4章（VS Code の ESLint・Prettier）、第3部 第13章（ReDoS）・第14章（npm scripts・`npm ci`）、第7部 第37章（ESLint と typescript-eslint） |
| この章のゴール | ESLint の指摘を読み、ルールを止めずに直せる / 設定ファイルにルールとプラグインを足し、場所ごとに変えられる / 小さな ESLint のルールを書いて、RuleTester で確かめられる / Prettier と ESLint を役割で分けて使える / `npm run check` で全部を1回で確かめられる / GitHub Actions のワークフローを読み書きできる / Dependabot・ブランチの保護で、壊れたものが main に入らないようにできる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 練習用の小さなプロジェクト（`demo/` と完成形の `finished/`）、ワークフローの見本（`github/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part11/ch59-lint-ci/` で実行します。
>
>   ```sh
>   $ cd ~/dev/part11/ch59-lint-ci
>   ```
>
> - 2.1節で `samples/demo` を `demo/` にコピーし、6節まで `demo/` の中で直していきます。
> - 7・8節の GitHub Actions は、GitHub のリポジトリに push して初めて動きます。この章ではワークフローを書いて読み、実際に動かすのは成果物（`~/dev/task-api`）で行います。執筆の環境からは GitHub で動かせなかったので、YAML として正しく読めることと、各コマンドが手元で通ることだけを確かめました。
> - ポートは使いません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ESLint の設定とルール（2〜4節） | 成果物（task-api の設定を整える）、第13部（自分の題材） |
| Prettier と `npm run check`（5・6節） | 成果物、この教材のすべてのプロジェクト |
| GitHub Actions（7節） | 成果物（テストと E2E を CI で）、第12部（デプロイを自動に） |
| Dependabot・`npm audit`・ブランチの保護（8節） | 成果物、第12部・第13部 |

---

## 1. 動かさずに見つける

| 道具 | 見つけるもの | 例 |
| --- | --- | --- |
| `tsc`（型の確かめ。第7部） | 型の合わない値、無いプロパティ | `task.titel`、`string` に `null` を入れる |
| **ESLint**（リンター） | 間違いやすい書き方、決まりに合わない書き方 | 待っていない Promise、`==`、使っていない変数、ReDoS になる正規表現 |
| **Prettier**（フォーマッタ） | 見た目のそろっていない所（間違いではない） | 引用符、インデント、1行の長さ |
| `npm audit`（第10部 第55章） | 脆弱性の知られている依存パッケージ | 古い版の `minimatch` |

テストは「書いた場合」しか確かめませんが、静的解析は、すべてのファイルのすべての行を、同じ決まりで見ます。速く（数秒）、テストを書いていない所の間違いも見つけます。一方、「合計が正しいか」のような中身の正しさは分かりません。テストと静的解析は、役割が違います。

**Flask では**: Python では、flake8 や Ruff（リンター）、Black や Ruff format（フォーマッタ）、mypy（型の確かめ）がこの役割です。`pyproject.toml` や `setup.cfg` に設定を書き、CI で `ruff check .`・`mypy .`・`pytest` を順に動かします。この章の ESLint・Prettier・`tsc`・`npm run check` が、それにあたります。

## 2. ESLint の設定と、指摘の読み方

### 2.1 手を動かす: 練習用のプロジェクトを lint する

```sh
$ cp -R samples/demo demo
$ cd demo
$ npx eslint .
~/dev/part11/ch59-lint-ci/demo/orders.test.ts
   6:1  error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises
  10:1  error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises

~/dev/part11/ch59-lint-ci/demo/orders.ts
   9:9  error  'TAX' is assigned a value but never used                                                                                                                            @typescript-eslint/no-unused-vars
  20:8  error  Async function 'saveOrder' has no 'await' expression                                                                                                                @typescript-eslint/require-await
  21:3  error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises
  25:3  error  Unsafe return of a value of type `any`                                                                                                                              @typescript-eslint/no-unsafe-return

✖ 6 problems (6 errors, 0 warnings)
```

（出力のパスは、実際には `/Users/alice/dev/…` のように全部出ます。ここでは `~` で短くしました）

| 列 | 意味 |
| --- | --- |
| `21:3` | 21 行目の 3 文字目 |
| `error` | 重さ。`error` か `warning` |
| 文 | 何がよくないか |
| `@typescript-eslint/no-floating-promises` | ルールの名前。`/` の前はプラグインの名前（無ければ ESLint そのもののルール） |

ルールの名前で検索すると、公式のページ（なぜだめか、どう直すか、正しい例と間違った例）が見つかります。ESLint の終了コードは、error が1つでもあれば 1、なければ 0 です。

`demo/eslint.config.js` は、次の形です（第7部 第37章と同じ形）。

```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
});
```

| 書いたもの | 意味 |
| --- | --- |
| `defineConfig(…)` | 設定のオブジェクトの並び（**フラットな設定**）を作る。後に書いたものほど強い |
| `files` | このオブジェクトを当てるファイル。`**/*.ts` は、どのフォルダの `.ts` でも |
| `extends` | 決まったルールの組を、まとめて読み込む。`js.configs.recommended` は JavaScript のおすすめ、`recommendedTypeChecked` は型の情報を使う TypeScript のおすすめ |
| `languageOptions.parserOptions` | TypeScript を読む部品の設定。`projectService: true` は、ファイルにいちばん近い `tsconfig.json` から型の情報を読む |

ESLint 10 は、lint するファイルのフォルダから上にたどって、いちばん近い `eslint.config.js` を使います。`demo/` に設定があるので、部のフォルダ（`~/dev/part11`）の設定ではなく、こちらが使われます。

### 2.2 手を動かす: ルールを止めずに直す

指摘は、ルールを止めて消すのではなく、コードを直して消します。`orders.ts` を、次のように直します。

```ts
// 第59章 2節: 注文の合計（ESLint の指摘を、1つずつ直す）
import { z } from 'zod';

export interface Order {
  id: number;
  items: { price: number; qty: number }[];
  coupon?: string;
}

const OrderSchema = z.object({
  id: z.number().int(),
  items: z.array(z.object({ price: z.number(), qty: z.number().int() })),
  coupon: z.string().optional(),
});

export function total(order: Order): number {
  let sum = 0;
  for (const item of order.items) {
    sum += item.price * item.qty;
  }
  if (order.coupon == 'HALF') {
    sum = sum / 2;
  }
  return sum;
}

export async function saveOrder(order: Order): Promise<void> {
  await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
}

export function parseOrder(text: string): Order {
  return OrderSchema.parse(JSON.parse(text));
}
```

| 指摘 | 直し方 | なぜ |
| --- | --- | --- |
| `no-unused-vars`（TAX） | 消す | 使っていない値は、書きかけか、消し忘れ |
| `no-floating-promises`・`require-await` | `await fetch(…)` | 待たないと、失敗が呼んだ側に届かない（第3部 第12章） |
| `no-unsafe-return` | Zod で確かめてから返す | `JSON.parse` の結果は `any`。型を付けても中身は確かめていない（第7部 第38章） |

```sh
$ npx eslint .
~/dev/part11/ch59-lint-ci/demo/orders.test.ts
   6:1  error  Promises must be awaited, … @typescript-eslint/no-floating-promises
  10:1  error  Promises must be awaited, … @typescript-eslint/no-floating-promises

✖ 2 problems (2 errors, 0 warnings)
```

残ったのは、テストの `test(…)` です。node:test の `test()` は Promise を返しますが、テストの道具が待つので、待たなくてかまいません。これは、ルールの設定（次の節）で例外にします。

### 2.3 手を動かす: ルールを足す・設定を変える

`eslint.config.js` に `rules` を足します。

```js
export default defineConfig({
  files: ['**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    eqeqeq: 'error',
    '@typescript-eslint/no-floating-promises': [
      'error',
      { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] }] },
    ],
  },
});
```

| 書き方 | 意味 |
| --- | --- |
| `eqeqeq: 'error'` | ルールを error で使う。`'warn'` なら warning、`'off'` なら使わない |
| `[重さ, オプション]` | ルールのオプションを渡す。オプションは、ルールの公式のページに書いてある |
| `allowForKnownSafeCalls` | 「このパッケージのこの関数は、待たなくてよい」と教える |

```sh
$ npx eslint .
~/dev/part11/ch59-lint-ci/demo/orders.test.ts
  10:1  error  Promises must be awaited, … @typescript-eslint/no-floating-promises

~/dev/part11/ch59-lint-ci/demo/orders.ts
  21:20  error  Expected '===' and instead saw '=='  eqeqeq

✖ 2 problems (2 errors, 0 warnings)
```

`==` は、比べる前に型を変えます（`0 == ''` が `true`）。`===` に直します。`orders.test.ts` の 10 行目は `test.only(…)` で、`test` ではないので、まだ指摘されています。これは4節で扱います。

| 重さ | ESLint の終了コード | 使う所 |
| --- | --- | --- |
| `'error'` | 1（失敗） | 必ず直すもの |
| `'warn'` | 0（成功）。ただし `--max-warnings 0` を付けると 1 | 移るまでの間だけ（下を読む） |
| `'off'` | | 使わない |

warning は、CI を止めないので、だんだん増えて誰も読まなくなります。この教材では、ルールは `error` か `off` にし、CI では `--max-warnings 0` を付けて、warning も失敗にします（練習問題4）。`npx eslint . --fix` は、直し方が決まっている指摘（`prefer-const` など）を、自動で直します。

### 2.4 手を動かす: 設定のオブジェクトを並べる

1つのプロジェクトの中でも、場所によって決まりを変えたいことがあります。アプリのコードでは `console.log` を禁止し、手で動かす道具（`scripts/`）では許す、道具が作ったファイル（`generated/`）は lint しない、などです。`samples/layers` は、そのための小さな JavaScript のプロジェクトです。

```sh
$ cd ~/dev/part11/ch59-lint-ci
$ cp -R samples/layers layers
$ cd layers
$ npx eslint .
~/dev/part11/ch59-lint-ci/layers/generated/report-data.js
  2:5  error  'unusedFromTool' is assigned a value but never used  no-unused-vars

~/dev/part11/ch59-lint-ci/layers/scripts/report.js
  3:1  error  'console' is not defined      no-undef
  3:1  error  Unexpected console statement  no-console

~/dev/part11/ch59-lint-ci/layers/src/app.js
  3:3  error  'console' is not defined      no-undef
  3:3  error  Unexpected console statement  no-console

✖ 5 problems (5 errors, 0 warnings)
```

`no-undef` は「どこにも宣言されていない変数」を見つけるルールです。ESLint は、Node.js で動かすのかブラウザで動かすのかを知らないので、`console` を知らない変数だと考えます（TypeScript のファイルでは、型の情報で分かるので、`recommendedTypeChecked` がこのルールを止めています）。`layers/eslint.config.js` を、オブジェクトを並べる形に書き直します。

```js
export default defineConfig(
  { ignores: ['generated/**'] },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { console: 'readonly' } },
    rules: { 'no-console': 'error' },
  },
  { files: ['scripts/**'], rules: { 'no-console': 'off' } },
);
```

| 書いたもの | 意味 |
| --- | --- |
| `{ ignores: [...] }` | `files` を書かずに `ignores` だけのオブジェクトは、**全体**から外す（lint しない）。`node_modules` と `.git` は、書かなくても外れる |
| `languageOptions.globals` | 宣言しなくても使える変数を教える。`'readonly'` は「読むだけ（代入しない）」 |
| `{ files: ['scripts/**'], rules: … }` | `scripts/` の中だけ、ルールを変える。後に書いたものほど強いので、前の `'error'` を `'off'` で上書きする |

```sh
$ npx eslint .
~/dev/part11/ch59-lint-ci/layers/src/app.js
  3:3  error  Unexpected console statement  no-console

✖ 1 problem (1 error, 0 warnings)
```

`src/` では禁止のまま、`scripts/` では使えるようになり、`generated/` は見られなくなりました。完成形は `samples/finished/layers/eslint.config.js` です。うまく動かないときは比べてください（練習問題2）。

### 2.5 どうしても止めるとき

ルールが合わない1か所だけを止めるには、コメントを書きます。

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- 外の型定義が any を返すが、ここでは中身を確かめ済み
```

| 書き方 | 意味 |
| --- | --- |
| `eslint-disable-next-line ルール` | 次の1行だけ、そのルールを止める |
| `-- 理由` | なぜ止めたかを書く（ESLint は読まないが、人が読む） |

ルールの名前を書かずに止めたり、ファイル全体を止めたりはしません。止めた所が要らなくなると、ESLint が「使われていない disable」として知らせてくれます（`linterOptions.reportUnusedDisableDirectives`。執筆時点の既定は warning）。

## 3. 正規表現の落とし穴を見つける（eslint-plugin-regexp）

第3部 第13章で、正規表現の書き方によっては、合わない文字列で試す数が爆発して、サーバが止まること（**ReDoS**）を見ました。**eslint-plugin-regexp** は、正規表現を読んで、そうなる書き方を見つけるプラグインです（第11部で `eslint-plugin-regexp` 3.3.3 を入れてあります）。

### 3.1 手を動かす: プラグインを足す

```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import regexp from 'eslint-plugin-regexp';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, regexp.configs['flat/recommended']],
  // …（languageOptions・rules はそのまま）
});
```

```sh
$ npx eslint slug.ts
~/dev/part11/ch59-lint-ci/demo/slug.ts
  2:16  error  The quantifier '([a-z0-9]+-?)*' can exchange characters with '[a-z0-9]+'. Using any string accepted by /[\da-z]+/, this can be exploited to cause at least polynomial backtracking  regexp/no-super-linear-backtracking
  2:16  error  Capturing group number 1 is defined but never used  regexp/no-unused-capturing-group
  2:17  error  This quantifier can reach itself via the loop '([a-z0-9]+-?)*'. … This is going to cause exponential backtracking resulting in exponential worst-case runtime behavior  regexp/no-super-linear-backtracking
  2:17  error  The quantifier '[a-z0-9]+' can exchange characters with '[a-z0-9]+'. …  regexp/no-super-linear-backtracking
  2:30  error  '[a-z0-9]+' can be replaced with '[a-z0-9]' because of '([a-z0-9]+-?)*'  regexp/optimal-quantifier-concatenation

✖ 5 problems (5 errors, 0 warnings)
```

`/^([a-z0-9]+-?)*[a-z0-9]+$/` は、`-` が無くてもよいので、`aaaa` を「`aa`+`aa`」「`a`+`aaa`」…と何通りにも分けられます。合わない文字列（最後に `!` が付いたものなど）では、その分け方をすべて試します。執筆の環境で、`a` を並べて最後に `!` を付けた文字列で時間を測ると、20 文字で 85ms、28 文字で 2.5 秒でした。

「`-` の後には必ず1文字以上」の形に書き直します。

```ts
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

| 書き方 | 意味 |
| --- | --- |
| `(?:…)` | まとめるだけで、取り出さない（キャプチャしない）かっこ。`no-unused-capturing-group` の指摘も消える |
| `(?:-[a-z0-9]+)*` | 「`-` と1文字以上」を0回以上。分け方が1通りに決まる |

## 4. 自分でルールを作る

チームで決めたこと（「テストに `.only` を残さない」など）は、ルールにすれば、レビューで毎回言わなくても ESLint が見張ってくれます。

`test.only` は、Vitest や Playwright では、**ほかのテストを黙って飛ばします**。手元で1つだけ動かすときに付けて、消し忘れたまま push すると、CI でもほとんどのテストが動かないまま「成功」になります（Vitest は、環境変数 `CI` があると `.only` を失敗にしてくれますが、node:test・Playwright の設定しだいでは通ってしまいます）。

### 4.1 ESLint はコードを木として読む

ESLint は、コードを **AST**（抽象構文木）という木に変えてから、ルールに見せます。`test.only('a', fn)` は、次の木になります。

```
CallExpression（関数の呼び出し）
├─ callee: MemberExpression（○○.△△）
│   ├─ object: Identifier（name: "test"）
│   └─ property: Identifier（name: "only"）
└─ arguments: [Literal（"a"）, ArrowFunctionExpression]
```

ルールは、「この種類の部品（`CallExpression` など）を見つけたら、この関数を呼んで」と ESLint に渡します。木の形は、AST explorer（https://astexplorer.net/ 。パーサに `espree` か `@typescript-eslint/parser` を選ぶ）にコードを貼ると見られます。

### 4.2 手を動かす: ルールを書く

`demo/rules/no-focused-tests.ts` を作ります。

```ts
import type { Rule } from 'eslint';

const TEST_FUNCTIONS = new Set(['test', 'it', 'describe', 'suite']);

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'test.only・describe.only などを残さない' },
    messages: { focused: '{{name}}.only が残っています。ほかのテストが動かなくなります' },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          TEST_FUNCTIONS.has(callee.object.name) &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'only'
        ) {
          context.report({ node: callee.property, messageId: 'focused', data: { name: callee.object.name } });
        }
      },
    };
  },
};

export default rule;
```

| 書いたもの | 意味 |
| --- | --- |
| `meta.type` | `problem`（間違い）・`suggestion`（よりよい書き方）・`layout`（見た目） |
| `meta.messages` | 出す文。`{{name}}` に `data` の値が入る |
| `meta.schema: []` | オプションを受け取らない |
| `create(context)` | ファイルごとに呼ばれ、「部品の種類 → 関数」のオブジェクトを返す |
| `callee.type === 'MemberExpression'` | 型の絞り込み（第7部 第36章）。ここから先は `callee.object` が使える |
| `context.report({ node, messageId, data })` | 指摘する。`node` の場所（行・列）が出る |

ルールの中で、ほかに使える道具です（練習問題5・8で使います）。

| 書き方 | 意味 |
| --- | --- |
| `callee.type === 'Identifier'` | `getByTestId(…)` のように、名前をそのまま呼んでいる。`callee.name` が名前 |
| `NewExpression` | `new Promise(…)` のような `new`。`node.callee` がクラスの名前、`node.arguments` が引数 |
| `ArrowFunctionExpression`・`FunctionExpression` | `() => …` と `function () { … }` |
| `context.sourceCode.getText(node)` | その部品の、ソースの文字列（`DELAY` や `50`） |
| `context.sourceCode.getAncestors(node)` | その部品を囲む部品の配列。いちばん外（ファイル全体）から順に並ぶ |

### 4.3 手を動かす: ルールをテストする

ルールもテストします。ESLint の **RuleTester** は、「指摘されないはずのコード（`valid`）」と「指摘されるはずのコードと、その中身（`invalid`）」を並べると、1つずつテストにしてくれます。`demo/rules/no-focused-tests.test.ts` を作ります。

```ts
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import rule from './no-focused-tests.ts';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester();

tester.run('no-focused-tests', rule, {
  valid: ["test('a', () => {});", "describe('a', () => {});", 'only();', "list.only('a');", "test.skip('a', () => {});"],
  invalid: [
    { code: "test.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'test' } }] },
    { code: "describe.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'describe' } }] },
    { code: "it.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'it' }, line: 1, column: 4 }] },
  ],
});
```

```sh
$ node --test rules/no-focused-tests.test.ts
▶ no-focused-tests
  ▶ valid
    ✔ test('a', () => {}); (…ms)
    …
  ▶ invalid
    ✔ test.only('a', () => {}); (…ms)
    ✔ describe.only('a', () => {}); (…ms)
    ✔ it.only('a', () => {}); (…ms)
…
ℹ tests 8
ℹ pass 8
```

| 書いたもの | 意味 |
| --- | --- |
| `RuleTester.describe = describe` など | RuleTester に、node:test の `describe`・`it` を使わせる（既定では Mocha 形式のグローバル関数を探す） |
| `valid` の `"list.only('a');"` | `.only` でも、テストの関数でなければ指摘しない、ことを確かめる |
| `errors` の `line`・`column` | 指摘の場所（`only` の所の 4 文字目）まで確かめる |

### 4.4 手を動かす: 設定に登録する

```js
import noFocusedTests from './rules/no-focused-tests.ts';

export default defineConfig({
  // …
  plugins: { local: { rules: { 'no-focused-tests': noFocusedTests } } },
  rules: {
    eqeqeq: 'error',
    'local/no-focused-tests': 'error',
    // …
  },
});
```

```sh
$ npx eslint .
~/dev/part11/ch59-lint-ci/demo/orders.test.ts
  10:1  error  Promises must be awaited, … @typescript-eslint/no-floating-promises
  10:6  error  test.only が残っています。ほかのテストが動かなくなります                    local/no-focused-tests

✖ 2 problems (2 errors, 0 warnings)
```

`plugins: { local: … }` は、「`local` という名前のプラグイン」として、自分のルールを登録します。ルールの名前は `プラグインの名前/ルールの名前` です。`eslint.config.js` は JavaScript ですが、Node.js が型を取り除いて動かすので、`.ts` のルールを `import` できます。`test.only` を `test` に直すと、2つとも消えます。

## 5. 見た目は Prettier に任せる

インデントや引用符のような見た目を、人がレビューで直し合うのは時間の無駄です。**Prettier** は、決まった形にコードを書き直します。設定はほとんどありません（あえて少なくしてある）。

### 5.1 手を動かす: 整える

`demo/.prettierrc.json` を作ります。

```json
{
  "singleQuote": true,
  "printWidth": 120
}
```

| 設定 | 意味 |
| --- | --- |
| `singleQuote` | 文字列を `'` で囲む（この教材の書き方） |
| `printWidth` | 1行をこの文字数に収めるように折り返す（既定は 80） |

```sh
$ npx prettier --check .
Checking formatting...
[warn] eslint.config.js
[warn] messy.ts
[warn] orders.test.ts
[warn] Code style issues found in 3 files. Run Prettier with --write to fix.
$ npx prettier --write messy.ts
messy.ts 33ms
$ cat messy.ts
// 第59章 5節: 書き方のそろっていないファイル（Prettier で整える）
export const colors = { red: '#c00', green: '#0a0', blue: '#00c' };
export function pick(name: keyof typeof colors) {
  return colors[name];
}
```

| オプション | 意味 |
| --- | --- |
| `--check` | 整っていないファイルを挙げるだけ（書き換えない）。あれば終了コード 1。CI で使う |
| `--write` | 書き換える |

`npx prettier --write .` で全部を整えてから、`--check` が通ることを確かめます。整えないファイル（`package-lock.json` など）は、`.prettierignore` に書きます。VS Code では、保存したときに Prettier で整えるように設定できます（第1部 第4章）。

### 5.2 ESLint とぶつからないようにする

ESLint にも、見た目のルール（引用符、セミコロンなど）があります。Prettier と違う決まりのルールが有効だと、片方で直すともう片方が怒る、を繰り返します（練習問題4）。**eslint-config-prettier** は、Prettier とぶつかる ESLint のルールを、すべて `off` にする設定です。`extends` の**最後**に置きます（後に書いたものほど強いので、前のおすすめの設定が on にした見た目のルールを、最後に off にする）。

```js
import prettier from 'eslint-config-prettier/flat';
// …
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      regexp.configs['flat/recommended'],
      prettier,
    ],
```

役割を分けます。**見た目は Prettier、間違いは ESLint**。

## 6. npm scripts で、1回で全部を確かめる

型・lint・見た目・テストを、毎回別々に打つのは手間で、忘れます。`demo/package.json` を作り、`check` で全部を順に動かします（第3部 第14章）。

```json
{
  "name": "ch59-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "node --test \"**/*.test.ts\"",
    "check": "npm run typecheck && npm run lint && npm run format:check && npm test"
  }
}
```

| 書いたもの | 意味 |
| --- | --- |
| `--max-warnings 0` | warning が1つでもあれば失敗にする（2.3節） |
| `"**/*.test.ts"` | node:test に、どのファイルをテストにするかを渡す。`\"` は JSON の中の `"` |
| `&&` | 前が成功（終了コード 0）したときだけ、次を動かす。失敗したらそこで止まり、`check` も失敗 |
| 順番 | 速くて、見つけたときに直しやすいものから |

この `package.json` には `dependencies` がありません。ESLint などは、部のフォルダ（`~/dev/part11/node_modules`）に入っているものを使います（npm scripts は、上のフォルダの `node_modules/.bin` も探します）。

```sh
$ npm run check

> check
> npm run typecheck && npm run lint && npm run format:check && npm test

> typecheck
> tsc

> lint
> eslint . --max-warnings 0

> format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

> test
> node --test "**/*.test.ts"

✔ 合計は、値段 × 数を足したもの (…ms)
✔ クーポン HALF なら半分 (…ms)
▶ no-focused-tests
…
ℹ tests 10
ℹ pass 10
```

わざと `===` を `==` に戻して動かすと、lint で止まり、テストは動きません。

```sh
$ npm run check
…
> lint
> eslint . --max-warnings 0

~/dev/part11/ch59-lint-ci/demo/orders.ts
  21:20  error  Expected '===' and instead saw '=='  eqeqeq

✖ 1 problem (1 error, 0 warnings)
$ echo $?
1
```

完成形は [samples/finished/](samples/finished/) です。**push する前に `npm run check`**、を習慣にします。CI は、それを忘れたときの安全網です。

## 7. GitHub Actions で、push のたびに確かめる

**CI**（継続的インテグレーション）は、変更をリポジトリに入れるたびに、自動で確かめる仕組みです。**GitHub Actions** は、GitHub の CI です。リポジトリの直下の `.github/workflows/` に YAML のファイル（**ワークフロー**）を置くと、GitHub が読み、決めた出来事（push・プルリクエストなど）のたびに、GitHub のマシンで動かします。結果は、プルリクエストの画面に ✓ か ✗ で出ます。

| 言葉 | 意味 |
| --- | --- |
| ワークフロー | `.github/workflows/*.yml` の1つのファイル |
| イベント（`on`） | いつ動かすか |
| ジョブ（`jobs`） | 1台のマシンで、順に動かす手順のまとまり。ジョブどうしは、決めない限り同時に動く |
| ステップ（`steps`） | ジョブの中の1つの手順。コマンド（`run`）か、アクション（`uses`） |
| ランナー（`runs-on`） | ジョブを動かすマシン。`ubuntu-latest` は GitHub が用意する Linux |
| アクション | よく使う手順を部品にしたもの。`actions/checkout` など |

公開リポジトリでは GitHub のランナーを無料で使えます。非公開リポジトリには、毎月の無料の時間があります（量は変わるので、必ず GitHub の公式の「About billing for GitHub Actions」で確認してください）。

### 7.1 YAML の読み方

ワークフローは **YAML** で書きます。JSON と同じく、値・オブジェクト・配列を書く書き方です。

| YAML | JSON にすると | 決まり |
| --- | --- | --- |
| `name: CI` | `{"name": "CI"}` | `キー: 値` |
| `on:`<br>`  push:` | `{"on": {"push": …}}` | 字下げ（**スペース**。タブは使えない）で、中に入れる |
| `steps:`<br>`  - run: npm ci` | `{"steps": [{"run": "npm ci"}]}` | `- ` で始まる行が、配列の1つ |
| `branches: [main]` | `{"branches": ["main"]}` | `[ ]` でも配列を書ける |
| `node-version: 24` | `{"node-version": 24}` | 数は数、`true`・`false` は真偽値。文字にしたいときは `'24'` と囲む |
| `# コメント` | （無し） | `#` から行の終わりまで |

字下げの数がずれると、別の所に入ってしまいます。VS Code の拡張機能「YAML」（Red Hat）を入れると、GitHub Actions のワークフローの書き間違いを教えてくれます。

### 7.2 手を動かす: ワークフローを読む

[samples/github/workflows/ci.yml](samples/github/workflows/ci.yml) を、1行ずつ読みます。

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci --ignore-scripts
      - run: npm run check
      - run: npm audit --omit=dev --audit-level=high
```

| 書いたもの | 意味 |
| --- | --- |
| `on.push.branches: [main]` | main に push されたとき |
| `on.pull_request:` | プルリクエストを作ったとき・そのブランチに push したとき（値は空でよい） |
| `permissions: contents: read` | ワークフローに渡る鍵（`GITHUB_TOKEN`）に、リポジトリを読むことだけを許す。書く必要のないものに、書く力を渡さない |
| `concurrency` | 同じ `group` のものは1つだけ動かす。`cancel-in-progress` で、同じブランチの古い実行を止める（続けて push したとき、最後のものだけ確かめる） |
| `${{ github.ref }}` | **式**。GitHub が値を入れる。`github.ref` は `refs/heads/ブランチ名` など |
| `timeout-minutes: 10` | 止まったままのジョブを、10 分で打ち切る（既定は 360 分） |
| `actions/checkout@v5` | リポジトリの中身を、ランナーに取ってくる。`@v5` はアクションの版 |
| `actions/setup-node@v5` の `with` | Node.js 24 を入れる。`cache: npm` で、npm がダウンロードしたもの（`~/.npm`）を覚えておき、`package-lock.json` が変わらなければ使い回す |
| `npm ci --ignore-scripts` | ロックファイルのとおりに入れる。install scripts は動かさない（第3部 第14章、第10部 第55章） |
| `npm run check` | 6節の全部。失敗すると、ジョブが ✗ になり、そこで止まる |
| `npm audit --omit=dev --audit-level=high` | 本番で使うパッケージに、high 以上の脆弱性が知られていれば失敗（8節） |

`@v5` のような版は、執筆時点のものです。使う前に、それぞれのリポジトリ（github.com/actions/checkout など）で、今の版を確かめてください。版を `@` の後ろにコミットのハッシュ（40 文字）で書くと、版の名前を付け替えられても中身が変わらない、より固い指定になります。

### 7.3 データベースと、ジョブの順番

テストに PostgreSQL が要るときは、**サービスコンテナ**で、ジョブのそばに動かします。第6部の `compose.yaml` と同じ設定にします。

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: dev-only-password
          POSTGRES_DB: taskapi
        ports:
          - '5433:5432'
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgres://app:dev-only-password@127.0.0.1:5433/taskapi
```

| 書いたもの | 意味 |
| --- | --- |
| `services.postgres.image` | Docker のイメージ（第6部 第32章） |
| `ports: ['5433:5432']` | ランナーの 5433 番を、コンテナの 5432 番につなぐ（手元と同じ番号にする） |
| `options: >-` と続く行 | `>-` は「次の行からを、1行の文字にまとめる」。`--health-cmd pg_isready` で、起動しきるまで手順を始めない |
| ジョブの `env` | そのジョブのすべての手順で使える環境変数 |

`dev-only-password` は、CI の中だけで使う、使い捨てのパスワードです。本物の秘密（デプロイの鍵など）は、ワークフローに書かず、リポジトリの Settings → Secrets に入れて `${{ secrets.名前 }}` で読みます（第12部）。フォークからのプルリクエストのワークフローには、秘密は渡りません。

E2E のテストは遅いので、別のジョブにして、`needs` で順番を決めます。

```yaml
  e2e:
    needs: check
    runs-on: ubuntu-latest
    steps:
      # …（checkout・setup-node・npm ci）
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-results
          path: test-results
          retention-days: 7
```

| 書いたもの | 意味 |
| --- | --- |
| `needs: check` | check が成功してから動く（失敗したら動かない） |
| `--with-deps` | ブラウザが要る Linux のライブラリも入れる（Mac では要らない） |
| `actions/upload-artifact` | ファイルを、ワークフローの結果の画面からダウンロードできるように残す（**アーティファクト**） |
| `if: failure()` | 前の手順が失敗したときだけ動かす。失敗したテストのトレース（第58章 8.5節）を、手元で `npx playwright show-trace` で開ける |

全部を1つにしたものは、練習問題6で書きます。

## 8. 依存パッケージと main を守る

### 8.1 npm audit と Dependabot

`npm audit` は、入っているパッケージの版に、知られている脆弱性があるかを調べます（第10部 第55章）。CI で毎回動かすと、新しく見つかった脆弱性に、次の push で気づけます。

| オプション | 意味 |
| --- | --- |
| `--omit=dev` | 本番で使うもの（`dependencies`）だけを見る。開発の道具（ESLint など）は、利用者に届かない |
| `--audit-level=high` | high 以上があるときだけ、失敗にする |

直すには、パッケージの版を上げます。**Dependabot** は、GitHub が依存パッケージの新しい版を見つけて、版を上げるプルリクエストを作ってくれる機能です。リポジトリの直下の `.github/dependabot.yml` に書きます（[samples/github/dependabot.yml](samples/github/dependabot.yml)）。

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 7
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

| 書いたもの | 意味 |
| --- | --- |
| `package-ecosystem: npm` | `package.json` を見る。`github-actions` はワークフローの `uses:` の版を見る |
| `schedule.interval: weekly` | 週に1回調べる |
| `cooldown.default-days: 7` | 出てから 7 日たっていない版は、まだ提案しない（出たばかりの版の事故や、乗っ取られた版を避ける。第3部 第14章） |
| `groups` | 小さな更新（minor・patch）を、1つのプルリクエストにまとめる |

Dependabot のプルリクエストにも CI が動くので、テストが通れば、安心してマージできます。これが「テストと CI を整える」いちばんの見返りです。項目の名前は変わることがあるので、必ず GitHub の公式の「Dependabot options reference」で確認してください。

### 8.2 ブランチの保護

CI が ✗ でも、マージのボタンは押せてしまいます。GitHub のリポジトリの設定で、**main に入れる前に CI が通っていること**を必須にします。執筆時点では、リポジトリの Settings → Rules → Rulesets（または Settings → Branches）で、次を選びます（画面は変わることがあるので、必ず GitHub の公式の「About rulesets」で確認してください）。

| 設定 | 意味 |
| --- | --- |
| 対象のブランチ: `main` | |
| Require a pull request before merging | main に直接 push させない |
| Require status checks to pass（`check` を選ぶ） | ジョブ `check` が ✓ でないと、マージできない |

これで、「テストを壊した変更は main に入らない」が、人の注意ではなく、仕組みで守られます。

## 9. CI の結果を読みやすくする

CI が失敗したら、GitHub の Actions の画面で、失敗した手順のログを読みます。ESLint のような道具は、ログに**注釈**（annotation）の形で書くと、プルリクエストの「Files changed」の、その行のそばに出せます。GitHub Actions は、手順が標準出力に次の形の行を書くと、注釈として読みます（**ワークフローコマンド**）。

```
::error file=src/orders.ts,line=21,col=20,title=eqeqeq::Expected '===' and instead saw '=='.
```

| 部分 | 意味 |
| --- | --- |
| `::error` | 重さ。`::warning`・`::notice` もある |
| `file=…,line=…,col=…` | どのファイル（リポジトリの直下から数えた場所）の、どこか |
| `title=…` | 見出し |
| `::` の後ろ | 文。`%`・改行は `%25`・`%0D`・`%0A` に書き換える |

ESLint の結果は、`--format json` で JSON として受け取れます。

```sh
$ npx eslint . --format json --output-file eslint.json
```

この JSON から注釈の行を作る道具を、練習問題7で書きます。

## 10. Flask（Python）との対応

| Flask・Python | この章 |
| --- | --- |
| flake8・Ruff（リンター） | ESLint |
| `# noqa: E501` | `// eslint-disable-next-line ルール -- 理由` |
| flake8 のプラグイン・Ruff のルールの選択 | ESLint のプラグイン・`rules` |
| Black・Ruff format | Prettier |
| mypy | `tsc` |
| `pyproject.toml` の `[tool.ruff]` | `eslint.config.js`・`.prettierrc.json` |
| `Makefile` や tox・nox で `lint` と `test` をまとめる | npm scripts の `check` |
| `pip-audit` | `npm audit` |
| GitHub Actions の `actions/setup-python` | `actions/setup-node` |

## まとめ

- 静的解析は、動かさずに全部の行を同じ決まりで見る。テストとは役割が違い、両方使う。
- ESLint の指摘は、ルールの名前で調べ、ルールを止めずにコードを直す。止めるときは1行だけ、理由を書く。
- 設定はフラットな設定。`files` で場所を決め、`extends` でルールの組を読み、`rules` で重さとオプションを変える。後に書いたものが勝つ。CI では `--max-warnings 0`。
- チームの決まりは、自分でルールにできる。AST の形を見て書き、RuleTester で確かめる。
- 見た目は Prettier、間違いは ESLint。eslint-config-prettier を最後に置いて、ぶつからないようにする。
- `npm run check` で全部を確かめ、GitHub Actions で push のたびに同じものを動かす。権限は最小に、時間には上限を。
- Dependabot と `npm audit` で依存パッケージを見張り、ブランチの保護で、CI が通らないものを main に入れない。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- ESLint Docs「Configuration Files」「Rules」「Custom Rules」「RuleTester」: https://eslint.org/docs/latest/use/configure/configuration-files ・ https://eslint.org/docs/latest/rules/ ・ https://eslint.org/docs/latest/extend/custom-rules
- typescript-eslint「Linting with Type Information」: https://typescript-eslint.io/getting-started/typed-linting
- eslint-plugin-regexp: https://ota-meshi.github.io/eslint-plugin-regexp/
- Prettier Docs「Options」「Integrating with Linters」: https://prettier.io/docs/options ・ https://prettier.io/docs/integrating-with-linters
- GitHub Docs「Workflow syntax for GitHub Actions」「Workflow commands」「Creating PostgreSQL service containers」「Storing and sharing data from a workflow」: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax ・ https://docs.github.com/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs「Dependabot options reference」「About rulesets」: https://docs.github.com/code-security/dependabot ・ https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- AST explorer: https://astexplorer.net/

---

第11部の目次: [../README.md](../README.md) ／ 前の章: [第58章 フロントエンドのテスト](../ch58-frontend-testing/README.md) ／ 次: [成果物 テストと CI が整ったアプリ](../project-task-quality/README.md)
