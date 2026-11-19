# web/src — 画面のコード

| ファイル・フォルダ               | 中身                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| [main.tsx](main.tsx)             | 入り口。キャッシュ・ルーター・StrictMode をつなぐ                 |
| [routes.tsx](routes.tsx)         | URL とページの対応表。ログインが要るページは `RequireLogin` の中  |
| [Layout.tsx](Layout.tsx)         | どのページにも出す枠（メニュー・ログインしている人・ログアウト）  |
| [queryClient.ts](queryClient.ts) | TanStack Query のキャッシュ。401 なら「ログインしていない」にする |
| [index.css](index.css)           | 全体の CSS（CSS 変数と、暗い色の設定）                            |
| [api/](api/)                     | API を呼ぶ関数・応答の形・TanStack Query のフック                 |
| [domain/](domain/)               | 第69章: API の `src/domain/` のコピー（予約の決まり・枠）         |
| [components/](components/)       | いくつかのページで使う部品                                        |
| [lib/](lib/)                     | React に頼らない部品                                              |
| [pages/](pages/)                 | ページ                                                            |
