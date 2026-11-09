# samples/public

[static-demo.mjs](../static-demo.mjs) が公開するフォルダです（第23章 6節）。

| ファイル | 内容 |
| --- | --- |
| `index.html` | `/` で返すページ |
| `style.css` | `/assets/style.css`（と `/style.css`）で返す CSS |
| `.env.example` | ドットファイルの例。`express.static` は既定では返さない（404） |
| `README.md` | このファイル。公開するフォルダの中にあるので、`/README.md` で読めてしまう。本物のアプリでは、公開するフォルダに説明のファイルを置かない |
