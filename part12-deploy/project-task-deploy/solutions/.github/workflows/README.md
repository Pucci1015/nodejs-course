# .github/workflows — GitHub Actions のワークフロー

| ファイル         | 中身                                                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ci.yml](ci.yml) | `api`（PostgreSQL つきで `npm run check` と `npm audit`）、`web`（`web/` で `npm run check` と `npm audit`）、`e2e`（2つが通ったら、Playwright で `npm run e2e`。失敗したら `test-results` を 7 日残す） |

| [deploy.yml](deploy.yml) | 第12部: `check`（PostgreSQL と Redis つきで、API と画面の `npm run check`、`docker build`）→ `deploy`（main のときだけ。環境 `production` の Secrets のデプロイフックで Render に頼み、`scripts/wait-for-version.ts` で新しい版を待つ） |

第12部: `ci.yml` の `api` と `e2e` に Redis のサービス（6380）を足しました。

執筆の環境からは GitHub で動かせなかったので、YAML として読めることと、各ジョブのコマンドが手元で通ることだけを確かめました。
