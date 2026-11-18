# 第57章 練習問題のミュータント

練習問題1（`../app.ts`）と練習問題5（`../service.ts`）の、正しい実装をわざと1か所だけ壊したもの（**ミュータント**）です。[../../../tools/check-tests.ts](../../../tools/check-tests.ts) が、あなたのテストをこれらのファイルで動かし、テストが失敗する（＝間違いを見つけた）かを確かめます。ファイルの場所が1つ深いので、`import` は `../service.ts` のように書き換えてあります。

**先に読まずに**、問題文の決まりからテストを考えてください。見逃したものがあったら、`diff ../app.ts app-1.ts` のように正しい実装と比べます（`diff` は2つのファイルの違う行を出すコマンド。`import` の行の違いも出ます）。

| ファイル | 壊した所 |
| --- | --- |
| [app-1.ts](app-1.ts) | DELETE が 204 ではなく、200 と JSON を返す |
| [app-2.ts](app-2.ts) | DELETE が、無いタスクでも 204 を返す |
| [app-3.ts](app-3.ts) | PUT の status を確かめない（知らない状態でも変えてしまう） |
| [app-4.ts](app-4.ts) | 決まりに合わない（ConflictError）を 409 ではなく 400 にする |
| [app-5.ts](app-5.ts) | 一覧を { items: […] } ではなく、配列だけで返す |
| [app-6.ts](app-6.ts) | PUT で、無いタスクでも 200 を返す |
| [service-1.ts](service-1.ts) | doing の数の上限を「より多い」にした（4つ目も通す） |
| [service-2.ts](service-2.ts) | すでに doing のタスクを doing にするときも数える |
| [service-3.ts](service-3.ts) | 「今日」を UTC の日付で決める |
| [service-4.ts](service-4.ts) | 題名の前後の空白を除かない |
| [service-5.ts](service-5.ts) | 題名が 101 文字でも作れる |
| [service-6.ts](service-6.ts) | 期限が今日でも ValidationError にする |
| [service-7.ts](service-7.ts) | 無いタスクの状態を変えると、undefined ではなく例外 |
