# 第59章 練習用の小さなプロジェクト（samples/finished、完成形）

本文2〜6節を終えた形です。`npm run check`（型 → lint → 書き方 → テスト）がすべて通ります。

```sh
$ cd ~/dev/part11/ch59-lint-ci/samples/finished
$ npm run check
```

| ファイル                                                                                           | 本文の節 | 中身                                                                                   |
| -------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| [eslint.config.js](eslint.config.js)                                                               | 2〜5     | `eqeqeq`、node:test の例外、eslint-plugin-regexp、自作のルール、eslint-config-prettier |
| [package.json](package.json)                                                                       | 6        | `typecheck`・`lint`・`format`・`format:check`・`test`・`check`                         |
| [.prettierrc.json](.prettierrc.json)・[.prettierignore](.prettierignore)                           | 5        | Prettier の設定と、整えないもの                                                        |
| [orders.ts](orders.ts)・[orders.test.ts](orders.test.ts)・[slug.ts](slug.ts)・[messy.ts](messy.ts) | 2〜5     | 直したもの（`// 修正:`）                                                               |
| [rules/](rules/)                                                                                   | 4        | 自作のルール `no-focused-tests` と、そのテスト                                         |
| [tsconfig.json](tsconfig.json)                                                                     |          | TypeScript の設定                                                                      |
| [layers/](layers/)                                                                                 | 2.4      | `samples/layers` の ESLint の設定の完成形（`npm run check` には入らない）              |

`package.json` には `dependencies` がありません。ESLint などは、部のフォルダ（`~/dev/part11`）に入っているものを使います（npm scripts と `npx` は、上のフォルダの `node_modules/.bin` も探すため）。
