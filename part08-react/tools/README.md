# tools — 第8部で使う道具

| ファイル | 中身 |
| --- | --- |
| [serve.ts](serve.ts) | 静的なファイルを返すだけのサーバ。`http://localhost:5173/` で、今いるフォルダのファイルを返す。第39章で、ビルドの道具を使わずに画面を開くために使う（章のフォルダで `node ../tools/serve.ts`。第40章からは Vite を使う） |
| [tsconfig.json](tsconfig.json) | `serve.ts` を `npx tsc` で確かめるための設定 |
