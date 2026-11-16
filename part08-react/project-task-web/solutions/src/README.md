# src — 第8部の成果物の完成例

完成例の全体は [../README.md](../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [Layout.tsx](Layout.tsx) | どのページにも出す枠（第44章 2.2節、第45章 5節） |
| [api/](api/) | API とつながる部分 |
| [components/](components/) | いくつかのページで使う部品 |
| [filters.ts](filters.ts) | 一覧の条件と、URL の検索パラメータの行き来（第44章 4節） |
| [index.css](index.css) | アプリ全体の CSS（第45章 2・3・5節）。色は CSS 変数にまとめ、OS の設定が暗い色なら入れ替える |
| [lib/](lib/) | 画面に頼らない小さな関数 |
| [main.tsx](main.tsx) | 画面の入り口。キャッシュ・ルーター・StrictMode をつなぐ |
| [pages/](pages/) | ページの部品 |
| [routes.tsx](routes.tsx) | URL とページの対応表（第44章 2節）。テストが createMemoryRouter で使えるように、表だけを export する |
| [useFilters.ts](useFilters.ts) | 一覧の条件を URL の検索パラメータに持つ（第44章 4節） |
