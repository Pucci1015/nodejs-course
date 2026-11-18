# 第62章 サンプル

本文の「手を動かす」で使うプログラムと、PaaS・GitHub Actions の設定の例です。動かすときは、章のフォルダ（`~/dev/part12/ch62-cloud-deploy`）で `node samples/○○.ts` と打ちます（`Ctrl+C` で止める）。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [app.ts](app.ts) | 2・3・6 | `PORT`（既定 9827） | PaaS で動かす形の小さなアプリ。`/healthz`・`/version`・`POST /login`。本番では `trust proxy`・`__Host-sid`・HSTS。本番で `SESSION_SECRET` が無ければ終了コード 1 |
| [make-cert.sh](make-cert.sh) | 3.1 | | 練習用の自己署名の証明書を `certs/` に作る（あれば何もしない） |
| [tls-proxy.ts](tls-proxy.ts) | 3.2 | 9828・9829 | HTTPS を終わらせて 9827 へ渡すプロキシ。http（9829）は https へ 308 |
| [db-check.ts](db-check.ts) | 4.1 | | `DATABASE_URL` でつないでみる（パスワードは `***` で表示） |
| [switch.ts](switch.ts) | 6 | 9820 | 9821 か 9822 へ渡すプロキシ。`POST /__switch/番号` で行き先を替える（練習用なので合言葉なし） |
| [poll.ts](poll.ts) | 6 | | `/version` を聞き続け、1秒ごとに版と失敗の回数を書く |
| [github/deploy.yml](github/deploy.yml) | 7 | | テスト → Render のデプロイフック → 新しい版を待つ、の GitHub Actions |
| [render.yaml](render.yaml) | 8.2 | | Render の Blueprint の例 |
| [fly.toml](fly.toml) | 8.2 | | Fly.io の設定の例（比べるため） |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

`deploy.yml`・`render.yaml`・`fly.toml` は、執筆の環境から GitHub・Render・Fly.io で動かしていません。YAML（TOML）として読めることだけを確かめました。項目の名前は変わることがあるので、使う前に、必ず公式の説明で確認してください。
