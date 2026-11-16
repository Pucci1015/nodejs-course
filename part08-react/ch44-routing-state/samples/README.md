# 第44章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts)、[app/index.html](app/index.html)、[app/tsconfig.json](app/tsconfig.json) | 第43章と同じ設定 | 1 |
| [app/src/schemas.ts](app/src/schemas.ts) | 第43章と同じスキーマ | 1 |
| [app/src/api.ts](app/src/api.ts) | 第43章の `api.ts` に、`getTask` と並べ方を足したもの | 1・3 |
| [app/src/queries.ts](app/src/queries.ts) | 一覧・1つ・作るのフック | 1・3 |
| [app/src/main.tsx](app/src/main.tsx) | `QueryClientProvider`・`SettingsProvider`・`RouterProvider` | 2.1・7 |
| [app/src/router.tsx](app/src/router.tsx) | URL とページの対応表 | 2 |
| [app/src/Layout.tsx](app/src/Layout.tsx) | メニュー（`NavLink`）と `<Outlet />` | 2.2・5.2 |
| [app/src/pages/TaskListPage.tsx](app/src/pages/TaskListPage.tsx) | 一覧。条件は URL に持つ | 4 |
| [app/src/pages/TaskDetailPage.tsx](app/src/pages/TaskDetailPage.tsx) | `/tasks/:id`。`useParams` | 3 |
| [app/src/pages/NewTaskPage.tsx](app/src/pages/NewTaskPage.tsx) | 作ったら `useNavigate` で移る | 5.3 |
| [app/src/pages/AboutPage.tsx](app/src/pages/AboutPage.tsx)、[NotFoundPage.tsx](app/src/pages/NotFoundPage.tsx)、[ErrorPage.tsx](app/src/pages/ErrorPage.tsx) | 決まった中身のページ・見つからないとき・エラーのとき | 2.3 |
| [app/src/filters.ts](app/src/filters.ts) | 一覧の条件と、検索パラメータの行き来 | 4.2 |
| [app/src/useFilters.ts](app/src/useFilters.ts) | 条件を URL に持つカスタムフック | 4.3 |
| [app/src/settings.tsx](app/src/settings.tsx) | 表示の設定を配る Context | 7 |

## 動かし方

ターミナルを2つ使います。

```sh
# 1つ目: 練習用の API（Ctrl+C で止める）
$ cd ~/dev/part08
$ npm run api

# 2つ目: 画面
$ cd ~/dev/part08/ch44-routing-state/samples/app
$ npx vite        # http://localhost:5173/（Ctrl+C で止める）
$ npx tsc
$ npx eslint .
```
