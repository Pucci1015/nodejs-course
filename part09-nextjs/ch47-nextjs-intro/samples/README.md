# 第47章 サンプル

本文の「手を動かす」で作るアプリ `web/` の完成形です。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [web/next.config.ts](web/next.config.ts)・[web/tsconfig.json](web/tsconfig.json) | 2.1 | 設定（`../../tools/` のひな形と同じ） |
| [web/app/layout.tsx](web/app/layout.tsx)・[web/app/globals.css](web/app/globals.css) | 2.2・3.3・8 | ルートのレイアウト、メニュー、title の template |
| [web/app/page.tsx](web/app/page.tsx) | 2.2 | `/` |
| [web/app/about/page.tsx](web/app/about/page.tsx) | 3.1 | `/about` |
| [web/lib/api.ts](web/lib/api.ts) | 5.1 | 練習用の API を呼ぶ関数（サーバで動く） |
| [web/app/tasks/page.tsx](web/app/tasks/page.tsx)・[web/app/tasks/loading.tsx](web/app/tasks/loading.tsx) | 5・7 | `/tasks`（`?status=` で絞り込む） |
| [web/app/tasks/[id]/page.tsx](web/app/tasks/[id]/page.tsx) | 6.1 | `/tasks/1` など |
| [web/app/not-found.tsx](web/app/not-found.tsx)・[web/app/error.tsx](web/app/error.tsx) | 6.2 | 見つからない・失敗したとき |

## 動かし方

```sh
# 1つ目のターミナル
$ cd ~/dev/part09
$ npm run api

# 2つ目のターミナル
$ cd ~/dev/part09/ch47-nextjs-intro/samples/web
$ npx next dev -p 9510        # http://localhost:9510/
$ npx next build              # 本番用にビルド（9節）
$ npx next start -p 9510      # ビルドしたものを動かす
```
