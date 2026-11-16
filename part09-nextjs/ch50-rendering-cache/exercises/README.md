# 第50章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part09/ch50-rendering-cache/exercises/` で行います。最初に `cd exercises` で移動してください。

このフォルダは、第49章の練習問題と同じく、1つの Next.js のアプリです。問題ごとに、`app/` の中にページを作ります。

| 問題 | 種類 | テーマ | 作るファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | ビルドのときに1回だけ作る | `app/built/page.tsx` | 2.1・3.1 |
| 2 | 基本 | 開くたびに作る | `app/now/page.tsx` | 2.1・2.2 |
| 3 | 基本 | URL の値ごとのページを前もって作る | `app/fruits/[name]/page.tsx` | 6 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | 数を覚えておく | `lib/count.ts` の `getTaskCount`、`app/count/page.tsx` | 3 |
| 6 | 応用 | 知らせを受けて捨てる | `app/api/revalidate/route.ts` | 4.2 |
| 7 | 応用 | 自分で足したら、すぐ捨てる | `app/count/actions.ts` | 4.1 |
| 8 | 発展 | 2秒ごとに新しくなる数 | `lib/count.ts` の `getFreshCount`、`app/fresh/page.tsx` | 2.1・5 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## 用意してあるもの（書き換えません）

| ファイル | 中身 |
| --- | --- |
| [app/layout.tsx](app/layout.tsx)・[app/page.tsx](app/page.tsx)・[app/not-found.tsx](app/not-found.tsx) | 第49章の練習問題と同じ |
| [lib/api.ts](lib/api.ts)・[lib/status.ts](lib/status.ts) | 第49章 2.2節と同じ |
| [lib/fruits.ts](lib/fruits.ts) | 問題3で使う、くだものの一覧（`apple`・`banana`・`cherry`） |
| [lib/count.ts](lib/count.ts)・[app/count/actions.ts](app/count/actions.ts) | 問題5・7・8 の関数の形だけ。中身は `throw new Error('まだ書いていません')` |
| [next.config.ts](next.config.ts)・[tsconfig.json](tsconfig.json) | 第47章と同じ設定 |
| [app.test.ts](app.test.ts) | 問題1・2・3・5・6・8 のテスト |
| [actions.test.ts](actions.test.ts) | 問題7 のテスト（第49章と同じく、Server Action を関数として呼ぶ） |
| [check-directive.ts](check-directive.ts) | テストで使う道具（第49章と同じ） |

## テストの使い方

```sh
$ npx vitest run app.test.ts -t 問題1    # 問題1
$ npx vitest run actions.test.ts         # 問題7
$ npx vitest run                          # 全部
```

- `app.test.ts` は、API（ポート 9546）を起動し、このフォルダを**ビルドしてから**（`next build`）、本番のサーバ（`next start`、ポート 9547）で動かして確かめます。キャッシュは、本番のサーバでしか本番と同じに動かないからです（本文7節）。始まるまで 30 秒ほどかかります。
- ビルドは、このフォルダの全部のページで行います。どれか1つのページでビルドが失敗すると、`app.test.ts` のテストは全部失敗し、`next build が失敗しました` の後に、ビルドのエラーが出ます。まず、それを直します。
- `-t 問題1` を付けても、ビルドは全部のページで行います。作りかけで、ビルドが通らないページがあるときは、そのファイルの名前を一時的に変えておく（`page.tsx` → `page-wip.tsx` など。`page.tsx` 以外の名前のファイルは、ページにならない）と、ほかの問題を確かめられます。
- 問題5・6・8 は、つながっています。問題6・8 のテストは、問題5 のページも使います。
- 模範解答は、`APP=../solutions npx vitest run app.test.ts`（`actions.test.ts` も同じ）で確かめられます。
- 自分の目で確かめるときは、API を `npm run api` で動かし、このフォルダで `npx next build` → `npx next start -p 9540` を動かします。
- `npx tsc` も通してください。

---

## 基本

### 問題1 ビルドのときに1回だけ作る

`/built` のページを作ってください（本文2.1・3.1節）。

- 「ビルドした時刻: 2026-11-12T03:04:05.678Z」のように、`new Date().toISOString()` の時刻を出します。
- 何度開いても、同じ時刻（ビルドしたときの時刻）を出します。`'use cache'` と `cacheLife('max')` を使った部品に、時刻を出させます。

### 問題2 開くたびに作る

`/now` のページを作ってください（本文2.1・2.2節）。

- 見出し（`<h1>`）は「今」です。
- 「開いた時刻: 2026-11-12T03:04:05.678Z」のように、開いた時刻（`new Date().toISOString()`）を出します。開くたびに変わります。
- `connection()` を使います。`<Suspense>` に入れるのを忘れると、ビルドが失敗します。

### 問題3 URL の値ごとのページを前もって作る

`/fruits/apple` のようなページを作ってください（本文6節）。

- `lib/fruits.ts` の `findFruit(name)` で、くだものを探します。見出し（`<h1>`）に `label`（「りんご」）、その下に「色: 赤」のように `color` を出します。
- 一覧に無い名前（`/fruits/durian`）なら、`notFound()` にします。
- `generateStaticParams` で、`FRUITS` の3つのページを、ビルドのときに作ります。テストは、ビルドの結果のフォルダ（`.next-test/server/app/fruits/`）に、`apple.html` などがあるかを確かめます。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の問いに答えてください。

## 応用

### 問題5 数を覚えておく

2つ作ってください（本文3節）。

1. `lib/count.ts` の `getTaskCount()`: `lib/api.ts` の `listTasks()` でタスクを読み、数を返します。`'use cache'` で覚えておきます。長さは `cacheLife('hours')`、名札は `cacheTag('tasks')` です。
2. `/count` のページ: `getTaskCount()` の数を、「タスクは 5 件」の形で出します。

ビルドのときに読んだ数（テストの API では 5）が、そのまま出続けます。テストは、API に直接タスクを足しても、数が変わらないことを確かめます。

### 問題6 知らせを受けて捨てる

`POST /api/revalidate` の入り口を作ってください（本文4.2節）。

- `Authorization` ヘッダが `Bearer dev-only-revalidate-secret` でなければ、401 の problem+json を返します（合言葉は、環境変数 `REVALIDATE_SECRET` で変えられるようにします）。
- 合っていれば、`revalidateTag('tasks', 'max')` を呼び、`{ "revalidated": true }` を返します。

テストは、知らせた後に `/count` を何度か開き、新しい数になることを確かめます。

### 問題7 自分で足したら、すぐ捨てる

`app/count/actions.ts` に、`addTaskAction(前の結果, FormData)` を書いてください（本文4.1節、第49章 3.2節）。

- フォームの `title` の前後の空白を取り、空なら `'題名を入れてください'`、101 文字以上なら `'題名は 100 文字までです'` を返します。
- `lib/api.ts` の `createTask` でタスクを作ります（締め切りは `null`）。API が 4xx で断ったら、その理由（`ApiError` の `message`）を返します。
- 作れたら、`updateTag('tasks')` を呼んでから、`redirect('/count')` します。

できたら、`/count` のページに、`useActionState` でこの Server Action を使うフォームを足し、`next start` で、足した数がすぐに出ることを確かめてみましょう（テストはしません）。

## 発展

### 問題8 2秒ごとに新しくなる数

2つ作ってください（本文2.1・5節）。

1. `lib/count.ts` の `getFreshCount()`: `getTaskCount()` と同じくタスクの数を返しますが、覚えておく長さを `cacheLife({ revalidate: 2, expire: 60 })`（2秒より古ければ作り直す）にします。名札は付けません。
2. `/fresh` のページ: 見出しの下に、「タスクは 6 件」の形で数を出します。

テストは、API に直接タスクを足した後、知らせなくても、数秒のうちに新しい数になることを確かめます。ビルドが失敗したら、エラーの文と、本文5節の「とても短いキャッシュ」の説明を読み比べてください。
