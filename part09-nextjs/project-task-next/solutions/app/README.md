# app

| ファイル・フォルダ | 中身 |
| --- | --- |
| [api/](api/) | `/api` の入り口（Route Handler） |
| [tasks/](tasks/) | `/tasks` のページ |
| [error.tsx](error.tsx) | ページを作る途中の失敗（API につながらない など）を受け止める（第47章 6.2節） |
| [globals.css](globals.css) | 全体の CSS |
| [layout.tsx](layout.tsx) | どのページにも出す枠（2.5節）。「本文へ」・メニュー・`<main>`・SSE で作り直す部品 |
| [not-found.tsx](not-found.tsx) | 無いページ・無いタスク（2.4節） |
| [page.tsx](page.tsx) | 一覧（2.2節）。条件は URL にあり、サーバで API から読んで並べる |
