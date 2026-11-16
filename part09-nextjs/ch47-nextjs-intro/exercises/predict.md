# 第47章 練習問題4 予想して確かめる（調べる問題）

本文の `web`（`~/dev/part09/ch47-nextjs-intro/web/`）を `npx next dev -p 9510` で、練習用の API を別のターミナルで `npm run api` で動かし、ブラウザと DevTools・ターミナルで確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `app/tasks/page.tsx` の部品の中に `console.log('一覧を描きました')` を足して、`/tasks` を開きます。この文は、ブラウザの DevTools の Console と、`next dev` のターミナルの、どちらに出ますか。
   - 予想:
   - 結果:
2. `app/tasks/loading.tsx` の名前を `loading-x.tsx` に変えて、`/tasks` を開きます。画面とターミナルには何が出ますか。（確かめたら、名前を戻す）
   - 予想:
   - 結果:
3. `app/layout.tsx` のメニューの `<Link href="/about">` を `<a href="/about">` に変えます。DevTools の Network を開いて、「このアプリについて」を押したときと、`<Link>` のときとで、何が違いますか。
   - 予想:
   - 結果:
4. `/tasks/abc` と `/abc` を開き、DevTools の Network で、それぞれのステータスを見ます。何番ですか。違うなら、なぜですか。
   - 予想:
   - 結果:
5. `app/about/page.tsx` の `export const metadata = …` の行を消すと、`/about` のタブの title はどうなりますか。
   - 予想:
   - 結果:
6. `npx next build` を動かします（開発サーバは止めてから）。結果の表で、`/about` と `/tasks` の前の記号は何ですか。`app/about/page.tsx` の部品に `console.log('about')` を足してからビルドし、`npx next start -p 9510` で動かして `/about` を何度か開くと、ターミナルに `about` は何回出ますか。
   - 予想:
   - 結果:
