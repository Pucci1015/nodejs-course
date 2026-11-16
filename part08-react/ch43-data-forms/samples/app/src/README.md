# samples/app/src — ch43-data-forms の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [App.tsx](App.tsx) | 第43章: 2節の PlainList と、3節からの TanStack Query の画面を並べる |
| [EditTitle.tsx](EditTitle.tsx) | 第43章 6節: 題名を変える。ほかの人が先に変えていたら（412）、知らせて読み直させる |
| [NewTaskForm.tsx](NewTaskForm.tsx) | 第43章 5節: 送る前にスキーマで確かめ、API の間違い（422・409）も項目ごとに出すフォーム |
| [PlainList.tsx](PlainList.tsx) | 第43章 2節: useEffect と fetch で、自分で読み込む。状態をユニオンで持ち、古い応答を捨てる |
| [TaskList.tsx](TaskList.tsx) | 第43章 3・4節: TanStack Query で読んだ一覧。完了の切り替え（楽観的な更新）と削除 |
| [api.ts](api.ts) | 第43章 1節: 第39章の request を TypeScript にした。失敗は ApiError（problem+json の中身を持つ）、成功はスキーマで確かめる |
| [fieldErrors.ts](fieldErrors.ts) | 第43章 5.3節: API の problem+json の errors[] を、「項目の名前 → 文」にする |
| [main.tsx](main.tsx) | 第43章 3.1節: TanStack Query の QueryClient を作り、アプリ全体に渡す |
| [queries.ts](queries.ts) | 第43章 3〜7節: TanStack Query で、読み込み・書き込み・SSE をまとめたカスタムフック |
| [schemas.ts](schemas.ts) | 第43章 1節: API が返す形のスキーマ（第38章）。5節: フォームの入力のスキーマ |
