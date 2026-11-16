# 第44章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

模範解答は、問題の道具（`types.ts`・`pages.tsx`）を `../exercises/` から読み込みます。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [listParams.ts](listParams.ts) | `MODULE=../solutions/listParams.ts npx vitest run listParams.test.ts` |
| 2 | [Nav.tsx](Nav.tsx) | `MODULE=../solutions/Nav.tsx npx vitest run Nav.test.tsx` |
| 3 | [TaskIdPage.tsx](TaskIdPage.tsx) | `MODULE=../solutions/TaskIdPage.tsx npx vitest run TaskIdPage.test.tsx` |
| 4 | この README の下 | — |
| 5 | [Pager.tsx](Pager.tsx) | `MODULE=../solutions/Pager.tsx npx vitest run Pager.test.tsx` |
| 6 | [theme.tsx](theme.tsx) | `MODULE=../solutions/theme.tsx npx vitest run theme.test.tsx` |
| 7 | [AppRoutes.tsx](AppRoutes.tsx) | `MODULE=../solutions/AppRoutes.tsx npx vitest run AppRoutes.test.tsx` |
| 8 | [selection.tsx](selection.tsx) | `MODULE=../solutions/selection.tsx npx vitest run selection.test.tsx` |

## 問題1〜3 のポイント

- 問題1: `STATUSES.filter((s) => raw.includes(s))` と書くと、「知らない値を捨てる」「同じものを1つにする」「決まった順にそろえる」が1行でできます。順番を、URL の中の順ではなく `STATUSES` の順で決めているからです。
- 問題2: `/` は、どの URL の先頭にも合うので、`end` が無いと、いつも今のページになってしまいます（練習問題4の問1）。`NavLink` は、今のページのリンクに `aria-current="page"` を自分で付けます。スクリーンリーダーは「現在のページ」と読み上げます（第45章）。
- 問題3: `Number('1e3')` は `1000`、`Number(' 3 ')` は `3`、`Number('')` は `0` になります。`Number` で変えてから確かめるのではなく、先に正規表現で「数字だけ」を確かめてから変えます（第5部の API の `parseId` と同じ考え方）。

## 問題4 の答え

1. 「一覧」と「新しいタスク」の**2つ**に `aria-current="page"` が付きます。`NavLink` は、決まりでは「今の URL が、リンク先**で始まって**いれば今のページ」とみなします（`/tasks/new` は `/` で始まる）。`end` を付けると、ぴったりのときだけになります。
2. Network タブに、`2`（`/tasks/2` の HTML）・`main.tsx` などのファイルの読み込みと、`tasks/2` の API が出ます。画面は一度真っ白になり、「読み込み中…」が出てから、詳しいページになります。`<a href>` は、ブラウザに**ページ全部を読み込み直させる**からです。JavaScript も最初から動き直すので、TanStack Query のキャッシュも消えます。`<Link>` なら、React Router が URL だけを変えて、ページの部品を差し替えます（本文5.1節）。
3. 「戻る」を押すと、「レポー」に戻ります。1文字打つごとに、履歴が1つ増えているからです（「戻る」を5回押して、やっと検索の前に戻る）。`replace: true` は、新しい履歴を足さずに、今の履歴を書き換えます。
4. どれも、元と同じページが出ます。React Router は、書いた順ではなく、**どれだけ細かく合っているか**（`tasks/new` は `tasks/:id` より細かい、`*` はいちばん粗い）でルートを選ぶからです。
5. 「問題が起きました」と、`useSettings は <SettingsProvider> の中で使ってください` が出ます。`Layout` の `useSettings` が `Error` を投げ、ルートの `errorElement`（`ErrorPage`）が受け止めたからです。Context の Provider で包むのを忘れたとき、`undefined` のまま進まずに、分かりやすい文で止まるのは、`useSettings` の中で `null` を確かめているおかげです（本文7.2節）。
6. http://localhost:8000/ から一覧のリンクを押すと、詳しいページの形になります（URL も `/tasks/2` に変わる）。ところが、http://localhost:8000/tasks/2 を直接開く（か、そのページで読み込み直す）と、`Error response` `Error code: 404` が出ます。`<Link>` で移るときは、ブラウザがサーバに何も聞かずに URL を変えるだけですが、直接開くときは、サーバに `/tasks/2` というファイルを聞きます。`dist` には `index.html` しか無いので、404 です。本番のサーバは、ファイルの無い URL には `index.html` を返すように設定します（本文2.4節）。`npx vite` と `npx vite preview` は、これを自動でしてくれます。

## 問題5〜8 のポイント

- 問題5: `new URLSearchParams(prev)` でコピーしてから `set`・`delete` します。`prev` を直接変えると、React Router が持っている値を書き換えることになります（第42章 2.4節と同じ理由）。
- 問題6: Provider の外のときの値を `null` にしておき、`useTheme` で確かめて投げます。`createContext({ theme: 'light', toggle: () => {} })` のように、それらしい決まりの値を入れると、包み忘れても動いてしまい、「押しても何も起きない」というまちがいに気づきにくくなります。
- 問題7: `<Route path="tasks">` のように、`element` の無い親のルートは、URL をまとめるだけで、子のページをそのまま出します。`/tasks/1/x` はどの子にも合わないので、`Layout` の下の `*` に合います。
- 問題8: Context の値が変わると、その Context を `useContext` で読んでいる部品は、全部描き直されます。値と `dispatch` を分けると、`dispatch` は描画のたびに同じものなので、`dispatch` だけを読む部品は描き直されません。数十の部品なら気にしなくてよい差ですが、大きな一覧では効いてきます（本文7.3節）。
