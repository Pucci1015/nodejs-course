# src/components — 第10部の成果物の完成例（画面）

第8部の画面に、ログインのページを足したものです（第10部で足したものは、表の「第10部」の行）。完成例の全体は [../../README.md](../../README.md) にあります。

| ファイル・フォルダ                         | 中身                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [Announcer.tsx](Announcer.tsx)             | 画面の変化をスクリーンリーダーに知らせる（第45章 練習問題5と同じもの）                                                     |
| [ConfirmDialog.tsx](ConfirmDialog.tsx)     | 確かめのダイアログ（第45章 練習問題6と同じもの）                                                                           |
| [Field.tsx](Field.tsx)                     | 第10部: ラベル・入力・説明・間違いの文の組（`aria-describedby`・`aria-invalid`・`autoComplete`）                           |
| [FilterBar.tsx](FilterBar.tsx)             | 一覧の条件。値は URL に持つので、ここは「見せて、変えたら知らせる」だけ（第44章 4節）                                      |
| [PageTitle.tsx](PageTitle.tsx)             | ページの見出し（h1）。ほかのページから移ってきたら、ここにフォーカスを移す（第45章 7節「画面の変化を知らせる」と同じ考え） |
| [RequireLogin.tsx](RequireLogin.tsx)       | 第10部: ログインが要るページの枠。ログインしていなければ `/login?next=…` へ。ログインしているときだけ SSE につなぐ         |
| [TaskForm.tsx](TaskForm.tsx)               | 作る・直すの両方で使うフォーム（第43章 5節、第45章 6節）                                                                   |
| [TaskItem.module.css](TaskItem.module.css) | 一覧の1行（第45章 2.2節の CSS Modules）                                                                                    |
| [TaskItem.tsx](TaskItem.tsx)               | 一覧の1行。完了のチェック・題名（詳しい画面へのリンク）・状態・締め切り                                                    |
