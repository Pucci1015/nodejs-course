# 第41章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts) | React のプラグインを入れた Vite の設定 | 1 |
| [app/index.html](app/index.html)、[app/src/main.tsx](app/src/main.tsx) | 入り口。`createRoot` と `StrictMode` | 1 |
| [app/src/types.ts](app/src/types.ts) | タスクの型 | 3 |
| [app/src/TaskItem.tsx](app/src/TaskItem.tsx) | タスク1つ分。props・条件の出し分け | 3・5 |
| [app/src/TaskList.tsx](app/src/TaskList.tsx) | 一覧。`map` と `key` | 4・5 |
| [app/src/Counter.tsx](app/src/Counter.tsx) | はじめての `useState` | 6.1 |
| [app/src/TaskForm.tsx](app/src/TaskForm.tsx) | 制御されたフォーム | 6.2 |
| [app/src/App.tsx](app/src/App.tsx) | タスクの配列を持ち、子に渡す（state を持ち上げる） | 7 |

## 動かし方

```sh
$ cd ~/dev/part08/ch41-react-basics/samples/app
$ npx vite        # http://localhost:5173/（Ctrl+C で止める）
$ npx tsc         # 型を確かめる（エラーは出ない）
```
