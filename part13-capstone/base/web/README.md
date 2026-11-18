# web — 画面（React + TypeScript + Vite）

API とは別の `package.json` です。`npm run dev` で 5174 に開き、`/api` は API（9900）へ中継します。`npm run check` で tsc → ESLint → Vitest。

| ファイル・フォルダ                   | 中身                                |
| ------------------------------------ | ----------------------------------- |
| [src/](src/)                         | 画面のコード                        |
| [test/](test/)                       | Vitest + jsdom のテスト             |
| [index.html](index.html)             | HTML の入り口                       |
| [vite.config.ts](vite.config.ts)     | 開発サーバ（5174）と、`/api` の中継 |
| [package.json](package.json)         | パッケージと scripts                |
| [tsconfig.json](tsconfig.json)       | TypeScript の設定                   |
| [eslint.config.js](eslint.config.js) | ESLint の設定（react-hooks を含む） |
