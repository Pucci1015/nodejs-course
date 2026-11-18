# 第56章 練習問題のミュータント

練習問題1・3・5・6・8 で使う、正しい実装（`../○○.ts`）をわざと1か所だけ壊したもの（**ミュータント**）です。[../../../tools/check-tests.ts](../../../tools/check-tests.ts) が、あなたのテストをこれらのファイルで動かし、テストが失敗する（＝間違いを見つけた）かを確かめます。

**先に読まずに**、問題文の決まりからテストを考えてください。見逃したミュータントがあったときに、そのファイルを開いて、正しい実装と比べます（`diff ../slug.ts slug-2.ts` と打つと、2つのファイルの違う行だけが出ます。`diff` は、2つのファイルを比べるコマンドです）。

| ファイル | 壊した所 |
| --- | --- |
| [debounce-1.ts](debounce-1.ts) | 呼ばれても待ち直さない（最初の呼び出しから ms 後に動く） |
| [debounce-2.ts](debounce-2.ts) | 最初の引数で呼ぶ |
| [debounce-3.ts](debounce-3.ts) | 待ち時間が ms より 1ms 短い |
| [debounce-4.ts](debounce-4.ts) | cancel が、待っている呼び出しを取り消さない |
| [debounce-5.ts](debounce-5.ts) | flush が何もしない |
| [debounce-6.ts](debounce-6.ts) | flush した後も、時間がたつともう一度呼ぶ |
| [digest-1.ts](digest-1.ts) | 数が 0 の人にも送る |
| [digest-2.ts](digest-2.ts) | 終わったタスクも数える |
| [digest-3.ts](digest-3.ts) | 1人に送れなかったら、そこで止める（例外が外に出る） |
| [digest-4.ts](digest-4.ts) | 期限まで 2 日以内だけを数える |
| [digest-5.ts](digest-5.ts) | 過ぎているタスクを数えない |
| [digest-6.ts](digest-6.ts) | 送れなかった人の id ではなく、送れた人の id を返す |
| [digest-7.ts](digest-7.ts) | タスクごとに1通ずつ送る |
| [limiter-1.ts](limiter-1.ts) | limit + 1 回まで許す |
| [limiter-2.ts](limiter-2.ts) | 窓が変わっても数え直さない |
| [limiter-3.ts](limiter-3.ts) | キーを区別しない（みんなで数える） |
| [limiter-4.ts](limiter-4.ts) | remaining が減らない |
| [limiter-5.ts](limiter-5.ts) | retryAfterMs を、いつも窓の長さにする |
| [limiter-6.ts](limiter-6.ts) | 窓の境目を 1ms 遅く数える（境目ちょうどは、まだ前の窓） |
| [password-rules-1.ts](password-rules-1.ts) | 短すぎるのを「12 文字以下」にした |
| [password-rules-2.ts](password-rules-2.ts) | 長すぎるのを「64 文字以上」にした |
| [password-rules-3.ts](password-rules-3.ts) | 文字の数ではなく、length（UTF-16 の数）で数える |
| [password-rules-4.ts](password-rules-4.ts) | メールアドレスを、大文字・小文字を区別して探す |
| [password-rules-5.ts](password-rules-5.ts) | よく使われるものを、大文字・小文字を区別して探す |
| [password-rules-6.ts](password-rules-6.ts) | @ より前が 3 文字のときは探さない |
| [slug-1.ts](slug-1.ts) | 小文字にしない |
| [slug-2.ts](slug-2.ts) | _ を - にしない |
| [slug-3.ts](slug-3.ts) | 続いた - を1つにしない |
| [slug-4.ts](slug-4.ts) | 最初と最後の - を残す |
| [slug-5.ts](slug-5.ts) | 長さを切らない |
| [slug-6.ts](slug-6.ts) | 使える文字が無いとき、null ではなく空の文字列を返す |
| [slug-7.ts](slug-7.ts) | 全角の英数字を半角にしない |
