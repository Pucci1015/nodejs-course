# .github/workflows — GitHub Actions のワークフロー（第70章）

| ファイル                 | 中身                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ci.yml](ci.yml)         | push とプルリクエストのたびに動く。`api`（PostgreSQL と Redis つきで `npm run check` と `npm audit`）、`web`（`web/` で同じこと）、`e2e`（2つが通ったら、Playwright で `npm run e2e`）        |
| [deploy.yml](deploy.yml) | main に入ったら動く。`check`（API と画面の `npm run check`、`docker build`）→ `deploy`（環境 `production` の Secrets のデプロイフックで Render に頼み、`scripts/wait-for-version.ts` で待つ） |

執筆の環境からは GitHub で動かせなかったので、YAML として読めることと、各ジョブのコマンドが手元で通ることだけを確かめました。
