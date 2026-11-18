# app-tests（アプリにコピーして動かすテスト）

問題7のテストです。`~/dev/room-booking/test/http/` にコピーして、アプリの中で動かします（`../support/helpers.ts` を import するため、このフォルダでは動きません）。

| ファイル                                 | 中身                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| [edit-title.test.ts](edit-title.test.ts) | 予約の題名を変える `PATCH /api/bookings/:id` の仕様（6 個） |

```sh
$ cp edit-title.test.ts ~/dev/room-booking/test/http/
$ cd ~/dev/room-booking && node --test test/http/edit-title.test.ts
```
