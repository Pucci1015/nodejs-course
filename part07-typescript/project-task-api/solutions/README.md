# 第7部の成果物 完成例（`task-api` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。第6部の完成例（`part06-database/project-task-api/solutions`）を、動きを変えずに TypeScript にしたものです。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | `npm start`・`npm run dev`・`npm run migrate`・`npm test` に、`typecheck`・`lint`・`check` を足した。`devDependencies` に TypeScript・型定義・ESLint を足した |
| [tsconfig.json](tsconfig.json) | 第7部の `tsconfig.base.json` と同じ設定に、`"include": ["src", "test"]` を足したもの |
| [eslint.config.js](eslint.config.js) | 第37章 6節の設定に、`test/` だけ `no-unsafe-…` を止める設定を足したもの |
| [mise.toml](mise.toml) | Node.js のバージョン |
| [.env.example](.env.example) | 設定の例。`.env` にコピーして使う。`PORT` の既定を 9490 にした |
| [.gitignore](.gitignore) | `node_modules/` と `.env` をコミットしない |
| [migrations/](migrations/) | マイグレーションの SQL（第6部のまま） |
| [src/](src/) | API のコード（すべて `.ts`） |
| [test/](test/) | 外から HTTP で確かめるテスト（30 個） |

## 動かし方

PostgreSQL を先に動かします（第6部 第32章 2節）。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
$ cp -R ~/dev/part07/project-task-api/solutions ~/dev/task-api-example7
$ cd ~/dev/task-api-example7
$ npm ci             # package-lock.json のとおりに入れる
$ cp .env.example .env
$ npm start          # node src/server.ts。http://127.0.0.1:9490/api/tasks
$ npm run check      # tsc → ESLint → 30 個のテスト（127.0.0.1:9491 と 9492 を使う）
```

- `~/dev/part07` には、`setup-part07.sh` で `npm ci` 済みの `node_modules` がありますが、`cp -R` は `solutions` の中だけをコピーするので、コピー先で `npm ci` が要ります。

## 作りの要点（第6部から変えた所）

- **足したもの・変えたものの印**: 第7部で足した所は `// 追加（第7部）:`、変えた所は `// 変更（第7部）:` です
- **形は types.ts に**: `Task`・`Status`・`Sort`・`interface TaskRepo`・`interface IdempotencyStore`・`IdempotencyRecord`（判別できるユニオン）。どの層も、ここから `import type` します
- **as は1か所だけ**: `server.ts` の `server.address() as AddressInfo` だけです（`listen` の後の TCP のサーバなので、必ず `AddressInfo`）。ほかは、絞り込み（`instanceof`・`in`・`typeof`）、型ガード（`isStatus`）、Zod、`satisfies` で書いています
- **外から来るものは Zod で**: ボディ・クエリ・環境変数（第6部のまま）に、カーソルの中身（`lib/cursor.ts`）と、冪等キーの表の `response` 列（`repositories/pg-idempotency.ts`）を足しました
- **表と型をそろえる**: `pg-tasks.ts` の `COLUMNS`（項目 → 列）と `SORT_SQL`（並べ方 → 列）は `satisfies Record<…>` で、`Task` や `Sort` に項目が増えたときに、書き忘れを `tsc` が見つけます
- **ESLint が見つけたもの**: `server.close(async () => …)` は、`server.close` が Promise を待たないので、片付けの失敗にだれも気づきません（`no-misused-promises`）。`cleanup().catch(…)` にしました
- **変えていないもの**: 動き（応答の形・ステータス・ヘッダ）、SQL、マイグレーション、層の分け方

## テストが確かめないこと

- 型が正しいこと。これは `npm run typecheck` と `npm run lint` が確かめます（`npm run check` で3つまとめて）
- ログの中身（秘密の値が書かれていないか）。テスト 25・30 は、一部だけを確かめます。`LOG_LEVEL=info npm start` で動かして、目で確かめてください
- 作業中（`doing`）の数の上限を、同時に超えようとしたとき（第6部の成果物 5節）
- `SHUTDOWN_TIMEOUT_MS` の時間切れ
