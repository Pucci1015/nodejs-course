# 第46章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [serialize.ts](serialize.ts) | `MODULE=../solutions/serialize.ts npx vitest run serialize.test.ts` |
| 2 | [head.ts](head.ts) | `MODULE=../solutions/head.ts npx vitest run head.test.ts` |
| 3 | [routes.ts](routes.ts) | `MODULE=../solutions/routes.ts npx vitest run routes.test.ts` |
| 4 | この README の下 | — |
| 5 | [render.tsx](render.tsx) | `MODULE=../solutions/render.tsx npx vitest run render.test.tsx` |
| 6 | [LocalTime.tsx](LocalTime.tsx) | `MODULE=../solutions/LocalTime.tsx npx vitest run LocalTime.test.tsx` |
| 7 | [dueLabel.ts](dueLabel.ts) | `MODULE=../solutions/dueLabel.ts npx vitest run dueLabel.test.ts` |
| 8 | [stream.tsx](stream.tsx) | `MODULE=../solutions/stream.tsx npx vitest run stream.test.tsx` |

## 問題1〜3 のポイント

- 問題1: HTML を読むブラウザは、`<script>` の中身を JavaScript として読む前に、`</script>` を探して script の終わりを決めます。データの中に `</script>` という文字があると、そこで script が終わり、後ろが HTML として読まれてしまいます。`<` を `<` にすれば、`</script>` という並びは決して現れません。`JSON.stringify` だけでは、これを防げません。
- 問題2: `&` を最後に変えると、`<` から作った `&lt;` の `&` が、もう一度 `&amp;` に変わり、`&amp;lt;` になってしまいます。
- 問題3: `/tasks/3` と `/tasks/3/` を両方 200 で返すと、検索エンジンからは同じ中身のページが2つあるように見えます。どちらかにそろえ、もう片方は移す（301）のがふつうです。

## 問題4 の答え

1. SSR の app では、`<div id="root">` の中に、`<h1>タスク（5 件）</h1>` や、タスクの題名のリンクが入っています。第44章の app では、`<div id="root"></div>` は空で、題名はどこにもありません（JavaScript が動いてから作るため）。curl や、JavaScript を動かさない検索エンジン・リンクのプレビュー（SNS にURL を貼ったときのカード）は、SSR のページなら中身を読めます。
2. 一覧は出ます（HTML に入っているから）。題名のリンクを押して、詳しいページへも移れます（`<a href>` なので）。絞り込みの欄に打っても、絞り込まれません（打った文字は入るが、React の `onChange` が動かない）。上の行は「JavaScript: まだ動いていません」のままです。第44章の app で同じことをすると、真っ白なページになります。
3. SSR の app は **404** です。第44章の app を `vite preview` で動かすと **200** です（中身は「ページが見つかりません」と出る）。どの URL にも `index.html` を 200 で返し、画面だけが「見つからない」と出すものを **ソフト 404** と呼びます。検索エンジンは、そのページが本当にあると思って登録してしまいます。SSR では、サーバがページの中身を知っているので、本当の 404 を返せます（本文5節）。
4. Console に `ハイドレーションの食い違い: Error: Minified React error #418; visit https://react.dev/errors/418?args[]=text…` と出ます（ビルドしたファイルなので、文が短い番号になっている。リンクを開くと「Hydration failed because the server rendered text didn't match the client.」と分かる）。サーバが描いた時刻と、ブラウザが描いた時刻が違うからです。React は、食い違いを見つけると、そこから下をブラウザで描き直すので、画面の日時は**ブラウザが作ったもの**になります。描き直しの分だけ遅くなり、場合によっては画面がちらつきます。描画の中で、時刻・乱数・`window` のような、サーバとブラウザで変わるものを使わないようにします（本文4節）。
5. `curl -N` では、見出しと「この行は、すぐに届きます。」「集計中…」までがすぐ出て、2秒たってから、`<div hidden id="S:0"><p>全部で 5 件…</p></div><script>…</script>` が出て、終わります。JavaScript を止めたブラウザでは、2秒たっても「集計中…」のままです。後から届いた部分は `hidden` で隠れていて、`<script>` の中の小さな JavaScript が「集計中…」と入れ替えるからです。ストリーミングの入れ替えには JavaScript が要ります。
6. ページには「ページを作れませんでした」と出て、ステータスは 500 です。`node server.ts` のターミナルには `ReferenceError: window is not defined` と出ます。サーバ（Node.js）には `window` も `document` も無いからです。ブラウザでしか使えないものは、`useEffect` の中（ブラウザでしか動かない）か、イベントの関数の中で使います。

## 問題5〜8 のポイント

- 問題5: ステータスを決めるのは、HTML を作る側です。HTML の中身だけ「見つかりません」にして、ステータスを 200 のままにしないように、2つを一緒に返しています。
- 問題6: `useSyncExternalStore` の `getServerSnapshot` は、サーバで描くときと、ハイドレーションの最初の描画で使われます。そのため、ハイドレーションの最初の描画は、サーバの HTML と同じ文字になり、食い違いません。その後で React がもう一度描き、`getSnapshot` の値（`true`）を使います。
- 問題7: `Intl.DateTimeFormat('en-CA', …)` は、`2026-11-12` の形の日付を作ります（カナダの英語の書き方）。`timeZone` を渡すと、サーバがどこで動いていても、その場所の日付になります。サーバで `today` を決めて画面に渡せば、サーバとブラウザで「今日」が食い違うこともありません。
- 問題8: `renderToPipeableStream` は、`onShellReady`（Suspense の外と fallback ができた）のときに `pipe` を呼ぶと、そこから送り始めます。`onAllReady`（全部できた）で `pipe` すると、全部できるまで何も送らなくなります。検索エンジン向けなど、全部まとめて送りたいときは、こちらを使います。
