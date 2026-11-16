# 第45章 練習問題4 予想して確かめる（調べる問題）

本文の `app`（`~/dev/part08/ch45-styling-a11y/app/`）を `npx vite` で動かし、ブラウザと DevTools で確かめます（この章の app は API を使いません）。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. ページを読み込み直し、マウスを使わずに Tab キーを1回押します。どこにフォーカスが来て、画面はどう変わりますか。そこで Enter を押すと、どうなりますか。続けて Tab を押すと、次はどこに来ますか。
   - 予想:
   - 結果:
2. DevTools の Elements タブで、CSS Modules の一覧の `<li>` を選びます。`class` の値は何になっていますか。`TaskCard.module.css` に書いたクラスの名前（`card`）と違うのはなぜですか。
   - 予想:
   - 結果:
3. `TaskCard.tsx` の削除ボタンの `aria-label={…}` を消します。DevTools の Elements タブで、そのボタンを選び、右側の **Accessibility** タブの「Name」を見ます。何になっていますか。元の書き方では何でしたか。
   - 予想:
   - 結果:
4. テーマを「OS に合わせる」にして、DevTools の右上の︙ → More tools → **Rendering** を開き、「Emulate CSS media feature prefers-color-scheme」を `prefers-color-scheme: dark` にします。画面の色はどうなりますか。テーマを「明るい色」にすると、どうなりますか。
   - 予想:
   - 結果:
5. 「牛乳を買う」の削除ボタンを押してダイアログを開きます。Tab キーを何回か押すと、フォーカスはどこを回りますか。ダイアログの外の「追加」ボタンをマウスで押せますか。Esc キーを押すと、どうなりますか。
   - 予想:
   - 結果:
6. DevTools の **Lighthouse** タブで、「Accessibility」だけにチェックを入れて「Analyze page load」を押します。点数はいくつですか。次に、`index.css` の `:root` の `--muted` を `#b0b0b0` に変えて、もう一度測ると、何が指摘されますか。
   - 予想:
   - 結果:
