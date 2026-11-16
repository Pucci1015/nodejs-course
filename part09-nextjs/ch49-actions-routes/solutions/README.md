# 第49章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

このフォルダは、練習問題のフォルダ（`../exercises/`）に、答えを書き込んだ Next.js のアプリです。`exercises/` で次のように動かすと、模範解答をテストできます。

```sh
$ APP=../solutions npx vitest run app.test.ts actions.test.ts
$ MODULE=../solutions/components/RenameForm.tsx npx vitest run RenameForm.test.tsx
$ MODULE=../solutions/components/DoneToggle.tsx npx vitest run DoneToggle.test.tsx
```

| 問題 | ファイル |
| --- | --- |
| 1 | [app/api/hello/route.ts](app/api/hello/route.ts) |
| 2 | [app/api/sum/route.ts](app/api/sum/route.ts) |
| 3 | [app/greet/actions.ts](app/greet/actions.ts) |
| 4 | この README の下 |
| 5 | [app/tasks/[id]/actions.ts](app/tasks/%5Bid%5D/actions.ts) |
| 6 | [components/RenameForm.tsx](components/RenameForm.tsx) |
| 7 | [components/DoneToggle.tsx](components/DoneToggle.tsx) |
| 8 | [app/api/tasks/[id]/route.ts](app/api/tasks/%5Bid%5D/route.ts) |

## 問題1〜3 のポイント

- 問題1: `searchParams.get('name')` は、無ければ `null` です。`?.trim()` と `?? ''` で、「無い」と「空白だけ」を、どちらも空の文字にそろえています。
- 問題2: `request.json()` は、JSON でなければ失敗します。`.catch(() => undefined)` で `undefined` にすれば、Zod が「形が違う」として扱ってくれるので、失敗の道が1つにまとまります。`z.number()` は、`"2"` のような文字を数と認めません。
- 問題3: 1行目に `'use server';` を書くだけで、ブラウザから呼べる関数になります。中身は、ただの `async` 関数です。だからこそ、テストでは普通に呼んで確かめられます。

## 問題4 の答え

1. **今のページの URL**（`/tasks/new`）に、**`POST`** で送られます。ヘッダには **`Next-Action`**（関数の ID）があり、応答の `Content-Type` は `text/x-component`（RSC の形。第48章 8節）です。本文はフォームの中身です（`multipart/form-data`）。
2. ページが開けず、`Only async functions are allowed to be exported in a "use server" file.` と出ます。`'use server'` のファイルの export は、すべて「ブラウザから呼べる関数」になるので、`async` の関数以外は置けません。定数は、別のファイルに置きます。
3. **押せるまま**です。`useFormStatus` は、自分を**囲む** `<form>` の様子を返します。`TaskForm` は `<form>` を描く側で、`<form>` の中にはいないので、`pending` はいつも `false` です（本文3.2節で、ボタンを `SubmitButton` に分けた理由）。
4. タスクは**作れます**（ページ全体が読み込み直されて、作ったタスクの URL に移る）。Server Action を `action` に渡したフォームは、普通の HTML のフォームとしても送れるからです（本文6節の段階的な強化）。ただし、移った先のページは「**読み込んでいます…**」のままです。`<Suspense>` の中身は、後から流れてきた HTML を JavaScript で差し替えて出す（第46章 6節）ので、JavaScript が無いと差し替わりません。
5. 押した瞬間は、押した状態に変わります（`useOptimistic`）が、すぐに「**ほかの人が先に変えました。読み直してください**」が出て、状態は1つ目のタブで変えた後の値になります。2つ目のタブは古い `version` を送ったので、API が 412 で断り、`setStatusAction` が `refresh()` で最新のページを作り直してもらったからです。`LiveRefresh` があると、1つ目のタブで変えた時点で、2つ目のタブも新しくなります。
6. `/api/health` は **○**（Static）、`/api/tasks` は **ƒ**（Dynamic）です。`/api/health` は、リクエストの中身も API も使わないので、ビルドのときに1回だけ呼んで、結果を前もって作っておけます。`/api/tasks` は、`request.url`（クエリ）と API を使うので、呼ばれるたびに動きます（第50章で詳しく見ます）。

## 問題5〜8 のポイント

- 問題5: 確かめる順番が大事です。`id`・`version`・題名を確かめてから API を呼ぶので、おかしな値では API に何も送りません。`bind` した値も、ブラウザから届く値です（本文4節）。`refresh()` を失敗のときにも呼ぶのは、404・409・412 は「画面が古い」ことの印だからです。
- 問題6: `useActionState(action, 最初の結果)` の最初の結果を `{ error: null, title }` にすると、入力欄の最初の値と、エラーの無い状態を1つで表せます。`key={state.title}` で、返ってきた題名ごとに入力欄を作り直しています（本文3.2節）。
- 問題7: `useOptimistic(done)` は、トランジションが終わると、`done`（props）に戻ります。成功すれば、サーバで作り直したページから新しい `done` が届くので、そのまま。失敗すれば、`done` は変わらないので、元に戻ります。巻き戻しを自分で書かなくてよいのが、第43章との違いです。
- 問題8: `If-Match` の形は、正規表現 `/^"([1-9][0-9]*)"$/` で確かめ、`m[1]` の数を `version` にします。API の 404・412 を、そのまま同じステータスで返すと、呼ぶ側（ほかのアプリ）は、第5部の API と同じ決まりで扱えます。
