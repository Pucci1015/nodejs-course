# 第43章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts) | React のプラグインと、`/api` のプロキシ | 1.1 |
| [app/index.html](app/index.html)、[app/tsconfig.json](app/tsconfig.json) | 第42章と同じ | 1.1 |
| [app/src/schemas.ts](app/src/schemas.ts) | API の応答のスキーマ、フォームの入力のスキーマ | 1.2・5.1 |
| [app/src/api.ts](app/src/api.ts) | `ApiError` と、API を呼ぶ関数 | 1.2・6 |
| [app/src/PlainList.tsx](app/src/PlainList.tsx) | `useEffect` と fetch で読む（ユニオンの状態、古い応答を捨てる） | 2 |
| [app/src/main.tsx](app/src/main.tsx) | `QueryClient` を作って渡す | 3.1 |
| [app/src/queries.ts](app/src/queries.ts) | TanStack Query のカスタムフック（読む・作る・楽観的な更新・SSE） | 3・4・6・7 |
| [app/src/TaskList.tsx](app/src/TaskList.tsx) | TanStack Query で読んだ一覧 | 3・4 |
| [app/src/fieldErrors.ts](app/src/fieldErrors.ts) | problem+json の `errors` を項目ごとにする | 5.3 |
| [app/src/NewTaskForm.tsx](app/src/NewTaskForm.tsx) | 確かめて送るフォーム | 5 |
| [app/src/EditTitle.tsx](app/src/EditTitle.tsx) | 412 を知らせる編集欄 | 6 |
| [app/src/App.tsx](app/src/App.tsx) | 全部を並べる画面 | 3・7 |

## 動かし方

ターミナルを2つ使います。

```sh
# 1つ目: 練習用の API（Ctrl+C で止める）
$ cd ~/dev/part08
$ npm run api

# 2つ目: 画面
$ cd ~/dev/part08/ch43-data-forms/samples/app
$ npx vite        # http://localhost:5173/（Ctrl+C で止める）
$ npx tsc         # 型を確かめる
$ npx eslint .    # Hooks の決まりを確かめる
```
