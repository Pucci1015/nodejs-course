# 第9部の成果物 完成例（`task-next` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。第8部の画面（`web/`）を、Next.js で作り直したものです。サーバから、第7部の API（`127.0.0.1:9490`）を呼びます。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | `dev`・`build`・`start`・`typecheck`・`lint`・`test`・`check`。版は第9部の章と同じ |
| [tsconfig.json](tsconfig.json) | 第9部の `tools/tsconfig.next.json` と同じ |
| [eslint.config.js](eslint.config.js) | 第47章 9.3節と同じ。`test/` だけ、型の無い値の注意を止める |
| [next.config.ts](next.config.ts) | Cache Components を使う。`NEXT_DIST_DIR` で、ビルドの結果を置くフォルダを変えられる |
| [.gitignore](.gitignore) | `node_modules/`・`.next/`・`.next-test/` などをコミットしない |
| [app/](app/) | ページ（一覧・作る・1つのタスク・見つからない・エラー）、Server Action（`tasks/actions.ts`）、SSE の中継（`api/events/route.ts`） |
| [components/](components/) | ブラウザでも動く部品（メニュー・フォーム・完了のチェック・状態・消すボタン・SSE） |
| [lib/](lib/) | `schemas.ts`・`dates.ts`（第8部と同じ）、`filters.ts`（URL の条件）、`api.ts`（API を呼ぶ。サーバだけ） |
| [test/](test/) | 偽の API と、ページ（14 個）・Server Action（14 個）・部品（6 個）のテスト |

## 動かし方

```sh
$ cp -R ~/dev/part09/project-task-next/solutions ~/dev/task-next-example9
$ cd ~/dev/task-next-example9
$ npm ci             # package-lock.json のとおりに入れる
$ npm run check      # tsc → ESLint → 34 個のテスト（API は要らない。1分ほどかかる）
$ npm run dev        # http://localhost:9550/（第7部の API を先に動かす）
```

- 第7部の API の代わりに、第9部の練習用の API（`~/dev/part09` で `npm run api`）を使うなら、`API_URL=http://127.0.0.1:9500 npm run dev` です。
- `npm run build` → `npm start` で、本番の形で動かせます。ビルドは、API が動いていなくても通ります（データは、どのページもリクエストが来てから読むので）。

## 作りの要点

- **読むのはサーバ**: ページ（Server Component）が `lib/api.ts` で API を読みます。`searchParams` や API を読む部分は `<Suspense>` の中に置き、枠と見出しはビルドのときに作られます（ビルドの表で ◐）
- **書き換えは Server Action**: `app/tasks/actions.ts` の4つの関数だけが API を書き換えます。引数は、どれもブラウザから届く値として確かめます
- **成功したら `refresh()`、412 なら呼ばない**: 412 のときは、打った値を残して `stale: true` を返し、「読み直す」は利用者が選びます
- **フォームを作り直す**: `TaskForm` は、1つのタスクのページで `key={task.version}`、フォームの中で `key={JSON.stringify(values)}` です。前者は新しい中身で始めるため、後者は、送った後に React が入力欄を空にするのを、返ってきた値で作り直すためです（第49章 3.2節）
- **知らせは URL で**: 「作りました」は `?created=1`、「消しました」は `?deleted=題名`。redirect の後のページは、サーバが新しく作るからです
- **冪等キーは付けない**: 送っている間は `useFormStatus` でボタンを押せなくします（[../README.md](../README.md) 3.3節）
- **覚えない**: `'use cache'` は使いません。何人もが書き換えるデータなので、いつも新しく読みます（第50章 8節）

## テストが確かめないこと

- 本物の API とのつながり。[../README.md](../README.md) 4.2節の手順で、目で確かめてください
- ダイアログを開いたときのフォーカス（jsdom には `showModal` が無いため）と、キーボードだけでの操作
- 見た目（色・並び・暗い色）
- `npm run build` が通ること（`npm run build` を打って確かめる）
