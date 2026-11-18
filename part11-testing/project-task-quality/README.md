# 第11部の成果物 テストと CI が整ったアプリ

第10部までで、ログインできるタスク管理アプリ（`~/dev/task-api` の API と `web/` の画面）ができました。テストもあります（API 45 個・画面 34 個）。でも、テストはどれも「サーバを起動して外から確かめる」か「偽の API で画面を確かめる」もので、遅く、本物の画面と本物の API をつないだ確かめ（第10部の成果物 4.2節）は、手でしていました。第11部のまとめとして、**テストを層で分け、通しの流れを E2E で自動にし、lint と書き方をそろえ、push のたびに GitHub Actions で全部を動かします**。

第56〜59章で学んだことを組み合わせます。表で回すテストと時刻の固定（第56章）、偽物のリポジトリ・契約テスト・テスト用のスキーマ（第57章）、Playwright の E2E（第58章）、ESLint・Prettier・`npm run check`・GitHub Actions（第59章）です。完成例と同じく、API の `npm run check`（89 個のテスト）・画面の `npm run check`（34 個）・`npm run e2e`（2 個）がすべて通り、GitHub の Actions で3つのジョブが緑になれば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜10時間 |
| 前提 | 第10部の成果物（`~/dev/task-api` のブランチ `part10-auth`）、第56〜59章、第6部の PostgreSQL（`~/dev/part06` の `compose.yaml`）、GitHub のリポジトリ（第1部 第3章） |
| 作るもの | `~/dev/task-api` に、単体テスト・契約テスト・E2E・Prettier と ESLint の設定・`.github/workflows/ci.yml`・`.github/dependabot.yml` を足す。アプリの動きは変えない |
| 確かめ方 | `npm run check`・`npm run e2e`・`web/` で `npm run check` が手元で通り、GitHub に push して Actions が緑になる |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（API の `task-api` パッケージと、画面の `web/`）。第10部の完成例に、この README の要件を足したもの |

> **読み方**
> - 作業は `~/dev/task-api` で、新しいブランチ `part11-testing` を作って行います（1節）。
> - 第10部の成果物と違い、**テストそのものが作るもの**です。2節の要件の表を見て、自分でテストを書いてください。書けたら、完成例（[solutions/test/](solutions/test/)・[solutions/e2e/](solutions/e2e/)）と見比べます。
> - アプリのコード（`src/`・`web/src/`）は、ESLint の指摘で直す所（3.4節）のほかは、変えなくてかまいません。テストを書いていて間違いを見つけたら、直してかまいません（`// 修正（第11部）:`）。
> - GitHub Actions は、GitHub に push して初めて動きます（5節）。**執筆の環境からは GitHub で動かせなかった**ので、完成例は、YAML として正しく読めることと、各ジョブのコマンドが手元で通ることだけを確かめてあります。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| テストを層で分け、速いテストを先に動かす | 第12部（デプロイの前に、CI で全部を確かめる）、第13部（自分の題材のテストを決める） |
| 偽物を契約テストで本物とそろえる | 第12部 第63・64章（オブジェクトストレージ・キューの偽物を作るとき） |
| E2E を CI で動かし、失敗したらトレースを残す | 第12部（本番に近い環境で、通しの流れを確かめる） |
| GitHub Actions のジョブとサービス | 第12部 第62章（テストが通ったら、デプロイまで自動にする） |

---

## 1. 準備

### 1.1 ブランチを作る

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part10-auth             # 第10部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part11-testing       # 新しいブランチを作って、そこに移る
```

### 1.2 パッケージと設定をコピーする

完成例から、パッケージの一覧と、Prettier・ESLint の設定をコピーします。テストは自分で書くので、コピーしません。`P=~/dev/part11/project-task-quality/solutions` としておくと、短く書けます。

```sh
$ P=~/dev/part11/project-task-quality/solutions
$ cp $P/package.json $P/package-lock.json $P/eslint.config.js $P/.prettierrc.json $P/.prettierignore $P/.gitignore .
$ npm ci
$ npx playwright install chromium    # E2E のブラウザ（第58章 8.1節で入れていれば、すぐ終わる）
$ cp $P/web/package.json web/
$ (cd web && npm ci)                 # scripts を変えただけなので、package-lock.json はそのまま使える
```

| コピーしたもの | 中身 |
| --- | --- |
| `package.json`・`package-lock.json` | 第10部のものに、`@playwright/test` 1.63.0・`prettier` 3.9.10・`eslint-config-prettier` 10.1.8・`eslint-plugin-regexp` 3.3.3 と、scripts（2.6節）を足したもの（第11部の章と同じ版） |
| `eslint.config.js` | 第10部の設定に、regexp と prettier を足したもの（3.4節） |
| `.prettierrc.json`・`.prettierignore` | 第59章 5節と同じ設定。`package-lock.json`・`common-passwords.txt` などは整えない |
| `.gitignore` | `test-results/`・`playwright-report/`・`coverage/` を足したもの |
| `web/package.json` | `lint` に `--max-warnings 0` を付けたもの（ほかは同じ） |

`tsconfig.json` の `include` には、E2E のファイルを足します。

```json
  "include": ["src", "test", "e2e", "playwright.config.ts"]
```

---

## 2. 要件

### 2.1 テストのフォルダ

`test/` を、層ごとのフォルダに分けます（第56章 7節）。

| フォルダ | 層 | 中身 | PostgreSQL |
| --- | --- | --- | --- |
| `test/unit/` | 単体 | サービスとパスワードの決まり（2.2節） | 要らない |
| `test/contract/` | 契約 | `TaskRepo` の約束（2.3節） | 要る |
| `test/http/` | HTTP | 第10部の `api.test.ts`・`auth.test.ts`（中身は変えない） | 要る |
| `test/support/` | | 道具。第10部の `helpers.ts`・`fake-smtp.ts`・`mini-idp.ts` と、足す `memory-tasks.ts`・`test-db.ts` | |

- `npm test` は `node --test "test/**/*.test.ts"` で、全部のフォルダのテストを動かす
- `npm run test:unit` は `test/unit/` だけを動かし、PostgreSQL を止めていても通る

### 2.2 単体テスト（`test/unit/`）

`src/services/tasks.ts` を、メモリの偽物のリポジトリと決まった時刻で確かめます。少なくとも、次の決まりを確かめてください。

| 決まり | 確かめ方の例 |
| --- | --- |
| 作ると、題名の前後の空白を除き、`todo`・版 1・今の時刻になり、`task.created` を知らせる | `publish` に、知らせを配列に記録する関数を渡す |
| 題名は 1〜100 文字。空白だけは 0 文字 | 境目（0・1・100・101 文字）を表で回す（第56章 3節） |
| 期限は、**日本時間の**今日なら作れ、昨日なら `ValidationError` | 「今」を `2026-12-09T15:30:00Z`（日本時間では 12-10、UTC では 12-09）に決める |
| 終わっていない同じ題名があれば `ConflictError` で、知らせない | `seed` で、始めからタスクを入れておく |
| 作業中は `maxDoing` 個まで。超えたら `ConflictError` で、変わらない | `maxDoing: 2` で作る |
| 何も変わらない更新では、版を上げず、知らせない | 題名に前後の空白だけを足して送る |
| 客が見ていた版が古ければ `PreconditionFailedError` | `expectedVersion` を渡す |
| 無いタスクは `NotFoundError`。消すと `task.deleted` を知らせる | |

`src/auth/policy.ts` の `checkPassword` も、境目（11・12・128・129 文字、絵文字、全角、メールアドレスの `@` の前を含む）を表にして確かめます。

### 2.3 契約テスト（`test/contract/`）

- `taskRepoContract(name, makeRepo)` を書き、`TaskRepo`（`src/types.ts`）の約束を並べる。`makeRepo` は、テストごとに空のリポジトリを返す関数
- 同じ約束を、メモリの偽物と PostgreSQL（`createPgTaskRepo`）の両方に動かす
- PostgreSQL の側は、テスト用のスキーマ（`test_` で始まる名前）を作り、アプリと同じマイグレーション（`migrate(pool)`）で表を作る。終わったらスキーマごと消す
- 少なくとも、次の約束を確かめる

| 約束 |
| --- |
| `insert` すると `id` が付き、`get` で同じものが読める |
| 無い `id` では、`get` は `null`、`update` は `null`、`remove` は `false` |
| 終わっていない同じ題名は `ConflictError`。終わっていれば作れる |
| `findOpenByTitle` は、終わっていないものだけ。`exceptId` は除く |
| `countByStatus` |
| `expectedVersion` が違えば、`update` は `null`、`remove` は `false` で、何も変わらない |
| `listPage` の並べ方（期限の無いものは最後）・`limit` と `hasMore`・`after` で次のページ・`statuses` と `dueBefore` |
| 返したタスクを書き換えても、覚えているものは変わらない |

- PostgreSQL だけの約束として、「別の人のタスクは、読めず、変えられず、消せない」も確かめる

### 2.4 E2E（`e2e/`）

`npm run e2e`（`playwright test`）で、次の2つを確かめます。

| テスト | 流れ |
| --- | --- |
| 通しの流れ | `/register` で登録 → 偽の SMTP サーバに届いたメールのリンクを開く → 「メールアドレスを確かめる」→ ログイン → 新しいタスク「牛乳を買う」を作る → 一覧に出る → ログアウトするとログインのページ → `/` を開くと `/login?next=…` に移る |
| 人ごとの分離 | alice がタスクを作る。bob が画面からログインすると、一覧に出ない。`/tasks/（alice のタスクの id）` を開くと「ページが見つかりません」 |

- `playwright.config.ts` の `webServer` で、偽の SMTP サーバ（SMTP 9497・見る所 9498）・API（9495）・画面（9496）を起動する。手元では、動いていれば使い回し、CI では毎回起動する
- API は、データベース `taskapi` の中のスキーマ `e2e` を使い、起動のたびに作り直す（`public` のテーブルには触らない）
- ボタン・欄・見出しは、第10部の成果物 2.8節の名前（役割と名前）で探す
- 2つ目のテストの準備（2人の登録と確認、alice のタスク）は、画面を通さず API で済ませてよい

### 2.5 lint と書き方

- `npm run lint` は `eslint . --max-warnings 0` で、指摘が 0 個（warning も失敗）
- ESLint に eslint-plugin-regexp のおすすめと、eslint-config-prettier（いちばん最後）を足す
- `eslint-disable` のコメントで指摘を消さない（直すか、理由を書いて設定でルールを止める。3.4節）
- `npm run format:check`（`prettier --check .`）が通る。`web/` も、リポジトリの直下の Prettier で整える

### 2.6 npm scripts

| スクリプト | 中身 |
| --- | --- |
| `typecheck` | `tsc` |
| `lint` | `eslint . --max-warnings 0` |
| `format`・`format:check` | `prettier --write .`・`prettier --check .` |
| `test` | `node --test "test/**/*.test.ts"` |
| `test:unit` | `node --test "test/unit/*.test.ts"` |
| `coverage` | テストを動かして `src/` のカバレッジを表にする。行が 85% を下回ると失敗（3.6節） |
| `e2e` | `playwright test` |
| `check` | `typecheck` → `lint` → `format:check` → `test`（`&&` でつなぐ） |

### 2.7 GitHub Actions と Dependabot

`.github/workflows/ci.yml`:

| ジョブ | 中身 |
| --- | --- |
| `api` | PostgreSQL 18 のサービス（第59章 練習問題6と同じ設定、ポート 5433）。`npm ci --ignore-scripts` → `npm run check` → `npm audit --omit=dev --audit-level=high` |
| `web` | `web/` で、`npm ci --ignore-scripts` → `npm run check` → `npm audit --omit=dev --audit-level=high` |
| `e2e` | `api` と `web` が通ってから。PostgreSQL のサービス、両方の `npm ci`、`npx playwright install --with-deps chromium`、`npm run e2e`。失敗したときだけ `test-results` を 7 日残す |

- `main` への push とプルリクエストで動く。`permissions: contents: read`。同じブランチの古い実行は止める（`concurrency`）
- `.github/dependabot.yml` で、`/`（API）・`/web`（画面）の npm と、`github-actions` を毎週。npm は出てから 7 日たった版だけ、小さな更新はまとめる

---

## 3. 作り方のヒント

### 3.1 テストを移す

`git mv` でファイルを移すと、Git が「移した」と分かるので、履歴が続きます。

```sh
$ mkdir -p test/support test/http test/unit test/contract
$ git mv test/helpers.ts test/fake-smtp.ts test/mini-idp.ts test/support/
$ git mv test/api.test.ts test/auth.test.ts test/http/
```

| コマンド | 意味 |
| --- | --- |
| `mkdir -p a b c` | フォルダをまとめて作る。`-p` は、もうあっても失敗しない |
| `git mv 元 先` | ファイルを移し、そのことを次のコミットに入れる |

移したら、`test/http/` の2つのファイルの `import` を `'./helpers.ts'` → `'../support/helpers.ts'`（`mini-idp.ts` も同じ）に直します。`helpers.ts` の中のサーバの場所は `import.meta.dirname` から数えているので、1つ深くなった分を直します（完成例では、`API_SERVER` の意味を変えないように、`path.resolve(import.meta.dirname, '..', …)` にしました）。

```sh
$ npm test
…
ℹ tests 45
ℹ pass 45
ℹ fail 0
```

45 個が、移す前と同じように通れば、次に進みます。

### 3.2 偽物のリポジトリと契約テスト

偽物は、第8部の練習用の API のものを使います。`import` の場所を直し、始めの状態を渡せるように `seed` を足します（第57章 4.1節）。

```sh
$ cp ~/dev/part08/api/repositories/memory-tasks.ts test/support/
```

```ts
export function createMemoryTaskRepo(seed: Task[] = []): TaskRepo {
  const tasks = new Map<number, Task>(seed.map((t) => [t.id, { ...t }]));
  let nextId = Math.max(0, ...seed.map((t) => t.id)) + 1;
```

契約テストは、第57章 6節の `repoContract` と同じ形です。第10部の `createPgTaskRepo(pool, ownerId)` は持ち主で絞るので、**テストごとに新しいユーザーを作れば、空のリポジトリ**になります（`TRUNCATE` しなくてよい）。

```ts
taskRepoContract('メモリ', async () => createMemoryTaskRepo());
taskRepoContract('PostgreSQL', async () => createPgTaskRepo(db.pool, await db.newUser()));
```

2.3節の約束を全部書くと、偽物のほうで1つ失敗するはずです（執筆の環境での結果）。

```sh
$ node --test test/contract/task-repo.test.ts
…
  ✖ 返したタスクを書き換えても、覚えているものは変わらない (1.186658ms)
✖ TaskRepo の約束: メモリ (141.008913ms)
ℹ tests 19
ℹ pass 18
ℹ fail 1
```

偽物の `findOpenByTitle` は、`Map` の中のオブジェクトを、そのまま返していました。呼んだ側が書き換えると、覚えているタスクまで変わります。PostgreSQL のリポジトリは、毎回 SQL の結果から新しいオブジェクトを作るので、こうはなりません。**偽物が本物と違う動きをしていたことを、契約テストが見つけた**わけです。`get` と同じように `{ ...found }` でコピーを返すように直します。

### 3.3 単体テスト

単体テストは、`setup()` のような関数で、サービスと記録の配列をまとめて作ると短く書けます。

```ts
function setup(seed: Task[] = [], options: { maxDoing?: number } = {}) {
  const repo = createMemoryTaskRepo(seed);
  const events: string[] = [];
  const service = createTaskService({ repo, clock, ...options, publish: (type, task) => events.push(`${type}:${task.id}`) });
  return { repo, service, events };
}
```

`publish` に `t.mock.fn()`（第56章 6.1節）を渡してもかまいません。ここでは「何を、どの順で知らせたか」を `'task.created:1'` のような文字列の配列で比べたいので、自分で記録しました。

```sh
$ npm run test:unit
…
ℹ tests 25
ℹ pass 25
ℹ fail 0
ℹ duration_ms 177.781227
```

### 3.4 ESLint の regexp と Prettier

設定をコピーした後に `npx eslint .` を動かすと、執筆の環境では、regexp のルールで 24 個の指摘が出ました。

| ルール | 数 | どうしたか |
| --- | --- | --- |
| `regexp/use-ignore-case` | 9 | 止めた（`[A-Za-z]` を `i` フラグにする、という書き方の好み） |
| `regexp/prefer-w` | 7 | 止めた（`[A-Za-z0-9_]` を `\w` に） |
| `regexp/prefer-d` | 5 | 止めた（`[0-9]` を `\d` に） |
| `regexp/no-unused-capturing-group` | 2 | 直した（`(ql)?` → `(?:ql)?`） |
| `regexp/no-super-linear-backtracking` | 1 | 直した（`test/support/helpers.ts` の SSE の行の読み方） |

おすすめの設定には、間違いを見つけるルールと、書き方の好みのルールが混ざっています。好みのルールは、チームで決めて `off` にしてかまいません（第59章 2.3節）。この教材では、これまでの章の書き方（`[0-9]`、`[A-Za-z]`）のほうが初めて読む人に分かりやすいので、止めました。止めるときは、`eslint.config.js` に理由のコメントを書きます。

```js
      // regexp のおすすめのうち、書き方の好みだけのもの（[0-9] を \d に、など）は止める
      'regexp/prefer-d': 'off',
      'regexp/prefer-w': 'off',
      'regexp/use-ignore-case': 'off',
```

`no-super-linear-backtracking` は、SSE の1行を「最初の `:` の前と後」に分ける `/^([^:]*):? ?(.*)$/` でした。`:` の無い行では、`[^:]*` と `.*` が同じ文字を取り合い、長い行で時間がかかります（第59章 3節）。正規表現をやめて、`indexOf(':')` と `slice` で書き直しました（[solutions/test/support/helpers.ts](solutions/test/support/helpers.ts)）。

Prettier は、最初に1回だけ全部を整えます。見た目だけの変更なので、**ほかの変更と混ぜずに、それだけのコミット**にすると、後で `git log -p` を読むときに分かりやすくなります。

```sh
$ npx prettier --check .          # 整っていないファイルが、数十個並ぶ
$ npm run format                  # 全部を整える（web/ も）
$ npm run check                   # 整えても、テストが通ることを確かめる
$ git add -A
$ git commit -m "Prettier で全体を整える"
```

### 3.5 E2E

E2E の設定は、[solutions/playwright.config.ts](solutions/playwright.config.ts) を見ながら書きます。第58章 8節の設定と違うのは、起動するサーバが3つあることと、API の前にデータベースを準備することです。

```ts
    {
      command: 'node e2e/prepare-db.ts && node src/server.ts',
      env: { NODE_ENV: 'test', PORT: '9495', DATABASE_SCHEMA: 'e2e', APP_URL: 'http://127.0.0.1:9496', SMTP_PORT: '9497', … },
      url: 'http://127.0.0.1:9495/healthz',
      reuseExistingServer: !process.env.CI,
    },
```

| 書いたもの | 意味 |
| --- | --- |
| `command: 'A && B'` | A（スキーマ `e2e` を作り直す）が成功したら、B（API）を起動する |
| `APP_URL` | メールのリンクの頭と、`Origin` の確かめ（第52章）に使う。画面のオリジン `http://127.0.0.1:9496` にそろえる |
| `url` | ここが答えるまで、テストを始めない |
| `cwd: 'web'`（画面のほう） | `web/` の中で `npx vite …` を動かす |

届いたメールは、偽の SMTP サーバの `http://127.0.0.1:9498/api/messages` から読みます。メールは待たずに送られる（第10部）ので、届くまで `expect.poll` で待ちます。

```ts
await expect
  .poll(async () => {
    const list = await (await request.get(`${MAIL_URL}/api/messages`)).json();
    return list.some((m) => m.to.includes(email));
  })
  .toBe(true);
```

`expect.poll(関数)` は、関数の結果が `toBe(…)` に合うまで、少しずつ間を空けて呼び直します（既定では 5 秒まで）。決まった時間だけ待つ（`waitForTimeout`）のではなく、そうなるまで待つ書き方です（第58章 7節）。

つまずきやすい所（執筆の環境で、実際に失敗したもの）:

| 失敗 | 理由と直し方 |
| --- | --- |
| `strict mode violation: getByRole('link', { name: '新しいタスク' }) resolved to 2 elements` | 一覧のページに「新しいタスクを作る」のリンクもある。名前は、既定では部分一致。`{ name: '新しいタスク', exact: true }` |
| `getByLabel('題名') resolved to 2 elements`（並べ方の `<select>` と、題名で絞り込む欄） | リンクを押した直後で、まだ一覧のページだった。先に `await expect(見出し「新しいタスク」).toBeVisible()` で移り終わるのを待ち、`getByRole('textbox', { name: '題名', exact: true })` で探す |

```sh
$ npm run e2e
Running 2 tests using 1 worker

  ✓  1 [chromium] › e2e/auth-flow.spec.ts:7:1 › 登録 → 確認のメールのリンク → ログイン → タスクを作る → ログアウト (1.5s)
  ✓  2 [chromium] › e2e/auth-flow.spec.ts:49:1 › 別の人のタスクは、一覧にも、そのタスクのページにも出ない (1.1s)

  2 passed (5.1s)
```

`CI=1 npm run e2e` で、サーバを使い回さない（CI と同じ）動かし方も試しておきます。執筆の環境では、3回続けて動かして、3回とも通りました。`CI` があると、`playwright.config.ts` の `reporter` に `github` も加わり、最後に `::notice title=🎭 Playwright Run Summary::  2 passed (4.9s)` のような行が出ます。第59章 9節の注釈の行と同じ形で、GitHub の画面では、実行の結果のページに出ます。

### 3.6 カバレッジ

`npm run coverage` は、`node --test --experimental-test-coverage`（第56章 8節）に、`--test-coverage-include="src/**"` と `--test-coverage-lines=85` を付けたものです。HTTP のテストは、サーバを**子プロセス**で動かしますが、Node.js は子プロセスのカバレッジも集めて、1つの表にまとめます。執筆の環境では、次のようになりました（一部）。

```sh
$ npm run coverage
…
ℹ   sse-format.ts       |  39.42 |    72.73 |   50.00 | 39-94 98-104
ℹ  middleware           |        |          |         |
ℹ   idempotency.ts      |  67.23 |    90.91 |   62.50 | 24-60 108-109
…
ℹ all files             |  93.75 |    84.06 |   88.97 |
```

数は、動かすたびに少し変わります（タイマーや、待っている間に通る道が変わるため。新しいフォルダで動かしたときは、全体の行が 94.27% でした）。全体の値より、低いファイルを見ます（第56章 8.2節）。`sse-format.ts` の 39-94 行目は、SSE の**読み手**（`createEventStreamParser`）で、サーバは使っていません（第27章の練習で書いたもの）。`idempotency.ts` の 24-60 行目は、メモリに冪等キーを置く版で、本番は PostgreSQL の版を使います。どちらも「使っていないコード」なので、テストを足すより、消すかどうかを考える所です。下限の 85% は、今の値より少し低くして、「大きく下がったら気付く」ための線にしました。

---

## 4. 確かめ方

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
$ npm run check               # tsc → ESLint → Prettier → 89 個のテスト
$ (cd web && npm run check)   # tsc → ESLint → 34 個のテスト
$ npm run e2e                 # 2 個
```

| どこで | 数 | 中身 |
| --- | --- | --- |
| `test/unit/` | 25 | サービス 16 個、パスワードの決まり 9 個 |
| `test/contract/` | 19 | 約束 9 個 × 2（メモリ・PostgreSQL）と、PostgreSQL だけの1個 |
| `test/http/` | 45 | 第10部と同じ |
| `web/test/` | 34 | 第10部と同じ |
| `e2e/` | 2 | 通しの流れ、人ごとの分離 |

数は、完成例のものです。自分で書いたテストの数は、違っていてかまいません。2節の要件を確かめていること、偽物を使うテストを契約テストが支えていることが大事です。

## 5. GitHub で動かす

`.github/workflows/ci.yml` と `.github/dependabot.yml` を、リポジトリの直下に置いてコミットし、GitHub に push します（第1部 第3章）。

```sh
$ git add -A
$ git commit -m "テストを層で分け、E2E と CI を足す"
$ git push -u origin part11-testing
```

GitHub のリポジトリのページで、プルリクエストを作ります。プルリクエストの下の方に、3つのジョブ（`CI / api`・`CI / web`・`CI / e2e`）が並び、黄色（動いている）→ 緑（通った）か赤（失敗）に変わります。赤なら、「Details」から、どの手順で何が出たかを読みます（第59章 9節）。`e2e` が失敗したときは、Actions の実行のページの下の「Artifacts」から `playwright-results` をダウンロードでき、中のトレースを `npx playwright show-trace` で開けます。

3つとも緑になったら、`main` を守る設定（第59章 8.2節）で、この3つを「通らないとマージできない」チェックにしておきます。

執筆の環境からは GitHub で動かせなかったので、ここに書いた画面の様子は、GitHub の説明に基づくものです。うまく動かないときは、次を確かめてください。

| 症状 | 確かめること |
| --- | --- |
| ワークフローが1つも動かない | `.github/workflows/ci.yml` の場所（リポジトリの直下か）。リポジトリの Settings → Actions で、Actions が許されているか |
| `api` のテストが「PostgreSQL につながりません」 | `services.postgres.ports` が `'5433:5432'` か。`options` の `--health-cmd pg_isready` で、起動しきるまで待っているか |
| `e2e` の `webServer` が時間切れ | `web/` の `npm ci` を忘れていないか（`npx vite` が無い） |
| `npm ci` が「package.json と package-lock.json が合わない」 | 手元で `npm install` してから、`package-lock.json` もコミットしたか |

## 6. もっとやるなら

- **画面の単体テストも層で分ける**: `web/test/` の画面全体のテストから、部品のテスト（第58章 3節）を分ける
- **E2E を増やす**: パスワードの再設定、セッションが切れたときにログインのページへ移る、SSE でほかのタブの変更が出る（2つの `page` を開く）
- **カバレッジを CI で**: `api` のジョブで `npm run coverage` も動かし、下限を下回ったら失敗にする
- **自分のルール**: 第59章の `no-focused-tests`・練習問題の `no-fixed-wait` を `eslint.config.js` に登録する
- **使っていないコードを消す**: 3.6節で見つけた `sse-format.ts` の読み手・メモリの冪等キーを消し、カバレッジがどう変わるか見る

## 7. Python で作るなら

| この成果物 | Python（Flask） |
| --- | --- |
| `node --test`・`test/unit/` などのフォルダ | pytest。`tests/unit/` のようにフォルダを分け、`pytest tests/unit` で絞る |
| 偽物のリポジトリと契約テスト | 同じ考え方。pytest の `@pytest.fixture(params=[…])` で、同じテストを2つの実装に動かせる |
| `test-db.ts`（テスト用のスキーマ） | pytest のフィクスチャで、テストのデータベースを作って消す（pytest-postgresql など） |
| Playwright（`@playwright/test`） | Playwright for Python（`pytest-playwright`）。API は同じ考え方 |
| ESLint・Prettier | Ruff（lint と整形の両方）、または flake8 と Black |
| `tsc` | mypy・Pyright |
| GitHub Actions | 同じ。`actions/setup-python` を使う |

## 8. 次の部へ

第12部では、このアプリを本番に出します。テストと CI が整ったので、「CI が緑なら、デプロイしてよい」という流れを作れます。コンテナにする（第61章）、クラウドに置く（第62章）、画像を添付する（第63章）、メールをバックグラウンドで送る（第64章）と、作るものが増えても、この部で作ったテストが、壊していないことを毎回確かめてくれます。

---

前: [第59章 静的解析と CI](../ch59-lint-ci/README.md) ／ 第11部の目次: [../README.md](../README.md) ／ 次: [第12部 デプロイと運用](../../part12-deploy/README.md)
