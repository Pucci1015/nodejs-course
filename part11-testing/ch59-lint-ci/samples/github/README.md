# 第59章 GitHub の設定ファイルの見本（samples/github）

本文7・8節で読む、GitHub Actions のワークフローと Dependabot の設定です。GitHub が読むのは、リポジトリの直下の `.github/` だけなので、このフォルダに置いても動きません。自分のリポジトリで使うときは、`.github/` にコピーします（成果物で、`~/dev/task-api` に置きます）。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [workflows/ci.yml](workflows/ci.yml) | 7 | push・プルリクエストのたびに `npm ci` → `npm run check` → `npm audit` |
| [dependabot.yml](dependabot.yml) | 8 | npm と Actions の新しい版を、毎週プルリクエストで知らせる |

執筆の環境からは GitHub で動かせなかったので、YAML として正しく読めることと、`run:` の各コマンドが手元で通ることだけを確かめました。`actions/…` の版と、Dependabot の設定の項目（`cooldown` など）は、使う前に公式のドキュメントで確かめてください。
