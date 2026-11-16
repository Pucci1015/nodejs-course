# 第45章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts) | React と Tailwind CSS のプラグイン | 1・4 |
| [app/index.html](app/index.html)、[app/tsconfig.json](app/tsconfig.json) | `lang="ja"`・`viewport` のある HTML | 1・5.1 |
| [app/src/main.tsx](app/src/main.tsx) | 全体の CSS を読み込む入り口 | 2.1 |
| [app/src/index.css](app/src/index.css) | 全体の CSS。CSS 変数・テーマ・`:focus-visible`・`.visually-hidden` | 2.1・3・5 |
| [app/src/types.ts](app/src/types.ts) | タスクの型 | 1 |
| [app/src/TaskCard.module.css](app/src/TaskCard.module.css)、[app/src/TaskCard.tsx](app/src/TaskCard.tsx) | CSS Modules のカード | 2.2・5 |
| [app/src/tailwind.css](app/src/tailwind.css)、[app/src/TailwindCard.tsx](app/src/TailwindCard.tsx) | Tailwind CSS のカード | 4 |
| [app/src/theme.tsx](app/src/theme.tsx) | テーマの Context と、ラジオボタン | 3・6.1 |
| [app/src/NewTaskForm.tsx](app/src/NewTaskForm.tsx) | ラベル・説明・間違いのつながったフォーム | 6 |
| [app/src/DeleteDialog.tsx](app/src/DeleteDialog.tsx) | `<dialog>` で確かめる | 8 |
| [app/src/App.tsx](app/src/App.tsx) | ランドマーク・見出し・「本文へ移動」・知らせる場所 | 5・7 |

## 動かし方

```sh
$ cd ~/dev/part08/ch45-styling-a11y/samples/app
$ npx vite        # http://localhost:5173/（Ctrl+C で止める）。この章は API を使わない
$ npx tsc
$ npx eslint .
```
