# 第48章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

このフォルダは、練習問題のフォルダ（`../exercises/`）に、答えの部品とページを足した Next.js のアプリです。`exercises/` で次のように動かすと、模範解答をテストできます。

```sh
$ MODULE=../solutions/components/LikeButton.tsx npx vitest run LikeButton.test.tsx   # 問題1（ほかも同じ形）
$ APP=../solutions npx vitest run app.test.ts                                        # 問題5
```

| 問題 | ファイル |
| --- | --- |
| 1 | [components/LikeButton.tsx](components/LikeButton.tsx) |
| 2 | [components/NavLink.tsx](components/NavLink.tsx) |
| 3 | [components/Spoiler.tsx](components/Spoiler.tsx) |
| 4 | この README の下 |
| 5 | [app/overview/page.tsx](app/overview/page.tsx) |
| 6 | [components/StatusFilter.tsx](components/StatusFilter.tsx) |
| 7 | [components/TaskTotal.tsx](components/TaskTotal.tsx) |
| 8 | [components/LiveRefresh.tsx](components/LiveRefresh.tsx) |

## 問題1〜3 のポイント

- 問題1: 第41章の数えるボタンと同じ書き方です。違うのは、1行目の `'use client';` だけです。これが無いと、`useState` を使ったところで、Server Component では使えないというエラーになります（問題4の2）。
- 問題2: `pathname.startsWith(href)` だけだと、`/tasks-old` も `/tasks` の下になってしまいます。`` `${href}/` `` で始まるかを見ます。`/` は、どのパスも `/` で始まるので、別に扱います。`aria-current` には、今のページでなければ `undefined` を渡します（第47章の問題7と同じ）。
- 問題3: `useId()`（第45章）で `id` を作ると、2つ置いてもぶつかりません。`children` には、Server Component が作ったもの（API から読んだ答えなど）も入れられます（本文3.2節）。開け閉めはブラウザで、中身はサーバで、という分け方です。

## 問題4 の答え

1. **両方**に出ます。ターミナルには、最初の HTML を作るときの分が出ます（開発中は、前もって作るときの分なども合わせて、何回か出ます）。Console には **2回** 出ます。開発中は StrictMode（第42章）で、部品を2回描いて確かめるからです。Server Component の `console.log`（`HomePage を描きました`）も Console に出ますが、こちらは「Prerender」や「Server」の印が付いた、サーバの出力を写したものです。
2. ページが開けず、`You're importing a module that depends on \`useState\` into a React Server Component module. This API is only available in Client Components.` のようなエラーが、画面とターミナルに出ます。印が無いファイルは Server Component で、Server Component はブラウザで動かないので、`useState` は使えません（本文2.1節）。
3. `/about` が **500** になり、ターミナルに `Error: Event handlers cannot be passed to Client Component props.` と出ます。Server Component はブラウザに関数を送れないので、`onClick` を付けられません（本文3.3節）。ボタンは、Client Component に切り出します。
4. `'server-only' cannot be imported from a Client Component module.` のようなエラーになります。`lib/api.ts` の `import 'server-only'` が、ブラウザ用の部品から読まれたことに気づいて止めてくれます（本文4.1節）。もし止まらなければ、`API_TOKEN` を使うコードがブラウザに送られるところでした。
5. ターミナルには `API_TOKEN は dev-only-abc`、Console には `API_TOKEN は undefined` と出ます。`NEXT_PUBLIC_` で始まらない環境変数は、ブラウザに送るコードには入りません（本文4.2節）。ブラウザで中身が要る値なら `NEXT_PUBLIC_` を付けますが、秘密の値には付けません。
6. 見出しと3つの「…しています」の文がすぐに出て、**約2秒後に、3つとも一度に**出ます。`WithDueDate` は「1.5 秒待ってから API で2秒」で 3.5 秒かかりそうですが、`listTasks()`（絞り込み無し）は `DashboardPage` が `TaskCount` のために先に読み始めていて、1回の表示の中で同じ URL への `fetch` は1回にまとめられる（第47章 問題8のポイント）ので、その結果を使います。`StatusCounts` の3つは、`Promise.all` で同時に聞くので、2秒で終わります。

## 問題5〜8 のポイント

- 問題5: 見出しを `<Suspense>` の外に置き、API を待つ部分を、それぞれ `async` の部品にして `<Suspense>` で包みます。ページの部品そのものは `async` にしません。ページの部品で `await` すると、見出しも API を待つことになり、`loading.tsx` が無ければ、第47章のエラーになります。
- 問題6: 本文の `SearchBox` と同じく、`new URLSearchParams(searchParams)` で今のパラメータを写してから、`status` だけを変えます。`<select>` は `value` と `onChange` の組（第43章）で書けます。URL が変わると、`useSearchParams()` の値も変わり、選ばれている値も変わります。
- 問題7: `use(total)` を、`return` の中に直接書いてもかまいません。`use` は、ほかの Hook と違い、`if` の中でも呼べますが、ここでは必要ありません。
- 問題8: 第42章の `EventSource` の `useEffect` に、`router.refresh()` を足しただけです。`useEffect` の依存配列には `url` と `router` を入れます（`router` は、同じページの中では変わりません）。後片付けで `source.close()` を呼ばないと、StrictMode でつながりが2つになり、知らせ1つで2回読み直します。
  - Server Component が API を読む形のままで、知らせが来たら作り直してもらう、という分け方です。第8部（第43章・成果物）では、知らせを受けて TanStack Query の `invalidateQueries` を呼び、ブラウザで読み直しました。こちらは、サーバで作り直してもらいます。
