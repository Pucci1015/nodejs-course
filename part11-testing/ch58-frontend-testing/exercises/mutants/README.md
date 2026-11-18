# 第58章 練習問題のミュータント

テストを書く問題（1・2・5・7・8）で使う、正しい実装をわざと1か所だけ壊したもの（**ミュータント**）です。確認の道具（[../../../tools/check-tests.ts](../../../tools/check-tests.ts)、問題7は [../check-e2e.ts](../check-e2e.ts)）が、あなたのテストをこれらのファイルで動かし、テストが失敗する（＝間違いを見つけた）かを確かめます。ファイルの場所が1つ深いので、`import` は `../api.ts` のように書き換えてあります。

**先に読まずに**、問題文の決まりからテストを考えてください。見逃したものがあったら、`diff ../TaskCard.tsx TaskCard-3.tsx` のように正しい実装と比べます（`diff` は2つのファイルの違う行を出すコマンド）。

| ファイル | 問題 | 壊した所 |
| --- | --- | --- |
| [TaskCard-1.tsx](TaskCard-1.tsx) | 1 | 完了のタスクにも、チェックが付かない |
| [TaskCard-2.tsx](TaskCard-2.tsx) | 1 | チェックを押すと、今の done をそのまま渡す（反対にしない） |
| [TaskCard-3.tsx](TaskCard-3.tsx) | 1 | 「消す」ボタンの名前に題名が入っていない |
| [TaskCard-4.tsx](TaskCard-4.tsx) | 1 | 完了のタスクでも「期限切れ」と出す |
| [TaskCard-5.tsx](TaskCard-5.tsx) | 1 | 期限が今日のときも「期限切れ」と出す |
| [TaskCard-6.tsx](TaskCard-6.tsx) | 1 | 期限が無いとき「期限なし」と出さない |
| [TaskCard-7.tsx](TaskCard-7.tsx) | 1 | 「消す」を押すと、onDelete に id ではなく 0 を渡す |
| [EditTitleForm-1.tsx](EditTitleForm-1.tsx) | 2 | 前後の空白を除かずに onSave に渡す |
| [EditTitleForm-2.tsx](EditTitleForm-2.tsx) | 2 | 空のときも onSave を呼ぶ |
| [EditTitleForm-3.tsx](EditTitleForm-3.tsx) | 2 | 変わっていなくても onSave を呼ぶ |
| [EditTitleForm-4.tsx](EditTitleForm-4.tsx) | 2 | 保存している間も「保存」を押せる |
| [EditTitleForm-5.tsx](EditTitleForm-5.tsx) | 2 | 保存に失敗しても、理由を出さない |
| [EditTitleForm-6.tsx](EditTitleForm-6.tsx) | 2 | Escape を押しても onCancel を呼ばない |
| [EditTitleForm-7.tsx](EditTitleForm-7.tsx) | 2 | エラーの理由を role="alert" で出さない |
| [TaskListPanel-1.tsx](TaskListPanel-1.tsx) | 5 | 完了を切り替えた後、一覧を読み直さない |
| [TaskListPanel-2.tsx](TaskListPanel-2.tsx) | 5 | チェックを付けると、done を反対にして送る |
| [TaskListPanel-3.tsx](TaskListPanel-3.tsx) | 5 | 消した後、一覧を読み直さない |
| [TaskListPanel-4.tsx](TaskListPanel-4.tsx) | 5 | 一覧が空のとき「タスクはまだありません」と出さない |
| [TaskListPanel-5.tsx](TaskListPanel-5.tsx) | 5 | 完了の切り替え・消すのに失敗しても、理由を出さない |
| [TaskListPanel-6.tsx](TaskListPanel-6.tsx) | 5 | 足すのに失敗しても（422 など）、フォームに理由が届かない |
| [api-1.ts](api-1.ts) | 7 | PATCH に、それらしい応答を返すが、保存しない |
| [api-2.ts](api-2.ts) | 7 | DELETE に 204 を返すが、消さない |
| [api-3.ts](api-3.ts) | 7 | PATCH で、いつも done を true にする（完了を外せない） |
| [useAutoSave-1.ts](useAutoSave-1.ts) | 8 | 最初の値も、delayMs たったら保存する |
| [useAutoSave-2.ts](useAutoSave-2.ts) | 8 | 前のタイマーを止めない（変わるたびに保存する） |
| [useAutoSave-3.ts](useAutoSave-3.ts) | 8 | delayMs の半分の時間で保存する |
| [useAutoSave-4.ts](useAutoSave-4.ts) | 8 | アンマウントしても、待っている保存をしない |
| [useAutoSave-5.ts](useAutoSave-5.ts) | 8 | 保存が終わっても saved にならない |
| [useAutoSave-6.ts](useAutoSave-6.ts) | 8 | 保存に失敗しても error にならず、saved になる |
| [useAutoSave-7.ts](useAutoSave-7.ts) | 8 | 待っている間も pending ではなく、前の状態を返す |

問題7のミュータント（`api-*.ts`）は、本文の `../../samples/app/api-server.ts` の API の前に、壊れた道を1つ足したものです。
