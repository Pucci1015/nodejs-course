# 第49章 練習問題4 予想して確かめる（調べる問題）

本文の `web`（`~/dev/part09/ch49-actions-routes/web/`）を `npx next dev -p 9530` で、練習用の API を別のターミナルで `npm run api`（`~/dev/part09` で）で動かし、ブラウザと DevTools・ターミナルで確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. DevTools の Network を開いてから、`/tasks/new` で題名を入れて「作る」を押します。リクエストは、どの URL に、どのメソッドで送られますか。リクエストのヘッダに、Next.js らしい名前のものはありますか。
   - 予想:
   - 結果:
2. `app/tasks/actions.ts` の最後に `export const LIMIT = 100;` を足して、`/tasks/new` を開きます。何が起きますか。
   - 予想:
   - 結果:
3. `components/TaskForm.tsx` で、`<SubmitButton />` の代わりに、`TaskForm` の中で `const { pending } = useFormStatus();` と書き、`<button type="submit" disabled={pending}>` を直接置きます。`API_DELAY_MS=2000 npm run api` で API を遅くして「作る」を押すと、ボタンは押せなくなりますか。
   - 予想:
   - 結果:
4. DevTools で JavaScript を切ります（Command+Shift+P を押し、`JavaScript` と打って「Disable JavaScript」を選ぶ。DevTools を閉じると元に戻る）。この状態で `/tasks/new` を開き直し、題名を入れて「作る」を押すと、どうなりますか。移った先のタスクのページには、何が出ますか。
   - 予想:
   - 結果:
5. `app/layout.tsx` の `<LiveRefresh url="/api/events" />` を消し、同じタスクのページ（`/tasks/3` など）を2つのタブで開きます。1つ目のタブで状態を変えてから、2つ目のタブ（古いまま）でボタンを押すと、どうなりますか。
   - 予想:
   - 結果:
6. `npx next build` を動かします（開発サーバは止めてから）。結果の表で、`/api/health` と `/api/tasks` の前の記号は何ですか。違うなら、なぜですか。
   - 予想:
   - 結果:
