# packages

第14章 練習問題5（iconv-lite）と練習問題6（tldts）で使うフォルダです。このフォルダで `npm install` します。

- `convert.mjs` … 練習問題5で完成させる CLI
- `site.mjs` … 練習問題6で完成させる関数
- `data/items-sjis.csv` … Shift_JIS（CP932）・CRLF の CSV（Windows の Excel で保存した想定）
- `data/order-utf8.csv` … Mac で作った UTF-8 の CSV。Shift_JIS にできない文字が1つある
- `data/order-utf8-ok.csv` … 上から、Shift_JIS にできない文字を取り除いたもの
