# 第50章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

このフォルダは、練習問題のフォルダ（`../exercises/`）に、答えを書き込んだ Next.js のアプリです。`exercises/` で次のように動かすと、模範解答をテストできます。

```sh
$ APP=../solutions npx vitest run app.test.ts actions.test.ts
```

| 問題 | ファイル |
| --- | --- |
| 1 | [app/built/page.tsx](app/built/page.tsx) |
| 2 | [app/now/page.tsx](app/now/page.tsx) |
| 3 | [app/fruits/[name]/page.tsx](app/fruits/%5Bname%5D/page.tsx) |
| 4 | この README の下 |
| 5 | [lib/count.ts](lib/count.ts) の `getTaskCount`、[app/count/page.tsx](app/count/page.tsx) |
| 6 | [app/api/revalidate/route.ts](app/api/revalidate/route.ts) |
| 7 | [app/count/actions.ts](app/count/actions.ts) |
| 8 | [lib/count.ts](lib/count.ts) の `getFreshCount`、[app/fresh/page.tsx](app/fresh/page.tsx) |

## 問題1〜3 のポイント

- 問題1: `'use cache'` は、ページの部品そのものに書いても構いません。ここでは、時刻を出す部品だけに書き、ページの残りと分けています。`cacheLife('max')` は「30 日たつまで作り直さない」なので、ビルドし直さない限り、ほぼ同じ時刻が出続けます。
- 問題2: `connection()` は、`<Suspense>` の**中の**部品で呼びます。ページの部品で呼ぶと、ページ全体が「リクエストが来てから」になり、`<Suspense>` が無ければビルドが失敗します。見出しは、`<Suspense>` の外に置くので、静的な殻に入ります。
- 問題3: `generateStaticParams` は、`[name]` の値の一覧を `{ name: 'apple' }` の形の配列で返します。ページの部品の側は、第47章の `/tasks/[id]` と同じく、`params` を待って探し、無ければ `notFound()` です。

## 問題4 の答え

1. **最初に開いた時刻**が出ます。開発サーバはビルドしないので、「ビルドのとき」は無く、最初に開いたときに作って覚えます。読み込み直しても変わりません（ファイルを書き換えると、作り直されることがあります）。開発サーバで「変わらない」ことを見ても、本番で同じとは限らないので、キャッシュは `next start` で確かめます（本文7節）。
2. 次のとおりです。
   - `/stats`: `s-maxage=60, stale-while-revalidate=3540`。共有のキャッシュ（CDN など）は 60 秒そのまま使ってよく、その後 3540 秒（合わせて 1 時間）は、古いものを返しながら聞き直してよい。`cacheLife('minutes')` の revalidate（1分）と expire（1時間）です。
   - `/clock`: `private, no-cache, no-store, max-age=0, must-revalidate`。リクエストごとに作る部分（C・D）があるので、どこにも覚えさせない。
   - `/help/start`: `s-maxage=31536000`。1年。中身は、ビルドし直すまで変わらないからです。
   - 応答には `x-nextjs-cache: HIT`（覚えたものを返した）・`STALE`（古いものを返し、裏で作り直した）のようなヘッダも付いています。
3. **200** です（HTML に `<meta name="robots" content="noindex">` が入る）。一覧に無い値は、静的な殻を返し始めてから、ページの部品が `notFound()` を呼ぶので、第47章 6節の `/tasks/abc` と同じになります。
4. ビルドが失敗します。`/stats` を前もって作るために `getStats()` を呼び、API に `fetch` したところで `TypeError: fetch failed`（`ECONNREFUSED`。つなげない）になります。本文3.1節のとおり、前もって作るページは、ビルドのときにデータを読みます。
5. すぐ開いた `/stats` は、**まだ古い数**です。もう一度開くと、新しい数になります。`revalidateTag(…, 'max')` は「古いことにする」だけで、次の1回は古いものを返しながら、裏で作り直すからです。自分で作ったものが、作った直後の画面に出ないので、Server Action では `updateTag` を使います（本文4.2節の表）。
6. `Revalidate` は **15m**、`Expire` は **1y** になります。`cacheLife` を書かないと `default`（revalidate 15 分、expire 無し）になるからです（「無し」は、表では 1 年と出ます）。コードを読んでも長さが分からないので、`cacheLife` はいつも書きます。

## 問題5〜8 のポイント

- 問題5: `getTaskCount` には引数が無いので、覚える結果は1つだけです。`/count` のページは、`<Suspense>` が無くても、覚えた結果を使うので、ビルドが通ります（○ になる）。
- 問題6: `revalidateTag` は、Route Handler でも呼べます（`updateTag` は呼べません）。合言葉を比べるのに `===` を使っていますが、本番では、比べる時間の違いから合言葉を推し量られないように、`crypto.timingSafeEqual`（第10部）を使います。
- 問題7: `updateTag` は `redirect` の前に呼びます。`redirect` は投げて止めるので、後に書いた行は動きません（第49章 3.2節）。
- 問題8: `expire` が5分より短いので、とても短いキャッシュになり、前もって作る HTML には入りません（本文5節）。`<Suspense>` の中の部品で呼ばないと、ビルドで「`<Suspense>` の外で…」のエラーになります。`revalidate: 2` なので、2秒より古ければ、次に開いたときに裏で作り直し、その次に開いたときに新しい数になります。テストが何度か開き直すのは、そのためです。
