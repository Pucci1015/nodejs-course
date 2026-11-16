# 第42章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts)、[app/index.html](app/index.html)、[app/tsconfig.json](app/tsconfig.json) | 第41章と同じ設定 | 1 |
| [app/src/main.tsx](app/src/main.tsx) | 入り口。`StrictMode` | 1・3.4 |
| [app/src/App.tsx](app/src/App.tsx) | 実験を切り替える画面。描画のたびに Console に出す | 1 |
| [app/src/Snapshot.tsx](app/src/Snapshot.tsx) | スナップショット・まとめて更新・更新関数、`document.title` の Effect、タイマーの番号を持つ `useRef` | 2・3.1・5.2 |
| [app/src/hooks.ts](app/src/hooks.ts) | カスタムフック `useNow`・`useWindowWidth` | 3.2・3.3・7 |
| [app/src/Clock.tsx](app/src/Clock.tsx) | 出したり消したりできる時計 | 3.2・7 |
| [app/src/SearchBox.tsx](app/src/SearchBox.tsx) | DOM を指す `useRef`、`useMemo` | 5.1・6 |
| [app/src/tasksReducer.ts](app/src/tasksReducer.ts) | タスクの reducer | 8 |
| [app/src/Board.tsx](app/src/Board.tsx) | `useReducer` を使うタスクの一覧。計算できる値は state にしない | 4・8 |

## 動かし方

```sh
$ cd ~/dev/part08/ch42-hooks/samples/app
$ npx vite        # http://localhost:5173/（Ctrl+C で止める）
$ npx tsc         # 型を確かめる（エラーは出ない）
$ npx eslint .    # Hooks の決まりを確かめる（何も出なければよい）
```
