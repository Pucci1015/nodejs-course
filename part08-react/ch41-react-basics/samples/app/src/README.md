# samples/app/src — ch41-react-basics の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [App.tsx](App.tsx) | 第41章 7節: タスクの配列（state）は、それを使う部品の共通の親（App）が持つ |
| [Counter.tsx](Counter.tsx) | 第41章 6.1節: はじめての state |
| [TaskForm.tsx](TaskForm.tsx) | 第41章 6・7節: 入力欄の文字を state に持つ（制御されたコンポーネント）。送られたら onAdd を呼ぶ |
| [TaskItem.tsx](TaskItem.tsx) | 第41章 3・5・6節: タスク1つ分。表示に要るものと、「押されたら呼ぶ関数」を props で受け取る |
| [TaskList.tsx](TaskList.tsx) | 第41章 4・5節: 一覧。配列は map で並べ、key に id を渡す |
| [main.tsx](main.tsx) | 第41章 1節: 入り口。#root の中に、App を描く |
| [types.ts](types.ts) | 第41章 3節: この章の画面で使うタスクの型（API はまだ使わない。第43章でつなぐ） |
