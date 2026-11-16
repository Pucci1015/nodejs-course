# 第50章 サンプル

本文の「手を動かす」で作るアプリ `web/` の完成形です。第49章の `web/` に、この章のものを足しました。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [web/app/clock/page.tsx](web/app/clock/page.tsx) | 2 | 4つの時刻（ビルドのとき・1分ごと・開くたび・数秒ごと） |
| [web/lib/api.ts](web/lib/api.ts) の `getStats`・[web/app/stats/page.tsx](web/app/stats/page.tsx) | 3 | `'use cache'` で覚えておく数と `/stats` |
| [web/app/tasks/actions.ts](web/app/tasks/actions.ts) | 4.1 | 書き換えた後の `updateTag('tasks')` |
| [web/app/api/revalidate/route.ts](web/app/api/revalidate/route.ts) | 4.2 | 知らせを受けて `revalidateTag` する入り口 |
| [web/lib/help.ts](web/lib/help.ts)・[web/app/help/[topic]/page.tsx](web/app/help/%5Btopic%5D/page.tsx) | 6 | `generateStaticParams` で前もって作るヘルプのページ |
| ほかのファイル | 第47〜49章 | 第49章のまま |

## 動かし方

```sh
# 1つ目のターミナル
$ cd ~/dev/part09
$ npm run api

# 2つ目のターミナル（ビルドのときにも API を読むので、API を動かしてから）
$ cd ~/dev/part09/ch50-rendering-cache/samples/web
$ npx next build
$ npx next start -p 9540      # http://localhost:9540/clock、/stats、/help/start
```
