# web/src/domain — 予約の決まり（API のコピー）

API の `src/domain/` の `time.ts`・`booking-rules.ts`・`slots.ts` をそのままコピーしたものです（第69章 1節）。画面でも同じ決まりで枠を作り、送る前に確かめます。決まりを変えるときは、API の側を直してから、ここへコピーし直します（docs/adr/0001-stack.md）。

| ファイル・フォルダ                   | 中身                             |
| ------------------------------------ | -------------------------------- |
| [time.ts](time.ts)                   | 日本の時刻と UTC の行き来        |
| [booking-rules.ts](booking-rules.ts) | 予約の決まりの数と、時刻の確かめ |
| [slots.ts](slots.ts)                 | 1日の枠と、埋まった枠            |
