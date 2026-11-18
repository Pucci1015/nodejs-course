# 第11部 テストとコード品質

第10部までで、ログインできるタスク管理アプリができました。テストも書いてきましたが、「どんなテストを、どこまで書けばよいか」は、まだ決めていませんでした。この部では、**テストを「仕様を例で書いたもの」として書く方法**を学びます。関数のテスト、API とデータベースのテスト、画面のテスト、本物のブラウザで通す E2E、と層ごとに道具を使い分け、最後に、動かさずに間違いを見つける静的解析（ESLint）と、push のたびに全部を確かめる CI（GitHub Actions）を整えます。成果物で、タスク管理アプリのテストを層で分け、E2E と CI を足します。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第56章 テストの考え方](ch56-testing-basics/README.md) | テストは仕様を例で書いたもの、`assert` の使い分け、表で回す・境界の値、読みやすいテスト、「今」と時間を決める（`mock.timers`）、外とのやりとりを偽物に（`mock.fn`）、テストの層、カバレッジ、ミュータントでテストを確かめる | 4〜5時間 |
| [第57章 API とデータベースのテスト](ch57-api-db-testing/README.md) | テストの中でアプリを起動する、応答を必要なだけ確かめる、偽物のリポジトリでサービスを速く確かめる、テスト用のスキーマで本物のデータベース、契約テスト、テストの中のトランザクション、外の API の偽物 | 5〜6時間 |
| [第58章 フロントエンドのテスト](ch58-frontend-testing/README.md) | Vitest と jsdom、Testing Library（役割と名前で探す）、user-event、API を読む部品、フェイクタイマー、不安定なテストを避ける、Playwright の E2E、どこまでをどのテストで | 5〜6時間 |
| [第59章 静的解析と CI](ch59-lint-ci/README.md) | ESLint の設定と指摘の読み方、eslint-plugin-regexp（ReDoS）、自分でルールを作る（RuleTester）、Prettier、`npm run check`、GitHub Actions、`npm audit` と Dependabot、ブランチの保護 | 4〜5時間 |
| [成果物 テストと CI が整ったアプリ](project-task-quality/README.md) | 第10部のアプリのテストを層（単体・契約・HTTP）で分け、Playwright の E2E・ESLint と Prettier・GitHub Actions を足す | 6〜10時間 |

## 準備

第11部のサンプルと練習問題は、外部のパッケージ（Vitest・Testing Library・Playwright・ESLint のプラグイン・Prettier など）を使います。第5〜10部と同じく、**第11部のフォルダを `~/dev/part11` にコピーし、そこで動かします**。第56章の最初に、次を1回だけ実行します。

```sh
$ bash （ここに Finder から part11-testing フォルダの中の setup-part11.sh をドラッグ）
```

- `~/dev/part11` が作られ、`npm ci` でパッケージが入ります。終わったら `cd ~/dev/part11/ch56-testing-basics` で第56章のフォルダに移ります
- [setup-part11.sh](setup-part11.sh) は、作成先（既定 `~/dev/part11`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（vitest 4.1.12、@testing-library/react 16.3.3、@playwright/test 1.63.0、eslint 10.13.0、eslint-plugin-regexp 3.3.3、prettier 3.9.10、express 5.3.0、pg 8.23.1、react 19.3.1、typescript 6.0.3 など）
- Playwright が動かすブラウザ（Chromium）は、第58章 8.1節で `npx playwright install chromium` を打って入れます
- 第57章の5節からと成果物は、PostgreSQL を使います。第6部の `compose.yaml`（`~/dev/part06` で `docker compose up -d --wait`）のものです
- 成果物だけは、`~/dev/task-api` で進めます（[project-task-quality/README.md](project-task-quality/README.md) の1節）

## 各章の使い方

第1〜10部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている。「手を動かす」の節で、ファイルを自分で書いて動かす |
| `samples/` | 「手を動かす」で書くプログラムの完成形（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- コードは第7部からと同じく TypeScript（`.ts`・`.tsx`）です。API の側は `node --test x.test.ts`、画面の側は `npx vitest run x.test.tsx`、E2E は `npx playwright test` で動かします
- この部には「**テストを書く**」練習問題があります。書いたテストが、正しい実装では通り、わざと壊した実装（ミュータント。`exercises/mutants/`）では落ちれば完成です。[tools/check-tests.ts](tools/check-tests.ts) がそれを確かめます（第56章 9節）
- 「コードを書く」練習問題は、これまでと同じく `node --test x.test.ts` で確かめます。模範解答は `MODULE=../solutions/x.ts node --test x.test.ts` のように指定して確かめられます
- サーバは `127.0.0.1` だけで待ち受けます。ポートは、第57章 9717、第58章 9720〜9728（API 9727・画面 9728、テストの中では 9721〜9724）です。第56・59章はポートを使いません。成果物は、テストに 9491〜9494、E2E に 9495〜9498 を使います（開発の API 9490・画面 5173 とはぶつかりません）
- データベースを使うテストは、データベース `taskapi` の中に `test_` で始まるスキーマを作り、終わったら消します。第6〜10部の成果物の `public` のテーブルには触りません
- パスワードなどの値は、`dev-only-…` で始まる開発用の仮のものです。例のメールアドレスは `alice@example.com`・`bob@example.com` です
- GitHub Actions（第59章・成果物）は、GitHub に push して初めて動きます。執筆の環境からは GitHub で動かせなかったので、ワークフローは YAML として正しく読めることと、各コマンドが手元で通ることだけを確かめてあります
- Python と比べる説明では、pytest・coverage.py・Ruff などが何をしているかを説明してから、Node.js で同じことを書きます

## 第11部を終えたときにできること

- テストを「仕様を例で書いたもの」として、境界の値を表にし、読みやすく、壊れにくく書ける
- 「今」・タイマー・外とのやりとりを、引数や偽物で決めて、毎回同じ結果になるテストにできる
- 単体・結合・E2E の層を説明し、どの決まりをどの層で確かめるかを決められる
- API を、テストの中で起動して HTTP で確かめ、偽物のリポジトリと本物のデータベースを契約テストでそろえられる
- 画面の部品を、役割と名前で探し、人と同じように操作して確かめられる。Playwright で、画面から API まで通して確かめられる
- カバレッジとミュータントで、テストが足りない所を見つけられる
- ESLint の指摘を読んで直し、設定を場所ごとに変え、自分のルールを書ける。Prettier で見た目をそろえられる
- GitHub Actions で、push のたびに型・lint・テスト・E2E を動かし、依存パッケージの脆弱性を見張れる

## 第11部で作るもの

- 境界を表にしたテスト、時刻とタイマーを決めたテスト、`mock.fn` で送り先を確かめるテスト、ミュータントを見つけるテスト（第56章）
- テストの中で起動する API のテスト、偽物のリポジトリ、テスト用のスキーマ、契約テスト、外の API の偽物のサーバ（第57章）
- 部品・フォーム・API を読む部品・フックのテスト、不安定なテストの直し方、Playwright の E2E（第58章）
- ESLint の設定、自作のルール（`no-focused-tests`・`prefer-role-query`・`no-fixed-wait`）、Prettier、`npm run check`、GitHub Actions のワークフロー、ESLint の結果を GitHub の注釈にするコマンド（第59章）
- テストを層で分け、E2E と CI を足したタスク管理アプリ（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第10部 認証とセキュリティ](../part10-auth-security/README.md) ／ 次: [第12部 デプロイと運用](../part12-deploy/README.md)
