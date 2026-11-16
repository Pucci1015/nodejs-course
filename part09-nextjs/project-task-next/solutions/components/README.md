# components

ブラウザでも動く部品（Client Component）です。どれも1行目が `'use client'` です。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [DeleteButton.tsx](DeleteButton.tsx) | 「消す」（2.4節）。ダイアログで確かめてから消す。開いたら、フォーカスは「キャンセル」に置く（第45章 8節） |
| [DoneToggle.tsx](DoneToggle.tsx) | 一覧の「完了（題名）」のチェック（第49章 3.4節・練習問題7）。返事を待たずにチェックを変え、失敗したら戻して理由を出す |
| [LiveRefresh.tsx](LiveRefresh.tsx) | ほかのタブや人が変えたら、API の知らせ（SSE）を受けて、ページを作り直してもらう（第48章 練習問題8・第49章 5節） |
| [NavLinks.tsx](NavLinks.tsx) | メニュー（第48章 6.1節）。今のページのリンクに aria-current="page" を付ける |
| [StatusSelect.tsx](StatusSelect.tsx) | タスクのページの「状態」（2.4節）。変えたらすぐに送る。API が断ったら（409 など）、元に戻して理由を出す |
| [TaskForm.tsx](TaskForm.tsx) | 作る・直すフォーム（第49章 3.2節）。確かめるのはサーバ（Server Action）。結果は useActionState で受け取る |
