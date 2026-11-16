# 第44章 練習問題4 予想して確かめる（調べる問題）

本文の `app`（`~/dev/part08/ch44-routing-state/app/`）を `npx vite` で、練習用の API を別のターミナルで `npm run api` で動かし、ブラウザと DevTools で確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `Layout.tsx` の「一覧」の `NavLink` から `end` を消します。「新しいタスク」のページを開くと、メニューのどのリンクに `aria-current="page"` が付きますか（DevTools の Elements で見る）。
   - 予想:
   - 結果:
2. `TaskListPage.tsx` の `<Link to={…}>…</Link>` を `<a href={…}>…</a>` に変えます。一覧でタスクの題名を押して、詳しいページへ移るとき、DevTools の Network タブには何が出ますか。画面はどう見えますか。
   - 予想:
   - 結果:
3. `TaskListPage.tsx` の検索欄の `{ replace: true }` を消し、検索欄に「レポート」と打ちます（`Ctrl+V` で貼り付けずに、1文字ずつ）。その後、ブラウザの「戻る」を押すと、どこへ戻りますか。
   - 予想:
   - 結果:
4. `router.tsx` の `{ path: '*', … }` の行を、`children` の一番上に動かします。`/`・`/tasks/new`・`/tasks/2`・`/zzz` を開くと、それぞれ何のページが出ますか。
   - 予想:
   - 結果:
5. `main.tsx` の `<SettingsProvider>` と `</SettingsProvider>` を `<>` と `</>` に変えます。ページには何が出ますか。それはなぜですか。
   - 予想:
   - 結果:
6. `npx vite build` で作った `dist` を、Python の簡単な Web サーバで配ります（`python3 -m http.server 8000` は、今いるフォルダのファイルを http://localhost:8000/ で配るコマンド）。
   ```sh
   $ npx vite build
   $ cd dist
   $ python3 -m http.server 8000
   ```
   http://localhost:8000/ を開いてから一覧のタスクを押すと、どうなりますか（API には届かないので、一覧は「読み込めませんでした」でかまいません。そのときは、アドレス欄に http://localhost:8000/tasks/2 と打って開く）。http://localhost:8000/tasks/2 を直接開くと、どうなりますか。（確かめたら Ctrl+C で止め、`cd ..` で戻ります）
   - 予想:
   - 結果:
