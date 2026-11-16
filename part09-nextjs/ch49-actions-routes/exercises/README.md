# 第49章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part09/ch49-actions-routes/exercises/` で行います。最初に `cd exercises` で移動してください。

このフォルダは、第48章の練習問題と同じく、1つの Next.js のアプリです。

| 問題 | 種類 | テーマ | 作るファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | いちばん小さな Route Handler | `app/api/hello/route.ts` | 2.1・2.3 |
| 2 | 基本 | JSON を確かめる Route Handler | `app/api/sum/route.ts` | 2.3 |
| 3 | 基本 | いちばん小さな Server Action | `app/greet/actions.ts` | 3.1・3.2 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜6 |
| 5 | 応用 | 題名を変える Server Action | `app/tasks/[id]/actions.ts` | 3.2・3.3・3.4・4 |
| 6 | 応用 | useActionState のフォーム | `components/RenameForm.tsx` | 3.2 |
| 7 | 応用 | useOptimistic のチェックボックス | `components/DoneToggle.tsx` | 3.4 |
| 8 | 発展 | 消す入り口と If-Match | `app/api/tasks/[id]/route.ts` | 2.3・2.4 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## 用意してあるもの（書き換えません）

| ファイル | 中身 |
| --- | --- |
| [app/layout.tsx](app/layout.tsx)・[app/page.tsx](app/page.tsx)・[app/not-found.tsx](app/not-found.tsx) | 第48章の練習問題と同じ |
| [lib/api.ts](lib/api.ts)・[lib/status.ts](lib/status.ts) | 本文2.2節と同じ |
| 問題の6つのファイル | 形だけ。中身は `throw new Error('まだ書いていません')` |
| [next.config.ts](next.config.ts)・[tsconfig.json](tsconfig.json) | 第47章と同じ設定 |
| [app.test.ts](app.test.ts) | 問題1・2・8 のテスト（API をポート 9536、Next.js をポート 9537 で起動して、HTTP で呼ぶ） |
| [actions.test.ts](actions.test.ts) | 問題3・5 のテスト（Server Action を、ふつうの関数として呼ぶ。問題5は API をポート 9538 で起動する） |
| `RenameForm.test.tsx`・`DoneToggle.test.tsx` | 問題6・7 のテスト（jsdom で描く。第48章と同じ） |
| [check-directive.ts](check-directive.ts) | テストで使う道具（ファイルの1行目が `'use server'`・`'use client'` かを確かめる） |

## テストの使い方

```sh
$ npx vitest run app.test.ts -t 問題1       # 問題1（-t で、名前に「問題1」が入るテストだけ）
$ npx vitest run actions.test.ts -t 問題3   # 問題3
$ npx vitest run RenameForm.test.tsx        # 問題6
$ npx vitest run                             # 全部
```

- 最初は、ほとんど失敗します。すべて成功すれば完成です。
- `actions.test.ts` は、Next.js の外で Server Action を呼ぶので、`redirect`・`refresh` などを偽物に替えています（`vi.mock`）。`refresh()` は「呼ばれたか」だけを確かめます。
- 模範解答は、`APP=../solutions npx vitest run app.test.ts`（`actions.test.ts` も同じ）、`MODULE=../solutions/components/RenameForm.tsx npx vitest run RenameForm.test.tsx` で確かめられます。
- `curl` で確かめるときは、1つ目のターミナルで `npm run api`（`~/dev/part09` で）、2つ目で `npx next dev -p 9530`（このフォルダで）を動かします。
- `npx tsc` も通してください。

---

## 基本

### 問題1 いちばん小さな Route Handler

`GET /api/hello` で、JSON を返す入り口を作ってください（本文2.1・2.3節）。

- `{ "message": "こんにちは" }` を返します。
- `?name=alice` が付いていれば、`{ "message": "こんにちは、alice さん" }` を返します。名前の前後の空白は取ります。取った後に空なら、名前が無いのと同じにします。

### 問題2 JSON を確かめる Route Handler

`POST /api/sum` で、送られた数の合計を返す入り口を作ってください（本文2.3節）。

- `{ "numbers": [1, 2, 3.5] }` を受け取り、`{ "sum": 6.5 }` を返します。
- `numbers` は、1〜100 個の数の配列です。JSON でない・`numbers` が無い・数でないものが入っている・0 個・101 個以上なら、400 で、`Content-Type` が `application/problem+json` の、`title`（文字）を持つ JSON を返します。
- Zod で確かめます。`GET` は作りません（405 になる）。

### 問題3 いちばん小さな Server Action

`app/greet/actions.ts` に、`greetAction` を書いてください（本文3.1・3.2節）。`useActionState` から呼ぶ形（`(前の結果, FormData)`）で、挨拶の文を返します。

- ファイルを Server Action のファイルにします（1行目）。
- フォームの `name` の値の前後の空白を取り、`'こんにちは、alice さん'` を返します。
- 空なら `'名前を入れてください'`、21 文字以上なら `'名前は 20 文字までです'` を返します。

できたら、`app/greet/page.tsx` と、`useActionState` を使う Client Component のフォームを作って、ブラウザでも確かめてみましょう（テストはしません）。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の問いに答えてください。

## 応用

### 問題5 題名を変える Server Action

`app/tasks/[id]/actions.ts` に、`renameTaskAction(id, version, 前の結果, FormData)` を書いてください（本文3.2〜3.4・4節）。ページでは、`renameTaskAction.bind(null, task.id, task.version)` として使う関数です。

- 結果の形は `{ error: エラーの文か null, title: 題名 }` です（ファイルの `RenameState`）。
- `id`・`version` が正の整数でなければ、API を呼ばずに `'送られた値が正しくありません'` を返します。
- フォームの `title` の前後の空白を取り、空なら `'題名を入れてください'`、101 文字以上なら `'題名は 100 文字までです'` を返します（API は呼ばない）。このとき `title` には、打ったままの値を返します。
- `lib/api.ts` の `updateTask` で題名を変えます。変えられたら、`refresh()` を呼び、`{ error: null, title: 新しい題名 }` を返します。
- API が 404・409・412 で断ったら、`refresh()` を呼び、API の理由（`ApiError` の `message`）と、打った題名を返します。それ以外の失敗は、投げ直します。

### 問題6 useActionState のフォーム

`components/RenameForm.tsx` に、`RenameForm` を書いてください（本文3.2節）。`<RenameForm title={task.title} action={renameTaskAction.bind(null, task.id, task.version)} />` のように使います。

- 「題名」という名前（`<label>`）の、`name="title"` の入力欄を出します。最初は、props の `title` が入っています。
- `useActionState` で `action` を呼び、返ってきた `error` があれば `role="alert"` の要素で出します。入力欄には、返ってきた `title` を入れます。
- 送るボタンは「変える」です。送っている間は「変えています…」になり、押せません（`useFormStatus`）。

### 問題7 useOptimistic のチェックボックス

`components/DoneToggle.tsx` に、`DoneToggle` を書いてください（本文3.4節）。`<DoneToggle done={task.status === 'done'} action={…} />` のように使います。

- 「完了」という名前の（`<label>` で包んだ）チェックボックスを出します。props の `done` が `true` ならチェックを付けます。
- 押したら、返事を待たずにチェックを変え（`useOptimistic`）、`action(新しい値)` を呼びます。
- `action` が返した `error` があれば、`role="alert"` の要素で出します。そのとき、チェックは props の `done`（変わっていない値）に戻ります。

## 発展

### 問題8 消す入り口と If-Match

`app/api/tasks/[id]/route.ts` に、`GET` と `DELETE` を書いてください（本文2.3・2.4節、第43章 6節の If-Match）。

- `GET`: 本文2.4節と同じ。タスクを返し、無い・数字でない id なら 404 の problem+json を返します。
- `DELETE`: 次の順に確かめます。
  1. id が正の整数でなければ 404。
  2. `If-Match` ヘッダが無ければ 428。
  3. `If-Match` が `"3"` のような形（`"` で囲んだ正の整数）でなければ 400。
  4. `lib/api.ts` の `deleteTask` で消します。API が 4xx で断ったら（無い 404・古い 412）、同じステータスで problem+json を返します。
  5. 消せたら、本文の無い 204 を返します（`new Response(null, { status: 204 })`）。
- 失敗は、どれも `Content-Type: application/problem+json` で、`title` を持つ JSON です。
- `request.headers.get('If-Match')` で、ヘッダの値を読めます（無ければ `null`）。
