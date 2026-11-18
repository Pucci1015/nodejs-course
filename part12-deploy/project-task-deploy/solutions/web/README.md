# 第11部の成果物 完成例の画面（`task-web` パッケージ）

要件とヒントは [../../README.md](../../README.md) にあります。第8部の画面に、ログイン・登録・メールアドレスの確認・パスワードの再設定のページを足したものです（第10部）。第11部では、`lint` に `--max-warnings 0` を付け、リポジトリの直下の Prettier で見た目を整えただけで、中身は変えていません。第12部で、タスクの画面に添付ファイル（画像）を足しました（`components/Attachments.tsx`、`api/` の3つのファイル、`test/attachments.test.tsx`）。本番では、`npm run build` した `dist/` を API が配ります（`Dockerfile`）。`/api` は、同じリポジトリの API（`127.0.0.1:9490`）に中継します。

| ファイル・フォルダ                                                                                                                         | 中身                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [package.json](package.json)、[package-lock.json](package-lock.json)                                                                       | `dev`・`build`・`preview`・`typecheck`・`lint`・`test`・`check`。版は第8部と同じ                                                                                                                                  |
| [tsconfig.json](tsconfig.json)                                                                                                             | 第8部の `tsconfig.base.json` と同じ設定に、`"include": ["src", "test", "vite.config.ts"]` を足したもの                                                                                                            |
| [eslint.config.js](eslint.config.js)                                                                                                       | 第42章 3.5節と同じ                                                                                                                                                                                                |
| [vite.config.ts](vite.config.ts)                                                                                                           | `/api` を `API_TARGET`（既定は `http://127.0.0.1:9490`）に中継する。`npm run preview` も同じ。ブラウザから見ると画面と API が同じオリジンなので、Cookie がそのまま届き、CORS も要らない                           |
| [index.html](index.html)                                                                                                                   | 入り口の HTML                                                                                                                                                                                                     |
| [.gitignore](.gitignore)                                                                                                                   | `node_modules/` と `dist/` をコミットしない                                                                                                                                                                       |
| [src/api/](src/api/)                                                                                                                       | `schemas.ts`（Zod）・`client.ts`（API を呼ぶ関数と `ApiError`）・`queries.ts`（TanStack Query のフック）・`auth.ts`（第10部: ログインの API）                                                                     |
| [src/pages/](src/pages/)                                                                                                                   | 一覧・作る・1つのタスク・見つからない・エラーのページ。第10部: ログイン・登録・確認・再設定・新しいパスワードのページ                                                                                             |
| [src/components/](src/components/)                                                                                                         | フォーム・一覧の1行・条件の欄・ダイアログ・知らせる場所・見出し。第10部: `Field`（入力の組）・`RequireLogin`（ログインが要るページの枠）                                                                          |
| [src/lib/](src/lib/)                                                                                                                       | `dates.ts`（締め切りまでの日数・日本の時刻）・`errors.ts`（失敗を文にする）・`safe-next.ts`・`token-from-hash.ts`（第10部）                                                                                       |
| [src/routes.tsx](src/routes.tsx)・[src/Layout.tsx](src/Layout.tsx)・[src/main.tsx](src/main.tsx)・[src/queryClient.ts](src/queryClient.ts) | URL とページの対応表・枠・入り口・キャッシュ（第10部: 401 で「ログインしていない」にする）                                                                                                                        |
| [test/](test/)                                                                                                                             | `fake-api.ts`（偽の API。第10部でログインを足した）、`app.test.tsx`（画面全体のテスト 19 個）、`auth.test.tsx`（第10部: ログインなどのページのテスト 15 個）、`attachments.test.tsx`（第12部: 添付ファイル 3 個） |

## 動かし方

API の完成例（[../README.md](../README.md)）と一緒にコピーしたものとして書きます。

```sh
$ cd ~/dev/task-api-example12/web
$ npm ci             # package-lock.json のとおりに入れる
$ npm run check      # tsc → ESLint → 37 個のテスト（API は要らない）
$ npm run dev        # http://localhost:5173/（API を先に動かす。練習用の IdP のリンクも出すなら VITE_IDP_LOGIN=1 npm run dev）
```

- 画面は `http://localhost:5173/` で開いてください。`http://127.0.0.1:5173/` で開くと、オリジンが API の `APP_URL`（`http://localhost:5173`）と違うので、書き換えのリクエストが 403 になります（CSRF への備え）
- `npm ci` の最後に `npm audit` が「moderate」と出ることがあります。ESLint が使う `minimatch` のもので、開発のときだけ使う道具なので、作る画面には入りません。`npm audit fix --force` は打たないでください

## 作りの要点（第10部で足した所）

- **ログインしている人は TanStack Query に**: `useMe()`（キー `['me']`）。サーバが知っていることなので、Context に写さずキャッシュに置きます。ログイン・ログアウト・401 では、このキャッシュを書き換えるだけで、メニューも `RequireLogin` も変わります
- **401 はまとめて扱う**: `queryClient.ts` の `QueryCache`・`MutationCache` の `onError` で、401 なら `['me']` を `null` にします。ページごとに 401 を書かなくてよくなります
- **ログインの後に戻る先**: `?next=` は `safeNext` で、このサイトの中のパスだけにします（オープンリダイレクトへの備え）
- **ログアウトでキャッシュを消す**: 同じブラウザで次の人がログインしたときに、前の人のタスクが一瞬でも見えないように
- **メールのリンクは、ボタンで使う**: 確認のページは、開いただけでは POST しません（メールのセキュリティの仕組みが先に開くことがある・StrictMode で2回送らない）
- **パスワードの欄**: `autoComplete` に `current-password`（ログイン）・`new-password`（登録・再設定）を付け、パスワードマネージャが正しく働くようにします。決まりは API が確かめ、画面は 422 の理由をその欄の横に出します
- **画面で隠すのは使いやすさのため**: 守っているのは API（401・404）です

## テストが確かめないこと

- 本物の API とのつながり（プロキシ・Cookie・SSE・IdP のリダイレクト）。成果物の README の 4.2節の手順で、目で確かめてください
- 見た目（色・並び・暗い色）とキーボードだけでの操作
- `npm run build` が通ること（`npm run build` を打って確かめる）
