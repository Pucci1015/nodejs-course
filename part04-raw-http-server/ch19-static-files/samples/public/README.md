# samples/public

第19章のサンプル（`static-server.mjs` など）が公開するフォルダです。ブラウザで開いたときに、種類の違うファイル（HTML・CSS・JavaScript・画像・テキスト・JSON）がどう返されるかを確かめるために置いています。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [index.html](index.html) | トップページ。CSS・JavaScript・画像を読み込む |
| [style.css](style.css)、[app.js](app.js) | ページの見た目と、小さな JavaScript |
| [hello.txt](hello.txt) | Range（7節）を試すための、86 バイトのテキスト |
| [data.json](data.json) | JSON（Content-Type を確かめる） |
| [img/](img/) | SVG の画像 |
| [docs/](docs/) | フォルダの `index.html` と、最後の `/` を確かめるページ |
| `.private-note.txt` | ドットファイル。サーバが**返さない**ことを確かめるためのもの（4節） |

この README.md 自身も、サーバからは `/README.md` で見えます。公開するフォルダには、見られて困るものを置かない、という例でもあります。
