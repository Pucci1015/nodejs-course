# 第47章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part09/ch47-nextjs-intro/exercises/` で行います。最初に `cd exercises` で移動してください。

このフォルダ自体が、1つの Next.js のアプリです。問題ごとに、`app/` の中にページのファイルを作ります。

| 問題 | 種類 | テーマ | 作るファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | いちばん小さなページ | `app/hello/page.tsx` | 2・3 |
| 2 | 基本 | title とリンク | `app/about/page.tsx` | 3・4・8 |
| 3 | 基本 | URL のパラメータで挨拶する | `app/greet/[name]/page.tsx` ほか | 5.3・6 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜9 |
| 5 | 応用 | API のタスクを並べる | `app/tasks/page.tsx` ほか | 5 |
| 6 | 応用 | 1つのタスクのページと「見つからない」 | `app/tasks/[id]/page.tsx` | 6 |
| 7 | 応用 | 状態で絞り込む | `app/tasks/page.tsx` | 7 |
| 8 | 発展 | ページごとの title と、ページ送り | `app/tasks/[id]/page.tsx`、`app/pages/page.tsx` ほか | 6・7・8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## 用意してあるもの（書き換えません）

| ファイル | 中身 |
| --- | --- |
| [app/layout.tsx](app/layout.tsx) | ルートのレイアウト。title の template は `'%s | 練習問題'` |
| [app/page.tsx](app/page.tsx) | `/` のページ |
| [app/not-found.tsx](app/not-found.tsx) | 「ページが見つかりません」 |
| [lib/api.ts](lib/api.ts) | 本文5.1節の `lib/api.ts` に、`listTasks` の `limit`（何件ずつ読むか）を足したもの |
| [next.config.ts](next.config.ts)・[tsconfig.json](tsconfig.json) | 本文2.1節と同じ設定 |
| [app.test.ts](app.test.ts) | テスト |

## テストの使い方

テストは、練習用の API（ポート 9516）と、このフォルダの Next.js の開発サーバ（ポート 9517）を**自分で起動して**、ページを HTTP で読んで確かめます。`npm run api` や `npx next dev` を動かしていなくても、動かしたままでも、使えます。

```sh
$ npx vitest run app.test.ts             # 全部の問題
$ npx vitest run app.test.ts -t 問題5    # 問題5だけ（-t は、名前に「問題5」が入るテストだけを動かすオプション）
```

- `npx vitest run` は、第8部で使った Vitest でテストを動かすコマンドです。最初は、作っていないページが 404 になるので、ほとんど失敗します。すべて成功すれば完成です。
- 起動に 10 秒ほど、ページを初めて開くときにも数秒かかります。
- 模範解答は `APP=../solutions npx vitest run app.test.ts` で確かめられます（`APP` で、テストする Next.js のアプリのフォルダを変えます）。
- 自分の目でも確かめるときは、1つ目のターミナルで `npm run api`（`~/dev/part09` で）、2つ目のターミナルで `npx next dev -p 9510`（このフォルダで）を動かし、`http://localhost:9510/hello` などを開きます。
- `npx tsc` と `npx eslint .` も通してください。

---

## 基本

### 問題1 いちばん小さなページ

`/hello` を開くと、見出し（`<h1>`）に「こんにちは、Next.js」と出るページを作ってください（本文2・3節）。

### 問題2 title とリンク

`/about` のページを作ってください（本文3・4・8節）。

- ブラウザのタブの title が「このアプリについて | 練習問題」になる（レイアウトの template を使う）
- 「ホームへ」という文字の、`/` へのリンクがある（`next/link` の `Link` を使う）

### 問題3 URL のパラメータで挨拶する

`/greet/alice` を開くと「こんにちは、alice さん」、`/greet/ねこ` を開くと「こんにちは、ねこ さん」と出るページを作ってください（本文5.3・6節）。

- `params` は Promise です。待つ間に出す `loading.tsx` も置きます（置かないと、開発サーバに `Next.js encountered runtime data during prerendering` と出ます）。
- `params` の値はエスケープされたままです（本文6.1節）。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の問いに答えてください。

## 応用

### 問題5 API のタスクを並べる

`/tasks` を開くと、練習用の API のタスクの題名を、`<ul>` の中の `<li>` で並べるページを作ってください（本文5節）。

- 題名は、そのタスクのページ（`/tasks/1` など）へのリンクにします。
- `lib/api.ts` の `listTasks()` を使います。
- 読み込んでいる間に出す `loading.tsx` も置きます。
- テストの API には、例のタスクが5つ入っています（1 牛乳を買う・2 第9部を読む（作業中）・3 部屋の掃除・4 レポートを出す・5 本を返す）。

### 問題6 1つのタスクのページと「見つからない」

`/tasks/2` を開くと、見出しにタスクの題名（「第9部を読む」）、その下に状態を日本語（「作業中」）で出すページを作ってください（本文6節）。

- 無いタスク（`/tasks/99`）、数字でない id（`/tasks/abc`・`/tasks/0`・`/tasks/1.5`）は、`notFound()` で「見つからない」にします。
- `lib/api.ts` の `getTask(id)` は、無ければ `null` を返します。

### 問題7 状態で絞り込む

問題5の `/tasks` を、`?status=…` で絞り込めるようにしてください（本文7節）。

- `/tasks?status=doing` なら、作業中のタスクだけを並べます。知らない値（`?status=xyz`）は、絞り込まないのと同じにします。
- 一覧の上に、「全部」（`/tasks`）・「未着手」（`/tasks?status=todo`）・「作業中」・「完了」のリンクを置きます。
- 今の条件のリンクにだけ、`aria-current="page"` を付けます。

## 発展

### 問題8 ページごとの title と、ページ送り

2つ作ってください（本文6・7・8節）。

1. 問題6の `/tasks/[id]` のページの title を、「（タスクの題名） | 練習問題」にします（`/tasks/1` なら「牛乳を買う | 練習問題」）。
2. `/pages` を作ります。タスクを**3件ずつ**（`listTasks({ limit: 3 })`）、題名を `<li>` で並べます。API の応答の `nextCursor` が `null` でなければ、「次へ」という文字の、`/pages?cursor=（nextCursor）` へのリンクを置きます。`/pages?cursor=…` を開くと、その続きの3件（例のタスクなら2件）を出します。

ヒント: `nextCursor` には、URL にそのまま書けない文字が入ることがあります。`encodeURIComponent` で URL に入れます。`searchParams` の値は、文字の配列のこともあります（本文7節）。
