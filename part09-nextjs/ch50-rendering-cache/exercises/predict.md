# 第50章 練習問題4 予想して確かめる（調べる問題）

本文の `web`（`~/dev/part09/ch50-rendering-cache/web/`）で確かめます。練習用の API は、別のターミナルで `npm run api`（`~/dev/part09` で）で動かしておきます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `npx next dev -p 9540`（開発サーバ）で `/clock` を開き、数秒おきに何度か読み込み直します。A（ビルドのときの時刻）には、何時が出ますか。読み込み直すと変わりますか。
   - 予想:
   - 結果:
2. `npx next build` → `npx next start -p 9540` で動かし、DevTools の Network で、`/stats`・`/clock`・`/help/start` を開いたときの、応答の `Cache-Control` ヘッダを見ます。それぞれ何ですか。第2部 第7章で学んだ言葉で説明してください。
   - 予想:
   - 結果:
3. `/help/xyz`（一覧に無い値）を `next start` で開きます。ステータスは何番ですか。（第47章 6節を思い出してください）
   - 予想:
   - 結果:
4. API を止めて（Ctrl+C）から、`npx next build` を動かします。何が起きますか。
   - 予想:
   - 結果:
5. `app/tasks/actions.ts` の `updateTag('tasks')` を、3か所とも `revalidateTag('tasks', 'max')` に変えて（import も変える）、ビルドし直して `next start` で動かします。`/stats` で数を見てから、`/tasks/new` でタスクを作り、すぐ `/stats` を開くと、数はどうなっていますか。もう一度開くと？
   - 予想:
   - 結果:
6. `lib/api.ts` の `getStats` から `cacheLife('minutes');` の行を消してビルドすると、表の `/stats` の右の `Revalidate` と `Expire` は、いくつになりますか（本文5節の表）。
   - 予想:
   - 結果:
