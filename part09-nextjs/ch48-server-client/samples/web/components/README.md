# samples/web/components

| ファイル・フォルダ | 中身 |
| --- | --- |
| [Collapsible.tsx](Collapsible.tsx) | 第48章 3.2節: 開け閉めはブラウザで。中身（children）は、サーバで作ったものをそのまま受け取る |
| [Counter.tsx](Counter.tsx) | 第48章 2節: ブラウザでも動く部品（Client Component）。state とイベントは、こちらでだけ使える |
| [NavLinks.tsx](NavLinks.tsx) | 第48章 6節: 今の URL（usePathname）はブラウザで分かるので、メニューを Client Component にする |
| [RefreshButton.tsx](RefreshButton.tsx) | 第48章 6.3節: 今のページの Server Component を、サーバでもう一度作り直してもらう |
| [SearchBox.tsx](SearchBox.tsx) | 第48章 6節: 検索の欄。打った文字を URL の ?q= に入れると、サーバのページが作り直される |
| [TaskCount.tsx](TaskCount.tsx) | 第48章 5.3節: サーバから Promise を受け取り、use で待つ。待っている間は、外の `<Suspense>` の fallback が出る |
