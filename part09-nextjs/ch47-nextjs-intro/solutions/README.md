# 第47章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

このフォルダは、練習問題のフォルダ（`../exercises/`）に、答えのページを足した Next.js のアプリです。`exercises/` で次のように動かすと、模範解答をテストできます。

```sh
$ APP=../solutions npx vitest run app.test.ts
```

| 問題 | ファイル |
| --- | --- |
| 1 | [app/hello/page.tsx](app/hello/page.tsx) |
| 2 | [app/about/page.tsx](app/about/page.tsx) |
| 3 | [app/greet/[name]/page.tsx](app/greet/[name]/page.tsx)、[app/greet/[name]/loading.tsx](app/greet/[name]/loading.tsx) |
| 4 | この README の下 |
| 5・7 | [app/tasks/page.tsx](app/tasks/page.tsx)、[app/tasks/loading.tsx](app/tasks/loading.tsx) |
| 6・8 | [app/tasks/[id]/page.tsx](app/tasks/[id]/page.tsx) |
| 8 | [app/pages/page.tsx](app/pages/page.tsx)、[app/pages/loading.tsx](app/pages/loading.tsx) |

## 問題1〜3 のポイント

- 問題1: `app/hello/page.tsx` の `export default` の部品が、そのまま `/hello` のページになります。表に書く手間は、ありません。
- 問題2: `metadata` の `title` に `'このアプリについて'` とだけ書けば、レイアウトの `template` の `%s` に入ります。ページの側で「| 練習問題」まで書くと、「このアプリについて | 練習問題 | 練習問題」になります。
- 問題3: `params` の `name` は、`/greet/ねこ` なら `'%E3%81%AD%E3%81%93'` です。`decodeURIComponent` で戻します。`loading.tsx` は、`params` を待つ間に出すものです。無くても画面は出ますが、開発サーバに赤い印が出て、ビルドすると失敗します。

## 問題4 の答え

1. **`next dev` のターミナル**に出ます。ブラウザの Console には出ません。`app/` の部品は、ふだんはサーバで動く Server Component だからです（第48章で、ブラウザでも動く部品と比べます）。
2. 画面は、一覧が出るまでメニューも出ない（API が速いと、違いは分かりにくい。`API_DELAY_MS=2000 npm run api` で確かめる）うえに、左下に赤い「1 Issue」の印が出ます。ターミナルには `Error: Route "/tasks": Next.js encountered uncached data during prerendering.` と出ます。`loading.tsx` が無いと、ページを `<Suspense>` で包む物が無いので、API を待つ間、何も送れません（本文5.3節）。
3. `<Link>` では、`about?_rsc=…` という小さなリクエストだけで、画面は白くなりません。`<a>` では、`about`（HTML 全体）と、たくさんの JavaScript・CSS のファイルが読み直され、画面が一瞬白くなります（本文4節）。
4. `/abc` は **404**、`/tasks/abc` は **200** です。`/abc` は、どのフォルダにも合わないことが、何も読まないうちに分かります。`/tasks/abc` は、メニューと「読み込んでいます…」を先に送り始めてから、ページの部品が `notFound()` を呼ぶので、ステータスを変えられません。代わりに `<meta name="robots" content="noindex">` が入ります（本文6.2節）。
5. 「練習問題」（`/about` なら、本文の `web` では「タスク管理」）になります。ページが title を決めないときは、レイアウトの `default` が使われます。
6. `/about` は **○**（Static）、`/tasks` は **◐**（Partial Prerender）です。`about` は、**ビルドの途中で1回**（ワーカーの数によっては2回）出て、`next start` の後は、何度開いても出ません。前もって作った HTML を返すだけだからです（本文9節）。

## 問題5〜8 のポイント

- 問題5: 部品を `async` にして、`const { items } = await listTasks()` と書くだけです。第43章の `useEffect`・TanStack Query と比べると、「読み込み中」「失敗」の state を自分で持たなくてよいのが分かります。読み込み中は `loading.tsx`、失敗は `error.tsx`（本文6.2節）が受け持ちます。
- 問題6: `Number('1.5')` は `1.5`、`Number('0')` は `0` です。正規表現で「1 以上の整数」を確かめてから数にします（第44章 3節と同じ）。API に `abc` をそのまま送ると、API が 404 か 400 を返しますが、聞く前に分かることは、聞かずに決めます。
- 問題7: リンクは `<Link>` にし、`aria-current` には、今の条件のときだけ `'page'`、ほかは `undefined`（属性を出さない）を渡します。`false` を渡すと `aria-current="false"` が出ます。
- 問題8: `generateMetadata` と、ページの部品の両方でタスクを読みますが、1回の表示の中で同じ URL への `fetch` は1回にまとめられます。`searchParams` の `cursor` は、`?cursor=a&cursor=b` なら配列になるので、`typeof cursor === 'string'` で確かめます。
