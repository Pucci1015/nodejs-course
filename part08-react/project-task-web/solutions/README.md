# 第8部の成果物 完成例（`task-web` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。第7部の API（`127.0.0.1:9490`）を使う、タスク管理の画面です。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | `dev`・`build`・`preview`・`typecheck`・`lint`・`test`・`check`。版は第8部の章と同じ |
| [tsconfig.json](tsconfig.json) | 第8部の `tsconfig.base.json` と同じ設定に、`"include": ["src", "test", "vite.config.ts"]` を足したもの |
| [eslint.config.js](eslint.config.js) | 第42章 3.5節と同じ |
| [vite.config.ts](vite.config.ts) | `/api` を `API_TARGET`（既定は `http://127.0.0.1:9490`）に中継する。`npm run preview` も同じ |
| [index.html](index.html) | 入り口の HTML |
| [.gitignore](.gitignore) | `node_modules/` と `dist/` をコミットしない |
| [src/api/](src/api/) | `schemas.ts`（Zod）・`client.ts`（API を呼ぶ関数と `ApiError`）・`queries.ts`（TanStack Query のフック） |
| [src/pages/](src/pages/) | 一覧・作る・1つのタスク・見つからない・エラーのページ |
| [src/components/](src/components/) | フォーム・一覧の1行・条件の欄・ダイアログ・知らせる場所・見出し |
| [src/lib/](src/lib/) | `dates.ts`（締め切りまでの日数・日本の時刻）・`errors.ts`（失敗を文にする） |
| [src/routes.tsx](src/routes.tsx)・[src/Layout.tsx](src/Layout.tsx)・[src/main.tsx](src/main.tsx) | URL とページの対応表・枠・入り口 |
| [test/](test/) | `fake-api.ts`（偽の API）と `app.test.tsx`（画面全体のテスト 19 個） |

## 動かし方

```sh
$ cp -R ~/dev/part08/project-task-web/solutions ~/dev/task-web-example8
$ cd ~/dev/task-web-example8
$ npm ci             # package-lock.json のとおりに入れる
$ npm run check      # tsc → ESLint → 19 個のテスト（API は要らない）
$ npm run dev        # http://localhost:5173/（第7部の API を先に動かす）
```

- 第7部の API の代わりに、第8部の練習用の API（`~/dev/part08` で `npm run api`）を使うなら、`API_TARGET=http://127.0.0.1:9500 npm run dev` です。
- `npm ci` の最後に `npm audit` が「moderate」と出ることがあります。ESLint が使う `minimatch` のもので、開発のときだけ使う道具なので、作る画面には入りません。`npm audit fix --force` は、ESLint の版を下げてしまうので打たないでください。

## 作りの要点

- **API の既定とそろえる**: URL では、並べ方の既定（`dueDate`）を省きます。でも API の既定は `-createdAt` なので、`client.ts` の `listTasks` は、いつも `sort` を送ります
- **キャッシュのキー**: `['tasks', 'list', { statuses, sort }]`・`['tasks', 'detail', id]`。頭が `['tasks']` のものを、SSE でまとめて「古い」にします。題名の絞り込み（`q`）は API に送らないので、キーに入れません
- **成功したら、返ってきたタスクで置きかえる**: `useUpdateTask` は、応答（新しい `version`）を一覧と詳しい画面のキャッシュに入れます。入れないと、次の保存で古い `version` を送り、412 になります
- **フォームを作り直す**: 1つのタスクのページは `key={task.version}` で包んでいます。読み直して `version` が変わると、フォームの state が新しい中身で始まります
- **失敗をどこに出すか**: 422 はフォームの項目の横、412・409 はページの上の `role="alert"`。412 のときだけ「読み直す」を出します
- **ページを移ったら見出しへ**: `PageTitle` が、`pathname` が変わったときだけ `h1` にフォーカスを移します（最初に開いたページと、同じページで条件を変えたときは動かしません）

## テストが確かめないこと

- 本物の API とのつながり（プロキシ・SSE）。4.2節の手順で、目で確かめてください
- 見た目（色・並び・暗い色）とキーボードだけでの操作
- `npm run build` が通ること（`npm run build` を打って確かめる）
