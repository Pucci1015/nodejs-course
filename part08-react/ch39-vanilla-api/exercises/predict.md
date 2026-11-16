# 第39章 練習問題4 予想して確かめる（調べる問題）

本文の `app.html`（`~/dev/part08/ch39-vanilla-api/app.html`）を、ブラウザと DevTools で動かして確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。

1. `renderTask` の `title.textContent = task.title` を `title.innerHTML = task.title` に変えて、題名が `<b>太字</b>` のタスクを作ると、画面にはどう出ますか。`textContent` に戻すとどうですか。
   - 予想:
   - 結果:
2. フォームの `submit` の中の `event.preventDefault();` を消して「追加」を押すと、何が起きますか（DevTools の Network と、アドレスバーを見る）。
   - 予想:
   - 結果:
3. Network で、一覧を読む `GET /api/tasks` の前と、チェックを付けたときの `PATCH /api/tasks/…` の前に、`OPTIONS` のリクエストはありますか。それぞれ、なぜですか。
   - 予想:
   - 結果:
4. 練習用の API を Ctrl+C で止めてから、ページを読み直すと、`#status` には何が出ますか。Console には何が出ますか。
   - 予想:
   - 結果:
5. ページを開いたまま API を止め、5 秒ほどしてから `npm run api` で起動し直すと、画面の一覧はどうなりますか（Network の `events` の行と、Console を見る）。
   - 予想:
   - 結果:
6. ブラウザのタブを2つ開き、片方でタスクのチェックを付けます。もう片方の画面は、すぐに変わりますか。7節の SSE の部分（`new EventSource` から下）を消すと、どうなりますか。
   - 予想:
   - 結果:
