# github/

GitHub Actions のワークフローの例です（第62章 7節）。自分のリポジトリで使うときは、リポジトリの `.github/workflows/` に置きます。

| ファイル | 中身 |
| --- | --- |
| [deploy.yml](deploy.yml) | `main` に push されたら、テスト → Render のデプロイフック → 新しい版が動くまで待つ。執筆の環境からは GitHub と Render で動かしていません（YAML として読めることだけを確かめた） |
