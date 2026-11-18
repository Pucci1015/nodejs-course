# 第58章 サンプル

練習用の画面（`app/`）と、本文の「手を動かす」で書くテストの完成形（`finished/`）です。本文1.1節で `app/` を `web/` にコピーし、`web/` の中でテストを書きます。うまく動かないときは、`finished/` と比べてください。

| フォルダ | 中身 |
| --- | --- |
| [app/](app/) | 練習用のタスクの画面（React + TanStack Query）と API（Express、メモリ）。テストは入っていない |
| [finished/](finished/) | 本文で書くテストと、Playwright の設定の完成形（`app/` と同じ並びに置いてある） |

## app/

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [api-server.ts](app/api-server.ts) | 1.1・8.3 | 9727（`API_PORT`） | タスクの API。`API_DELAY_MS` で遅らせる。`TEST_RESET=1` で `POST /api/test/reset` を開ける |
| [vite.config.ts](app/vite.config.ts) | 1.1・9 | 9728（`WEB_PORT`） | Vite（`/api` を API へ中継）と Vitest（jsdom・カバレッジ）の設定 |
| [index.html](app/index.html)・[src/main.tsx](app/src/main.tsx)・[src/App.tsx](app/src/App.tsx)・[src/app.css](app/src/app.css) | 1.1 | | 画面の入り口 |
| [src/api.ts](app/src/api.ts) | 1.1・5 | | API を呼ぶ関数（Zod で確かめる）と `ApiError` |
| [src/TaskItem.tsx](app/src/TaskItem.tsx) | 2・3 | | タスク1つの行 |
| [src/AddTaskForm.tsx](app/src/AddTaskForm.tsx) | 4 | | タスクを足すフォーム |
| [src/TaskListPanel.tsx](app/src/TaskListPanel.tsx) | 5 | | 一覧を読み、足す・切り替える・消す |
| [src/useDebouncedValue.ts](app/src/useDebouncedValue.ts) | 6 | | 値が変わってから少し待つフック |
| [tsconfig.json](app/tsconfig.json) | | | `npx tsc` で型を確かめる設定（コピーしても動くように、`extends` を使わずに書いた） |

## finished/

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [src/TaskItem.test.tsx](finished/src/TaskItem.test.tsx) | 2・3 | 役割と名前で探す、押したら呼ばれるか |
| [src/AddTaskForm.test.tsx](finished/src/AddTaskForm.test.tsx) | 4 | user-event で打つ、送っている途中、失敗 |
| [src/test-helpers.tsx](finished/src/test-helpers.tsx) | 5 | `jsonResponse`・`mockFetch`・`createWrapper`・`fakeTaskApi` |
| [src/TaskListPanel.test.tsx](finished/src/TaskListPanel.test.tsx) | 5 | 読み込み中・一覧・失敗と「もう一度」・足す |
| [src/useDebouncedValue.test.ts](finished/src/useDebouncedValue.test.ts) | 6 | フェイクタイマーと `renderHook` |
| [playwright.config.ts](finished/playwright.config.ts) | 8.2 | Playwright の設定（API 9721・画面 9722 を起動する） |
| [e2e/tasks.spec.ts](finished/e2e/tasks.spec.ts) | 8.4 | E2E のテスト（3つ） |

完成形をまとめて動かすときは、章のフォルダで、別の名前のフォルダにコピーしてから動かします（`cp -R finished/. 先` は `finished` の中身を `先` に重ねる）。

```sh
$ cd ~/dev/part11/ch58-frontend-testing
$ cp -R samples/app finished-web
$ cp -R samples/finished/. finished-web/
$ cd finished-web
$ npx vitest run            # 12 個
$ npx playwright test       # 3 個（先に npx playwright install chromium）
```
