# samples/app/src — ch44-routing-state の「手を動かす」の完成形

動かし方は [../../README.md](../../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [Layout.tsx](Layout.tsx) | 第44章 2.2節: どのページにも出す枠。ページの中身は <Outlet /> の場所に入る |
| [api.ts](api.ts) | 第43章の api.ts に、1つ読む getTask と、並べ方を選べる listTasks を足したもの |
| [filters.ts](filters.ts) | 第44章 4節: 一覧の条件（絞り込み・並べ方・検索の文字）と、URL の検索パラメータの行き来 |
| [main.tsx](main.tsx) | 第44章 2.1節: QueryClient（第43章）・表示の設定（7節）・ルーター（2節）で包む |
| [pages/](pages/) | ページの部品 |
| [queries.ts](queries.ts) | 第43章の queries.ts の読む部分。一覧のキーに、並べ方も入れた。1つ読む useTask を足した |
| [router.tsx](router.tsx) | 第44章 2節: URL とページの対応表 |
| [schemas.ts](schemas.ts) | 第43章の schemas.ts と同じ |
| [settings.tsx](settings.tsx) | 第44章 7節: Context で、アプリのどこからでも使う「表示の設定」を配る |
| [useFilters.ts](useFilters.ts) | 第44章 4節: 一覧の条件を、state ではなく URL の検索パラメータに持つカスタムフック |
