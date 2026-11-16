# 第40章 練習問題4 予想して確かめる（調べる問題）

本文の `tasks-app`（`~/dev/part08/ch40-build-tools/tasks-app/`）で確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。

1. `npx vite build` を2回続けて動かすと、`dist/assets/` の `.js` のファイルの名前は変わりますか。`src/stats.ts` の文を1文字変えてからもう1回 build すると、どのファイルの名前が変わりますか。
   - 予想:
   - 結果:
2. `tasks-app/.env` に `VITE_SECRET=dev-only-secret-0000` と `SECRET=dev-only-secret-1111` の2行を書き、`src/main.ts` の最後に `console.log(import.meta.env.VITE_SECRET, import.meta.env.SECRET);` を足して build します。`grep -r dev-only-secret dist` で見つかるのは、どちらですか。
   - 予想:
   - 結果:
3. `npx vite`（開発サーバ）を動かしたまま、別のターミナルでもう1回 `npx vite` を動かすと、どうなりますか。`vite.config.ts` の `strictPort: true` を消すとどうですか。
   - 予想:
   - 結果:
4. `src/main.ts` の `renderTask` の引数の型を `task: number` に変えて保存します。開発サーバの画面は動きますか。`npx tsc` は何と言いますか。
   - 予想:
   - 結果:
5. `npx vite build` の出力の `gzip:` の列は何を表していますか。本文 2節の `hello` で、`src/main.ts` から `zod` を使うのをやめて（`import { z }` の行を消し、`type Task = { id: number; title: string };` と `const tasks: Task[] = tasksJson;` にする）build すると、`index-….js` の大きさはどれくらい変わりますか。
   - 予想:
   - 結果:
6. `dist/` を作らずに（消してから）`npx vite preview` を動かすと、どうなりますか。
   - 予想:
   - 結果:
