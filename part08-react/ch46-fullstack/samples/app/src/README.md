# samples/app/src — ch46-fullstack の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [App.tsx](App.tsx) | 第46章 2節: サーバでも、ブラウザでも描く部品。props の data だけから描く（どちらでも同じ結果になるように） |
| [data.ts](data.ts) | 第46章 2節: サーバが読んで、画面に渡すデータの形 |
| [entry-client.tsx](entry-client.tsx) | 第46章 3節: ブラウザの入り口。サーバが作った HTML に、イベントと state をつなぐ（ハイドレーション） |
| [entry-server.tsx](entry-server.tsx) | 第46章 2・6節: サーバの入り口。データから HTML の文字を作る |
