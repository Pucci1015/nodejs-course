# 第46章 練習問題4 予想して確かめる（調べる問題）

本文の `app`（`~/dev/part08/ch46-fullstack/app/`）をビルドして `node server.ts` で、練習用の API を別のターミナルで `npm run api` で動かして確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。`src/` を変えたら、本文2.5節の2つのビルドをやり直してから `node server.ts` を動かし直します。確かめたら、元に戻しておきます。

1. `curl http://localhost:5173/` を実行します。出てきた HTML の `<div id="root">` の中に、タスクの題名はありますか。第44章の app（`npx vite` で動かす）で同じことをすると、`<div id="root">` の中はどうでしたか（覚えていなければ、予想だけでかまいません）。
   - 予想:
   - 結果:
2. DevTools で `Command + Shift + P`（コマンドメニュー）を開き、`Disable JavaScript` を選んでから、ページを読み込み直します。一覧は出ますか。絞り込みの欄に打つと、絞り込まれますか。上の「JavaScript:」の行は何と出ますか。（確かめたら、`Enable JavaScript` で戻します）
   - 予想:
   - 結果:
3. `curl -i http://localhost:5173/tasks/99` のステータスは何ですか。第44章の app を `npx vite build` → `npx vite preview` で動かし、`curl -i http://localhost:4173/tasks/99` とすると、ステータスは何ですか。
   - 予想:
   - 結果:
4. `App.tsx` の `サーバで作った日時: {data.renderedAt}` を `サーバで作った日時: {new Date().toISOString()}` に変えます。ブラウザで開くと、Console に何が出ますか。画面の日時は、サーバが作ったものですか、ブラウザが作ったものですか。
   - 予想:
   - 結果:
5. `curl -N http://localhost:5173/stream` を実行します（`-N` は、届いた分をすぐ出す指定）。出力は、どのように出てきますか。ブラウザで JavaScript を止めて（問2）、http://localhost:5173/stream を開くと、2秒たった後に何が出ていますか。
   - 予想:
   - 結果:
6. `App.tsx` の `<HydrationBadge />` の下に `<p>幅: {window.innerWidth}</p>` を足します。ページを開くと、何が出ますか。`node server.ts` のターミナルには、何が出ますか。
   - 予想:
   - 結果:
