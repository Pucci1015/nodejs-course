# samples/app/src — ch45-styling-a11y の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [App.tsx](App.tsx) | 第45章: ランドマーク・見出し・本文へのリンク・知らせる場所（aria-live）を持つ画面 |
| [DeleteDialog.tsx](DeleteDialog.tsx) | 第45章 8節: <dialog> の showModal で、本当に消すかを聞く |
| [NewTaskForm.tsx](NewTaskForm.tsx) | 第45章 6節: 名前・説明・間違いが、スクリーンリーダーにも伝わるフォーム |
| [TailwindCard.tsx](TailwindCard.tsx) | 第45章 4節: 同じカードを、Tailwind CSS のユーティリティのクラスで書いたもの |
| [TaskCard.module.css](TaskCard.module.css) | 第45章 2.2節: CSS Modules。ここに書いたクラスの名前は、このファイルを import した部品の中だけで使われる |
| [TaskCard.tsx](TaskCard.tsx) | 第45章 2.2節: CSS Modules で見た目を付けたカード。5節: ボタン・見出し・チェックボックスの名前 |
| [index.css](index.css) | 第45章 2・3節: アプリ全体の CSS。色は CSS 変数にまとめ、テーマで入れ替える |
| [main.tsx](main.tsx) | 第45章 2節: アプリ全体の CSS を、入り口で1回だけ読み込む |
| [tailwind.css](tailwind.css) | 第45章 4節: Tailwind CSS のうち、決まりの値（色や大きさ）とユーティリティのクラスだけを読み込む |
| [theme.tsx](theme.tsx) | 第45章 3節: テーマ（system・light・dark）を Context で配り（第44章 7節）、<html data-theme> に反映する |
| [types.ts](types.ts) | 第45章: この章のタスクの型（API は使わず、画面の中の state に持つ） |
