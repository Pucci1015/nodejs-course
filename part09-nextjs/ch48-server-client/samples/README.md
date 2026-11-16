# 第48章 サンプル

本文の「手を動かす」で作るアプリ `web/` の完成形です。第47章の `web/` に、この章の部品を足したものです。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [web/components/Counter.tsx](web/components/Counter.tsx) | 2.1 | 押すと増えるボタン（Client Component） |
| [web/components/Collapsible.tsx](web/components/Collapsible.tsx)・[web/app/page.tsx](web/app/page.tsx) | 2.1・3.2 | 開け閉めする部品と、`children` にサーバの中身を入れる `/` |
| [web/lib/api.ts](web/lib/api.ts) | 4 | `import 'server-only'` と `API_TOKEN` を足した、API を呼ぶ関数 |
| [web/app/tasks/page.tsx](web/app/tasks/page.tsx) | 5.1・6.2・6.3 | `/tasks`。待つ部分だけを `<Suspense>` に入れる |
| [web/app/tasks/[id]/page.tsx](web/app/tasks/[id]/page.tsx)・[web/app/tasks/[id]/loading.tsx](web/app/tasks/[id]/loading.tsx) | 5.1 | `/tasks/1` など |
| [web/app/dashboard/page.tsx](web/app/dashboard/page.tsx)・[web/components/TaskCount.tsx](web/components/TaskCount.tsx) | 5.2・5.3 | 遅さの違う部分を別々に流す `/dashboard`、`use` で Promise を待つ部品 |
| [web/components/NavLinks.tsx](web/components/NavLinks.tsx)・[web/app/layout.tsx](web/app/layout.tsx) | 6.1 | 今のページが分かるメニュー |
| [web/components/SearchBox.tsx](web/components/SearchBox.tsx) | 6.2 | 打った文字で探す |
| [web/components/RefreshButton.tsx](web/components/RefreshButton.tsx) | 6.3 | `router.refresh()` で読み直すボタン |
| [web/app/about/page.tsx](web/app/about/page.tsx)・[web/app/not-found.tsx](web/app/not-found.tsx)・[web/app/error.tsx](web/app/error.tsx) | 第47章 | 第47章のまま |

## 動かし方

```sh
# 1つ目のターミナル
$ cd ~/dev/part09
$ npm run api

# 2つ目のターミナル
$ cd ~/dev/part09/ch48-server-client/samples/web
$ npx next dev -p 9520        # http://localhost:9520/
```
