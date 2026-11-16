# 第48章 練習問題4 予想して確かめる（調べる問題）

本文の `web`（`~/dev/part09/ch48-server-client/web/`）を `npx next dev -p 9520` で、練習用の API を別のターミナルで `npm run api`（`~/dev/part09` で）で動かし、ブラウザと DevTools・ターミナルで確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `/` を開きます。`components/Counter.tsx` の `console.log('Counter を描きました', count)` は、`next dev` のターミナルと、ブラウザの DevTools の Console の、どちらに出ますか。Console には何回出ますか。
   - 予想:
   - 結果:
2. `components/Counter.tsx` の1行目の `'use client';` を消して、`/` を開きます。画面とターミナルには何が出ますか。
   - 予想:
   - 結果:
3. `app/about/page.tsx` の `<p>…</p>` の下に、`<button type="button" onClick={() => console.log('押した')}>押す</button>` を足して、`/about` を開きます。何が起きますか。
   - 予想:
   - 結果:
4. `components/Counter.tsx` に `import { listTasks } from '../lib/api.ts';` を足し、部品の中で `console.log(listTasks);` と書いて、`/` を開きます。何が起きますか。
   - 予想:
   - 結果:
5. `components/Counter.tsx` の部品の中に `console.log('API_TOKEN は', process.env.API_TOKEN);` を足します。`next dev` を一度止めて（Ctrl+C）、`API_TOKEN=dev-only-abc npx next dev -p 9520` で動かし直し、`/` を開きます。ターミナルと Console には、それぞれ何が出ますか。
   - 予想:
   - 結果:
6. API を一度止めて、`API_DELAY_MS=2000 npm run api`（どの応答も2秒遅らせる）で動かし直し、`/dashboard` を開きます。「全部で 5 件」「状態ごとの数」「締め切りのあるタスク」は、開いてから何秒くらいで、どの順に出ますか。（`WithDueDate` は 1.5 秒待ってから API を読むことに注意）
   - 予想:
   - 結果:
