# tools — 第9部で使う道具

| ファイル | 中身 |
| --- | --- |
| [next.config.ts](next.config.ts) | 第9部の Next.js のアプリの設定のひな形（第47章 2.1節）。Cache Components を使う。`NEXT_DIST_DIR` で、ビルドの結果を置くフォルダを変えられる（テストは `.next-test`） |
| [tsconfig.next.json](tsconfig.next.json) | Next.js のアプリの `tsconfig.json` のひな形。コピーして `tsconfig.json` に名前を変えて使う |
| [servers.ts](servers.ts) | 練習問題のテストで使う道具。練習用の API と Next.js の開発サーバ（またはビルドして `next start`）を、別のポートで起動して、終わったら止める |
| [tsconfig.json](tsconfig.json) | `tools/` の道具を `npx tsc` で確かめるための設定 |
