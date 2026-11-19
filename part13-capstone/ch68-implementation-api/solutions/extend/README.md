# extend（問題7の模範解答）

問題7（予約の題名を変える API）で書き換えた、アプリのファイルです。第68章を終えたときのアプリ（[../app/](../app/)）からの違いには、`// 追加（練習問題7）:`・`// 変更（練習問題7）:` の印を付けました。

| ファイル                                                           | 変えたところ                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| [src/domain/schemas.ts](src/domain/schemas.ts)                     | 題名の決まりを `Title` にまとめ、`UpdateBookingBody` を足した |
| [src/repositories/pg-bookings.ts](src/repositories/pg-bookings.ts) | `updateTitle` を足した                                        |
| [src/services/bookings.ts](src/services/bookings.ts)               | `rename` を足した                                             |
| [src/routes/bookings.ts](src/routes/bookings.ts)                   | `router.patch('/:id', …)` を足した                            |

試すときは、`~/dev/room-booking` のブランチで、4つのファイルを同じ場所のものと置き換えます（`src/` を丸ごとコピーすると、各フォルダの README.md まで上書きするので、ファイルを1つずつ）。

```sh
$ cd ~/dev/part13/ch68-implementation-api/solutions/extend
$ for f in domain/schemas.ts repositories/pg-bookings.ts services/bookings.ts routes/bookings.ts; do cp "src/$f" ~/dev/room-booking/src/$f; done
```
