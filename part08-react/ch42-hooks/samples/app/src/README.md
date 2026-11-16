# samples/app/src — ch42-hooks の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [App.tsx](App.tsx) | 第42章 1節: 実験を切り替える画面。描画のたびに Console に出す |
| [Board.tsx](Board.tsx) | 第42章 8節: useReducer で、タスクの配列の変え方を1か所にまとめる。4節: 残りの数は state にしない |
| [Clock.tsx](Clock.tsx) | 第42章 3.2節: setInterval を始める Effect と、止める後片付け。7節で useNow に取り出したもの |
| [SearchBox.tsx](SearchBox.tsx) | 第42章 5節: useRef（DOM を指す・描画に使わない値を持つ）。6節: useMemo で重い計算を覚えておく |
| [Snapshot.tsx](Snapshot.tsx) | 第42章 2節: state はスナップショット。まとめて更新・更新関数。3.1節: document.title を合わせる Effect。5.2節: useRef でタイマーの番号を持つ |
| [hooks.ts](hooks.ts) | 第42章 7節: カスタムフック。名前は use で始め、中で他のフックを使う |
| [main.tsx](main.tsx) | 第42章 1節: 第41章と同じ入り口。StrictMode は、開発中だけ、描画や Effect をわざと2回動かす（3.4節） |
| [tasksReducer.ts](tasksReducer.ts) | 第42章 8節: 「今の state と出来事（action）から、次の state を返す」関数 |
