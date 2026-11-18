# e2e — 画面から API・PostgreSQL・メールまで通すテスト（第11部で追加）

第12部で、本番に近い形にしました。画面は Vite の開発サーバではなく、`vite build` したもの（`web/dist`）を API が `STATIC_DIR` として配ります（同じオリジン、本番と同じ CSP）。Redis（6380）と練習用の S3 も使います。

| ファイル                                 | 中身                                                                                                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [auth-flow.spec.ts](auth-flow.spec.ts)   | 2 個のテスト。①登録 → 確認のメールのリンク → ログイン → タスクを作る → ログアウト（すべて画面から）。②別の人のタスクは、一覧にも URL を直接開いても出ない（準備は API で）                     |
| [attachment.spec.ts](attachment.spec.ts) | 第12部: 2 個のテスト。①画像を添付すると表示され（302 → 署名付き URL → 練習用の S3 から読めた。CSP の違反が無い）、ダウンロードの名前が付き、消すと消える。②ほかの人の添付ファイルの URL は 404 |
| [helpers.ts](helpers.ts)                 | 届いたメールを待つ `waitForMail`、本文のリンクを取り出す `linkIn`、API で登録と確認を済ませる `signUpByApi`                                                                                    |
| [prepare-db.ts](prepare-db.ts)           | スキーマ `e2e` を作り直す。第12部: Redis のキー `e2e:…` も消す。API を起動する前に、`playwright.config.ts` が動かす                                                                            |

```sh
$ npx playwright install chromium   # 1回だけ（ブラウザを入れる）
$ npm run e2e                       # playwright test。3つのサーバも起動する
```

- 設定は、リポジトリの直下の [../playwright.config.ts](../playwright.config.ts) です。偽の SMTP サーバ（SMTP 9497・見る所 9498）・練習用の S3（9495）・画面をビルドしてから API（画面も配る。9496）を起動し、`/healthz` などが答えるまで待ってからテストを始めます
- 手元では、3つのサーバがもう動いていれば使い回します（`reuseExistingServer`）。CI（環境変数 `CI` がある）では、毎回起動します
- 失敗したら、`test-results/` に、そのときの画面の様子（`error-context.md`）が残ります。CI では、1回やり直して、そのときのトレースも残します（`npx playwright show-trace …/trace.zip` で開く。第58章 8節）
