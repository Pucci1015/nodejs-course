# app-tests（アプリにコピーして動かすテスト）

問題7のテストです。`~/dev/room-booking/web/test/` にコピーして、画面のプロジェクトの中で動かします（`./fake-api.ts` と `../src/` を import するため、このフォルダでは動きません）。

| ファイル                                                   | 中身                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [my-bookings-by-day.test.tsx](my-bookings-by-day.test.tsx) | 自分の予約を、日付ごとの見出しと一覧に分ける（4 個） |

```sh
$ cp my-bookings-by-day.test.tsx ~/dev/room-booking/web/test/
$ cd ~/dev/room-booking/web && npx vitest run test/my-bookings-by-day.test.tsx
```
